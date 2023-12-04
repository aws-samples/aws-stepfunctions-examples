##############################################################
#
# IAM ROLE
#
#######################################ßßß####################
resource "aws_iam_role" "lambdarole" {
  name  = "${var.prefix}-${var.name}-lambda-role"
  tags  = merge(var.tags, {Name = "${var.prefix}-${var.name}-lambda-role"}) 

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "lambdapolicy" {
  name = "${var.prefix}-${var.name}-lambda-policy"
  role = aws_iam_role.lambdarole.id

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
        "arn:aws:s3:::${var.sourcebucket}*",
        "arn:aws:s3:::${var.destinationbucket}*"
      ]
    }
  ]
}
EOF
}

##############################################################
#
# LAMBDA FUNCTIONS
#
#######################################ßßß####################
resource "aws_lambda_function" "main" {
  filename      = var.filename
  function_name = "${var.prefix}-${var.name}"
  handler       = "${var.name}.lambda_handler"
  role          = aws_iam_role.lambdarole.arn
  memory_size   = var.memory
  timeout       = var.timeout
  
  source_code_hash = var.filehash
  runtime = var.runtime
  environment {
    variables = {
      REGION = var.region,
      RECORDCOUNT = var.recordcount,
      FEDRATE = var.fedrate,
      SOURCEBUCKET = var.sourcebucket
    }
  }
  layers = var.layers

  tags  = merge(var.tags, {Name = "${var.prefix}-${var.name}"})
}

##############################################################
#
# OUTPUTS
#
##############################################################
output "arn" {
  value = aws_lambda_function.main.arn
}
output "name" {
  value = aws_lambda_function.main.function_name
}