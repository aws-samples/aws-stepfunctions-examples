##############################################################
#
# IAM ROLE FOR SFN
#
#######################################ßßß####################
resource "aws_iam_role" "statemachinerole" {
  name  = "${var.prefix}-sfn-sm-role"
  tags  = merge(var.tags, {Name = "${var.prefix}-sfn-sm-role"}) 

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "states.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "ecsstatemachinepolicy" {
  count = var.compute == "ecs" ? 1 : 0
  name  = "${var.prefix}-sfn-sm-policy"
  role  = aws_iam_role.statemachinerole.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "states:StartExecution",
        "states:DescribeExecution",
        "states:StopExecution"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:GetService"
      ],
      "Resource": "${var.ecsservicearn}"
    },
    {
      "Effect": "Allow",
      "Action": [
        "events:PutTargets",
        "events:PutRule",
        "events:DescribeRule"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogDelivery",
        "logs:GetLogDelivery",
        "logs:UpdateLogDelivery",
        "logs:DeleteLogDelivery",
        "logs:ListLogDeliveries",
        "logs:PutResourcePolicy",
        "logs:DescribeResourcePolicies",
        "logs:DescribeLogGroups"
      ],
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
    },
    {
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Effect": "Allow",
      "Resource": [
        "${var.datagenarn}*",
        "${var.inventoryarn}*",
        "${var.manifestarn}*",
        "${var.dataseedarn}*",
        "${var.partitionlambda}*"
      ]
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "lambdastatemachinepolicy" {
  count = var.compute == "lambda" ? 1 : 0
  name  = "${var.prefix}-sfn-sm-policy"
  role  = aws_iam_role.statemachinerole.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "states:StartExecution",
        "states:DescribeExecution",
        "states:StopExecution"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "events:PutTargets",
        "events:PutRule",
        "events:DescribeRule"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogDelivery",
        "logs:GetLogDelivery",
        "logs:UpdateLogDelivery",
        "logs:DeleteLogDelivery",
        "logs:ListLogDeliveries",
        "logs:PutResourcePolicy",
        "logs:DescribeResourcePolicies",
        "logs:DescribeLogGroups"
      ],
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
    },
    {
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Effect": "Allow",
      "Resource": [
        "${var.dataseedarn}*",
        "${var.datagenarn}*",
        "${var.inventoryarn}*",
        "${var.manifestarn}*",
        "${var.processlambda}*",
        "${var.partitionlambda}*"
      ]
    }
  ]
}
EOF
}

##############################################################
#
# SFN ACTIVITY
#
#######################################ßßß####################
resource "aws_sfn_activity" "sfnecsactivity" {
  count = var.compute == "ecs" ? 1 : 0
  name  = "${var.prefix}-activity"

  tags  = merge(var.tags, {Name = "${var.prefix}-activity"})
}

