##############################################################
#
# VARIABLES
#
##############################################################
variable "prefix" {
  type    = string
  default = "sfn-lambda"
}

variable "taskcount" {
  type    = number
  default = 1000
}

variable "recordcount" {
  type    = number
  default = 500000
}

variable "fedrate" {
  type    = number
  default = 8
}

variable "tags" {
  type    = map(string)
  default = {
    Project = "sfn-lambda"
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

module "s3" {
  providers     = { aws = aws.main }
  source        = "../shared/modules/s3"
  prefix        = var.prefix
  region        = data.aws_region.current.name
  force_destroy = true
  tags          = var.tags
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

#---step functions--------------------------------------------
module "stepfunctions" {
  providers = { aws = aws.main }
  source    = "../shared/modules/stepfunctions"
  prefix    = var.prefix
  region    = data.aws_region.current.name
  tags      = var.tags

  compute           = "lambda"
  datagenarn        = module.lambda_datagen.arn
  dataseedarn       = module.lambda_dataseed.arn
  inventoryarn      = module.lambda_inventory.arn
  manifestarn       = module.lambda_manifest.arn
  processlambda     = module.lambda_process.arn
  partitionlambda   = module.lambda_partition.arn
  sourcebucket      = module.s3.sourceid
  sourceprefix      = "data"
  destinationbucket = module.s3.destinationid
  destinationprefix = "results/data"
}