##############################################################
#
# VARIABLES
#
##############################################################
variable "prefix" {
  type    = string
  default = "sfn-ec2-spot"
}

variable "cidr" {
  type    = string
  default = "10.10.0.0/16"
}

variable "recordcount" {
  type    = number
  default = 500000
}

variable "taskcount" {
  type    = number
  default = 1000
}

variable "fedrate" {
  type    = number
  default = 8
}

variable "tags" {
  type    = map(string)
  default = {
    Project = "sfn-ec2-spot"
  }
}

##############################################################
#
# BASE MODULES
#
##############################################################
data "aws_region" "current" {
  provider  = aws.main
}

module "vpc" {
  providers = { aws = aws.main }
  source    = "../shared/modules/vpc"
  region    = data.aws_region.current.name
  prefix    = var.prefix
  cidr      = var.cidr
  tags      = var.tags
}

module "groups" {
  providers = { aws = aws.main }
  source    = "../shared/modules/groups"
  prefix    = var.prefix
  region    = data.aws_region.current.name
  tags      = var.tags
  vpcid     = module.vpc.id
}

module "s3" {
  providers     = { aws = aws.main }
  source        = "../shared/modules/s3"
  prefix        = var.prefix
  region        = data.aws_region.current.name
  force_destroy = true
  tags          = var.tags
}

module "ecscp" {
  providers       = { aws = aws.main }
  source          = "../shared/modules/ecsasg"
  prefix          = var.prefix
  region          = data.aws_region.current.name
  tags            = var.tags
  privatesubnets  = module.vpc.privatesubnetids
  ecssg           = module.groups.ecsinstanceid
  ecscluster      = module.ecs.clustername
  asgmax          = 150
}

module "ecs" {
  providers = { aws = aws.main }
  source    = "../shared/modules/ecs"
  prefix    = var.prefix
  region    = data.aws_region.current.name
  ecscp     = module.ecscp.name
  tags      = var.tags
}

#---data generation lambdas-----------------------------------
data "archive_file" "dataseed" {
  type        = "zip"
  source_file = "../shared/lambda/dataseed.py"
  output_path = "../shared/lambda/dataseed.py.zip"
}

module "lambda_dataseed" {
  source  = "../shared/modules/lambda"
  prefix  = var.prefix
  tags    = var.tags
  name    = "dataseed"

  filehash          = data.archive_file.dataseed.output_base64sha256
  filename          = "${abspath(path.root)}/../shared/lambda/dataseed.py.zip"
  memory            = 256
  timeout           = 900
  recordcount       = var.recordcount
  sourcebucket      = module.s3.sourceid
  destinationbucket = module.s3.destinationid
}

data "archive_file" "datagen" {
  type        = "zip"
  source_file = "../shared/lambda/datagen.py"
  output_path = "../shared/lambda/datagen.py.zip"
}

module "lambda_datagen" {
  source  = "../shared/modules/lambda"
  prefix  = var.prefix
  tags    = var.tags
  name    = "datagen"

  filehash          = data.archive_file.datagen.output_base64sha256
  filename          = "${abspath(path.root)}/../shared/lambda/datagen.py.zip"
  memory            = 128
  timeout           = 120
  recordcount       = var.recordcount
  sourcebucket      = module.s3.sourceid
  destinationbucket = module.s3.destinationid
}

data "archive_file" "inventory" {
  type        = "zip"
  source_file = "../shared/lambda/inventory.py"
  output_path = "../shared/lambda/inventory.py.zip"
}

module "lambda_inventory" {
  source  = "../shared/modules/lambda"
  prefix  = var.prefix
  tags    = var.tags
  name    = "inventory"

  filehash          = data.archive_file.inventory.output_base64sha256
  filename          = "${abspath(path.root)}/../shared/lambda/inventory.py.zip"
  memory            = 2048
  timeout           = 120
  recordcount       = var.recordcount
  sourcebucket      = module.s3.sourceid
  destinationbucket = module.s3.destinationid
}

data "archive_file" "manifest" {
  type        = "zip"
  source_file = "../shared/lambda/manifest.py"
  output_path = "../shared/lambda/manifest.py.zip"
}

module "lambda_manifest" {
  source  = "../shared/modules/lambda"
  prefix  = var.prefix
  tags    = var.tags
  name    = "manifest"

  filehash          = data.archive_file.manifest.output_base64sha256
  filename          = "${abspath(path.root)}/../shared/lambda/manifest.py.zip"
  memory            = 2048
  timeout           = 120
  recordcount       = var.recordcount
  sourcebucket      = module.s3.sourceid
  destinationbucket = module.s3.destinationid
}

data "archive_file" "partition" {
  type        = "zip"
  source_file = "../shared/lambda/partition.py"
  output_path = "../shared/lambda/partition.py.zip"
}

module "lambda_partition" {
  source  = "../shared/modules/lambda"
  prefix  = var.prefix
  tags    = var.tags
  name    = "partition"

  layers            = ["arn:aws:lambda:${data.aws_region.current.name}:336392948345:layer:AWSSDKPandas-Python310:5"]
  filehash          = data.archive_file.partition.output_base64sha256
  filename          = "${abspath(path.root)}/../shared/lambda/partition.py.zip"
  memory            = 2048
  timeout           = 120
  recordcount       = var.recordcount
  sourcebucket      = module.s3.sourceid
  destinationbucket = module.s3.destinationid
}

#---data process lambda---------------------------------------
data "archive_file" "process" {
  type        = "zip"
  source_file = "./lambda/process.py"
  output_path = "./lambda/process.py.zip"
}

module "lambda_process" {
  source  = "../shared/modules/lambda"
  prefix  = var.prefix
  tags    = var.tags
  name    = "process"