##############################################################
#
# DATA GENERATION STATE MACHINE
#
#######################################ßßß####################
resource "aws_sfn_state_machine" "sfnecsdatageneration" {
  name     = "${var.prefix}-data-generation"
  role_arn = aws_iam_role.statemachinerole.arn

  tags  = merge(var.tags, {Name = "${var.prefix}-data-generation"})

  definition = <<EOF
{
  "Comment": "Data Generation State Machine",
  "StartAt": "Seed File Generation",
  "States": {
    "Seed File Generation": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "OutputPath": "$.Payload",
      "Parameters": {
        "Payload": {
          "bucket": "${var.sourcebucket}"
        },
        "FunctionName": "${var.dataseedarn}"
      },
      "Retry": [{
        "ErrorEquals": [
          "Lambda.ServiceException",
          "Lambda.AWSLambdaException",
          "Lambda.SdkClientException",
          "Lambda.TooManyRequestsException"
        ],
        "IntervalSeconds": 2,
        "MaxAttempts": 6,
        "BackoffRate": 2
      }],
      "Next": "File Generation DMap"
    },
    "File Generation DMap": {
      "Type": "Map",
      "ItemProcessor": {
        "ProcessorConfig": {
          "Mode": "DISTRIBUTED",
          "ExecutionType": "STANDARD"
        },
        "StartAt": "File Generation",
        "States": {
          "File Generation": {
            "Type": "Task",
            "Resource": "arn:aws:states:::lambda:invoke",
            "OutputPath": "$.Payload",
            "Parameters": {
              "Payload.$": "$",
              "FunctionName": "${var.datagenarn}:$LATEST"
            },
            "Retry": [
              {
                "ErrorEquals": [
                  "Lambda.ServiceException",
                  "Lambda.AWSLambdaException",
                  "Lambda.SdkClientException",
                  "Lambda.TooManyRequestsException"
                ],
                "IntervalSeconds": 2,
                "MaxAttempts": 6,
                "BackoffRate": 2
              }
            ],
            "End": true
          }
        }
      },
      "ItemReader": {
        "Resource": "arn:aws:states:::s3:getObject",
        "ReaderConfig": {
          "InputType": "CSV",
          "CSVHeaderLocation": "FIRST_ROW"
        },
        "Parameters": {
          "Bucket": "${var.sourcebucket}",
          "Key": "inventory/numbers.csv"
        }
      },
      "MaxConcurrency": 100,
      "Label": "FileGenerationDMap",
      "ItemBatcher": {
        "MaxItemsPerBatch": 1000,
        "BatchInput": {
          "bucket": "${var.sourcebucket}"
        }
      },
      "ResultWriter": {
        "Resource": "arn:aws:states:::s3:putObject",
        "Parameters": {
          "Bucket": "${var.destinationbucket}",
          "Prefix": "${var.prefix}-datagen-results"
        }
      },
      "Next": "Inventory Generation DMap"
    },
    "Inventory Generation DMap": {
      "Type": "Map",
      "ItemProcessor": {
        "ProcessorConfig": {
          "Mode": "DISTRIBUTED",
          "ExecutionType": "STANDARD"
        },
        "StartAt": "Inventory Generation",
        "States": {
          "Inventory Generation": {
            "Type": "Task",
            "Resource": "arn:aws:states:::lambda:invoke",
            "OutputPath": "$.Payload",
            "Parameters": {
              "Payload.$": "$",
              "FunctionName": "${var.inventoryarn}:$LATEST"
            },
            "Retry": [
              {
                "ErrorEquals": [
                  "Lambda.ServiceException",
                  "Lambda.AWSLambdaException",
                  "Lambda.SdkClientException",
                  "Lambda.TooManyRequestsException"
                ],
                "IntervalSeconds": 2,
                "MaxAttempts": 6,
                "BackoffRate": 2
              }
            ],
            "End": true
          }
        }
      },
      "ItemReader": {
        "Resource": "arn:aws:states:::s3:listObjectsV2",
        "Parameters": {
          "Bucket": "${var.sourcebucket}",
          "Prefix": "temp/data-batch-"
        }
      },
      "MaxConcurrency": 100,
      "Label": "InventoryGenerationDMap",
      "ItemBatcher": {
        "MaxItemsPerBatch": 10000,
        "BatchInput": {
          "bucket": "${var.sourcebucket}"
        }
      },
      "ResultWriter": {
        "Resource": "arn:aws:states:::s3:putObject",
        "Parameters": {
          "Bucket": "${var.destinationbucket}",
          "Prefix": "${var.prefix}-inventory-results"
        }
      },
      "Next": "Manifest Generation DMap"
    },
    "Manifest Generation DMap": {
      "Type": "Map",
      "ItemProcessor": {
        "ProcessorConfig": {
          "Mode": "DISTRIBUTED",
          "ExecutionType": "STANDARD"
        },
        "StartAt": "Manifest Generation",
        "States": {
          "Manifest Generation": {
            "Type": "Task",
            "Resource": "arn:aws:states:::lambda:invoke",
            "OutputPath": "$.Payload",
            "Parameters": {
              "Payload.$": "$",
              "FunctionName": "${var.manifestarn}:$LATEST"
            },
            "Retry": [
              {
                "ErrorEquals": [
                  "Lambda.ServiceException",
                  "Lambda.AWSLambdaException",
                  "Lambda.SdkClientException",
                  "Lambda.TooManyRequestsException"
                ],
                "IntervalSeconds": 2,
                "MaxAttempts": 6,
                "BackoffRate": 2
              }
            ],
            "End": true
          }
        }
      },
      "ItemReader": {
        "Resource": "arn:aws:states:::s3:listObjectsV2",
        "Parameters": {
          "Bucket": "${var.sourcebucket}",
          "Prefix": "inventory/data-gen-"
        }
      },
      "MaxConcurrency": 1,
      "Label": "ManifestGenerationDMap",
      "ItemBatcher": {
        "MaxItemsPerBatch": 1000,
        "BatchInput": {
          "bucket": "${var.sourcebucket}"
        }
      },
      "ResultWriter": {
        "Resource": "arn:aws:states:::s3:putObject",
        "Parameters": {
          "Bucket": "${var.destinationbucket}",
          "Prefix": "${var.prefix}-manifest-results"
        }
      },
      "End": true
    }
  }
}
EOF
}

