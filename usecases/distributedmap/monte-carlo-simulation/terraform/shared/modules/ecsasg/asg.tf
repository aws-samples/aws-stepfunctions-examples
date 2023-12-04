##############################################################
#
# AMI LOOKUP
#
##############################################################
data "aws_ami" "latest_ecs" {
  most_recent = true
  owners = ["591542846629"] # AWS

  filter {
    name   = "name"
    values = ["*amazon-ecs-optimized"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }  
}

##############################################################
#
# LAUNCH TEMPLATE
#
##############################################################
resource "aws_launch_template" "ecsasglt" {
  name_prefix             = var.prefix
  image_id                = data.aws_ami.latest_ecs.id
  vpc_security_group_ids  = [var.ecssg]
  instance_requirements {
    memory_mib {
      min = 1 # setting to one to take any instance type based on lowest price
    }
    vcpu_count {
      min = 1 # setting to one to take any instance type based on lowest price
    }
  }
  iam_instance_profile { 
    name = aws_iam_instance_profile.ecs_agent.name
  }
  user_data = base64encode("#!/bin/bash\necho ECS_CLUSTER=${var.ecscluster} >> /etc/ecs/ecs.config")

  tags  = merge(var.tags, {Name = "${var.prefix}-ecsasg-lt"})
}

data "aws_iam_policy_document" "ecs_agent" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "ecs_agent" {
  name               = "${var.prefix}-ecs-agent"
  assume_role_policy = data.aws_iam_policy_document.ecs_agent.json
}

resource "aws_iam_policy" "ecs_policy" {
  name        = "${var.prefix}-ecs-policy"
  path        = "/"
  description = "Allows ECS agents to create and use CloudWatch Log Groups"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:*",
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_agent" {
  role        = aws_iam_role.ecs_agent.name
  policy_arn  = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_role_policy_attachment" "ecs_agent_ssm" {
  role        = aws_iam_role.ecs_agent.name
  policy_arn  = "arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM"
}

resource "aws_iam_role_policy_attachment" "ecs_policy" {
  role        = aws_iam_role.ecs_agent.name
  policy_arn  = aws_iam_policy.ecs_policy.arn
}

resource "aws_iam_instance_profile" "ecs_agent" {
  name = "${var.prefix}-ecs-agent"
  role = aws_iam_role.ecs_agent.name
}

##############################################################
#
# AUTOSCALING GROUP
#
##############################################################
resource "aws_autoscaling_group" "ecsasg" {
  name                      = "${var.prefix}-ecsasg"
  max_size                  = var.asgmax
  min_size                  = var.asgmin
  health_check_grace_period = 300
  health_check_type         = "EC2"
  desired_capacity          = var.asgdes
  force_delete              = true
  protect_from_scale_in     = true
  vpc_zone_identifier       = var.privatesubnets

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity   = 0
      spot_allocation_strategy  = "price-capacity-optimized"
    }
    launch_template {
      launch_template_specification {
        launch_template_id  = aws_launch_template.ecsasglt.id
      }
    }
  }

  lifecycle {
    ignore_changes = [
      desired_capacity  # managed by cluster-autoscaler
    ]
  }

  dynamic "tag" {
    for_each = var.tags
    content {
      key = tag.key
      value = tag.value
      propagate_at_launch = true
    }
  }

  tag {
    key = "Name"
    value = "${var.prefix}-ecsasg-node"
    propagate_at_launch = true
  }
}

##############################################################
#
# ECS CAPACITY PROVIDER
#
##############################################################
resource "aws_ecs_capacity_provider" "ecscp" {
  name = "${var.prefix}-ecsasg-cp"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.ecsasg.arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      maximum_scaling_step_size = 1
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 100
    }
  }

  tags  = merge(var.tags, {Name = "${var.prefix}-ecsasg-cp"})
}

##############################################################
#
# OUTPUTS
#
##############################################################
output "id" {
  value = aws_ecs_capacity_provider.ecscp.id
}

output "arn" {
  value = aws_ecs_capacity_provider.ecscp.arn
}

output "name" {
  value = aws_ecs_capacity_provider.ecscp.name
}