  layers            = ["arn:aws:lambda:${data.aws_region.current.name}:336392948345:layer:AWSSDKPandas-Python310:5"]
  filehash          = data.archive_file.process.output_base64sha256
  filename          = "${abspath(path.root)}/lambda/process.py.zip"
  memory            = 2048
  timeout           = 120
  fedrate           = var.fedrate
  recordcount       = var.recordcount
  sourcebucket      = module.s3.sourceid
  destinationbucket = module.s3.destinationid
}

# invoke the process lambda to generate the script used by our container
resource "aws_lambda_invocation" "script" {
  function_name = module.lambda_process.name

  input = jsonencode({})
}

#---step functions--------------------------------------------
module "stepfunctions" {
  providers = { aws = aws.main }
  source    = "../shared/modules/stepfunctions"
  prefix    = var.prefix
  region    = data.aws_region.current.name
  tags      = var.tags

  compute           = "ecs"
  datagenarn        = module.lambda_datagen.arn
  dataseedarn       = module.lambda_dataseed.arn
  inventoryarn      = module.lambda_inventory.arn
  manifestarn       = module.lambda_manifest.arn
  processlambda     = module.lambda_process.arn
  partitionlambda   = module.lambda_partition.arn
  ecscluster        = module.ecs.clustername
  ecsservice        = aws_ecs_service.sfndefault.name
  ecsservicearn     = aws_ecs_service.sfndefault.id
  ecstaskcount      = var.taskcount
  sourcebucket      = module.s3.sourceid
  sourceprefix      = "data"
  destinationbucket = module.s3.destinationid
  destinationprefix = "results/data"
}

#--------IAM ROLES--------------------------------------------
resource "aws_iam_role" "sfnrole" {
  provider  = aws.main
  name      = "${var.prefix}-sfn-role"
  tags      = merge(var.tags, {Name = "${var.prefix}-sfn-role"}) 

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "sfnpolicy" {
  provider  = aws.main
  name      = "${var.prefix}-sfn-policy"
  role      = aws_iam_role.sfnrole.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Effect": "Allow",
      "Resource": "*"
    },
    {
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::${module.s3.sourceid}*",
        "arn:aws:s3:::${module.s3.destinationid}*"
      ]
    },
    {
      "Action": [
        "states:DescribeActivity",
        "states:DeleteActivity",
        "states:GetActivityTask",
        "states:SendTaskHeartbeat",
        "states:SendTaskSuccess",
        "states:SendTaskFailure"
      ],
      "Effect": "Allow",
      "Resource": [
        "${module.stepfunctions.activityarn}"
      ]
    }
  ]
}
EOF
}

resource "aws_iam_role" "sfnexecrole" {
  provider            = aws.main
  name                = "${var.prefix}-sfn-exec-role"
  tags                = merge(var.tags, {Name = "${var.prefix}-sfn-exec-role"})
  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"]

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "sfn-exec-policy" {
  provider  = aws.main
  name      = "${var.prefix}-sfn-exec-policy"
  role      = aws_iam_role.sfnexecrole.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}

#--------ECS SERVICE LOG GROUPS-------------------------------
resource "aws_cloudwatch_log_group" "sfndefault" {
  provider  = aws.main
  name      = "${var.prefix}-sfn-default"

  tags = merge(var.tags, {Name = "${var.prefix}-sfn-default"})
}

#--------ECS SERVICE------------------------------------------
resource "aws_ecs_service" "sfndefault" {
  provider              = aws.main
  name                  = "${var.prefix}-sfn-default"
  cluster               = module.ecs.clusterid
  desired_count         = 0
  task_definition       = aws_ecs_task_definition.sfndefault.arn
  scheduling_strategy   = "REPLICA"

  network_configuration {
    subnets = module.vpc.privatesubnetids
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  capacity_provider_strategy {
    base = 1
    capacity_provider = "${module.ecscp.name}"
    weight = 100
  }

  tags  = merge(var.tags, {Name = "${var.prefix}-sfn-default"})
}

resource "aws_ecs_task_definition" "sfndefault" {
  provider                  = aws.main
  family                    = "${var.prefix}-sfn-default"
  execution_role_arn        = aws_iam_role.sfnexecrole.arn
  task_role_arn             = aws_iam_role.sfnrole.arn
  network_mode              = "awsvpc"
  requires_compatibilities  = ["EC2"]
  cpu                       = 256
  memory                    = 512
  container_definitions = jsonencode([
    {
      name                = "${var.prefix}-sfn-docker"
      image               = "public.ecr.aws/amazonlinux/amazonlinux:2023"
      cpu                 = 256
      command             = [
        "/bin/sh",
        "-c",
        "yum -y update && yum -y install awscli python3-pip && aws s3 cp s3://${module.s3.sourceid}/script/process.py . && python3 -m pip install boto3 && python3 -m pip install pandas && python3 process.py"
      ]
      memory              = 512
      essential           = true
      environment         = [
        {
          name = "REGION"
          value = data.aws_region.current.name
        },
        {
          name = "ACTIVITY_ARN"
          value = module.stepfunctions.activityarn
        },
        {
          name = "SOURCEBUCKET"
          value = module.s3.sourceid
        },
        {
          name = "RECORDCOUNT"
          value = tostring(var.recordcount)
        },
        {
          name = "FEDRATE"
          value = tostring(var.fedrate)
        }
      ]
      logConfiguration    = {
        logDriver = "awslogs"
        options = {
          awslogs-group = aws_cloudwatch_log_group.sfndefault.name
          awslogs-region = data.aws_region.current.name
          awslogs-stream-prefix = "${var.prefix}-sfn-default"
        }
      }
    }
  ])
}