##############################################################
#
# PROCESSING STATE MACHINE
#
#######################################ßßß####################
resource "aws_sfn_state_machine" "sfnlambdastatemachine" {
  count     = var.compute == "lambda" ? 1 : 0
  name      = "${var.prefix}-state-machine"
  role_arn  = aws_iam_role.statemachinerole.arn

  tags  = merge(var.tags, {Name = "${var.prefix}-state-machine"})

  definition  = <<EOF
{
  "Comment": "A description of my state machine",
  "StartAt": "Set Example Runtime Properties",
  "States": {
    "Set Example Runtime Properties": {
      "Type": "Pass",
      "Next": "S3 Inventory Partition Step",
      "Result": {
        "inventory": {
          "bucket": "${var.sourcebucket}",
          "key": "${var.inventorypath}",
          "output_prefix": "${var.inventoryoutput}"
        },
        "workshop_variables": {
          "output_bucket": "${var.destinationbucket}",
          "output_prefix": "${var.outputpath}",
          "batch_output_files": "${var.batchoutput}",
          "input_sampling": ${var.sampling},
          "output_rows_per_file": ${var.dmapbatchsize}
        }
      }
    },
    "S3 Inventory Partition Step": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "${var.partitionlambda}:$LATEST",
        "Payload.$": "$"
      },
      "Retry": [
        {
          "ErrorEquals": [
            "Lambda.ServiceException",
            "Lambda.AWSLambdaException",
            "Lambda.SdkClientException",
            "Lambda.TooManyRequestsException"
          ],
          "IntervalSeconds": 2,
          "MaxAttempts": 6,
          "BackoffRate": 2
        }
      ],
      "Next": "Inline Map Orchestration",
      "ResultPath": "$.stepresult",
      "ResultSelector": {
        "body.$": "$.Payload.body"
      }
    },
    "Inline Map Orchestration": {
      "Type": "Map",
      "ItemProcessor": {
        "ProcessorConfig": {
          "Mode": "INLINE"
        },
        "StartAt": "Distributed Map Data Processing",
        "States": {
          "Distributed Map Data Processing": {
            "Type": "Map",
            "ItemProcessor": {
              "ProcessorConfig": {
                "Mode": "DISTRIBUTED",
                "ExecutionType": "STANDARD"
              },
              "StartAt": "Lambda Invoke",
              "States": {
                "Lambda Invoke": {
                  "Type": "Task",
                  "Resource": "arn:aws:states:::lambda:invoke",
                  "OutputPath": "$.Payload",
                  "Parameters": {
                    "FunctionName": "${var.processlambda}:$LATEST",
                    "Payload.$": "$"
                  },
                  "Retry": [
                    {
                      "ErrorEquals": [
                        "Lambda.TooManyRequestsException"
                      ],
                      "IntervalSeconds": 30,
                      "MaxAttempts": 10,
                      "BackoffRate": 2,
                      "Comment": "Lambda 429"
                    },
                    {
                      "ErrorEquals": [
                        "SlowDown"
                      ],
                      "IntervalSeconds": 5,
                      "MaxAttempts": 30,
                      "Comment": "S3 SlowDown 503",
                      "BackoffRate": 1
                    }
                  ],
                  "End": true
                }
              }
            },
            "End": true,
            "Label": "DistributedMapDataProcessing",
            "MaxConcurrency": ${var.dmapconcurrency},
            "ItemBatcher": {
              "MaxItemsPerBatch": ${var.dmapbatchsize},
              "BatchInput": {
                "workshop_variables.$": "$.workshop_variables"
              }
            },
            "ItemReader": {
              "Resource": "arn:aws:states:::s3:getObject",
              "ReaderConfig": {
                "InputType": "MANIFEST",
                "MaxItems": 0
              },
              "Parameters": {
                "Bucket.$": "$.key.bucket",
                "Key.$": "$.key.key"
              }
            },
            "ToleratedFailureCount": 100,
            "ResultWriter": {
              "Resource": "arn:aws:states:::s3:putObject",
              "Parameters": {
                "Bucket": "${var.destinationbucket}",
                "Prefix": "${var.prefix}-dmap-results"
              }
            }
          }
        }
      },
      "End": true,
      "ItemsPath": "$.stepresult.body.files",
      "MaxConcurrency": 2,
      "ItemSelector": {
        "workshop_variables.$": "$.workshop_variables",
        "key.$": "$$.Map.Item.Value"
      }
    }
  }
}
EOF
}

resource "aws_sfn_state_machine" "sfnecsstatemachine" {
  count     = var.compute == "ecs" ? 1 : 0
  name      = "${var.prefix}-state-machine"
  role_arn  = aws_iam_role.statemachinerole.arn

  tags  = merge(var.tags, {Name = "${var.prefix}-state-machine"})

  definition  = <<EOF
{
  "Comment": "A description of my state machine",
  "StartAt": "Set Example Runtime Properties",
  "States": {
    "Set Example Runtime Properties": {
      "Type": "Pass",
      "Next": "S3 Inventory Partition Step",
      "Result": {
        "inventory": {
          "bucket": "${var.sourcebucket}",
          "key": "${var.inventorypath}",
          "output_prefix": "${var.inventoryoutput}"
        },
        "workshop_variables": {
          "output_bucket": "${var.destinationbucket}",
          "output_prefix": "${var.outputpath}",
          "batch_output_files": "${var.batchoutput}",
          "input_sampling": ${var.sampling},
          "output_rows_per_file": ${var.dmapbatchsize}
        }
      }
    },
    "S3 Inventory Partition Step": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "${var.partitionlambda}:$LATEST",
        "Payload.$": "$"
      },
      "Retry": [
        {
          "ErrorEquals": [
            "Lambda.ServiceException",
            "Lambda.AWSLambdaException",
            "Lambda.SdkClientException",
            "Lambda.TooManyRequestsException"
          ],
          "IntervalSeconds": 2,
          "MaxAttempts": 6,
          "BackoffRate": 2
        }
      ],
      "Next": "Scale Out Workers",
      "ResultPath": "$.stepresult",
      "ResultSelector": {
        "body.$": "$.Payload.body"
      }
    },
    "Scale Out Workers": {
      "Type": "Task",
      "Next": "Inline Map Orchestration",
      "ResultPath": null,
      "Parameters": {
        "Service": "${var.ecsservice}",
        "Cluster": "${var.ecscluster}",
        "DesiredCount": ${var.ecstaskcount}
      },
      "Resource": "arn:aws:states:::aws-sdk:ecs:updateService"
    },
    "Inline Map Orchestration": {
      "Type": "Map",
      "ItemProcessor": {
        "ProcessorConfig": {
          "Mode": "INLINE"
        },
        "StartAt": "Distributed Map Data Processing",
        "States": {
          "Distributed Map Data Processing": {
            "Type": "Map",
            "ItemProcessor": {
              "ProcessorConfig": {
                "Mode": "DISTRIBUTED",
                "ExecutionType": "STANDARD"
              },
              "StartAt": "Step Functions Run Activity",
              "States": {
                "Step Functions Run Activity": {
                  "Type": "Task",
                  "Resource": "${aws_sfn_activity.sfnecsactivity[0].id}",
                  "TimeoutSeconds": ${var.activitytimeout},
                  "End": true,
                  "Retry": [
                    {
                      "ErrorEquals": [
                        "States.TaskFailed",
                        "States.Timeout",
                        "An error occurred (SlowDown) when calling the PutObject operation (reached max retries: 4): Please reduce your request rate."
                      ],
                      "BackoffRate": 2,
                      "IntervalSeconds": 30,
                      "MaxAttempts": 3
                    }
                  ],
                  "HeartbeatSeconds": ${var.activityheartbeat}
                }
              }
            },
            "ItemReader": {
              "Resource": "arn:aws:states:::s3:getObject",
              "ReaderConfig": {
                "InputType": "MANIFEST",
                "MaxItems": 0
              },
              "Parameters": {
                "Bucket.$": "$.key.bucket",
                "Key.$": "$.key.key"
              }
            },
            "MaxConcurrency": ${var.dmapconcurrency},
            "Label": "S3objectkeys",
            "ItemBatcher": {
              "BatchInput": {
                "workshop_variables.$": "$.workshop_variables"
              },
              "MaxItemsPerBatch": ${var.dmapbatchsize}
            },
            "ResultWriter": {
              "Resource": "arn:aws:states:::s3:putObject",
              "Parameters": {
                "Bucket": "${var.destinationbucket}",
                "Prefix": "${var.prefix}-dmap-results"
              }
            },
            "End": true
          }
        }
      },
      "Next": "Destroy Workers",
      "ItemsPath": "$.stepresult.body.files",
      "MaxConcurrency": 2,
      "ItemSelector": {
        "workshop_variables.$": "$.workshop_variables",
        "key.$": "$$.Map.Item.Value"
      }
    },
    "Destroy Workers": {
      "Type": "Task",
      "Parameters": {
        "Service": "${var.ecsservice}",
        "Cluster": "${var.ecscluster}",
        "DesiredCount": 0
      },
      "Resource": "arn:aws:states:::aws-sdk:ecs:updateService",
      "End": true
    }
  }
}
EOF
}

##############################################################
#
# OUTPUTS
#
##############################################################
output "statemachineid" {
  value = var.compute == "lambda" ? aws_sfn_state_machine.sfnlambdastatemachine[0].id : aws_sfn_state_machine.sfnecsstatemachine[0].id
}

output "activityarn" {
  value = var.compute == "lambda" ? "null" : aws_sfn_activity.sfnecsactivity[0].id
}

output "activityname" {
  value = var.compute == "lambda" ? "null" : aws_sfn_activity.sfnecsactivity[0].name
}
