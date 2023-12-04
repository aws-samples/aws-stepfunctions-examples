##############################################################
#
# ECS CLUSTER
#
#######################################ßßß####################
resource "aws_ecs_cluster" "main" {
  name                = "${var.prefix}-ecs-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags  = merge(var.tags, {Name = "${var.prefix}-ecs-cluster"})
}

resource "aws_ecs_cluster_capacity_providers" "fargatespot" {
  count         = var.ecscp == "null" ? 1 : 0
  cluster_name  = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE_SPOT"
  }
}

resource "aws_ecs_cluster_capacity_providers" "ec2spot" {
  count         = var.ecscp != "null" ? 1 : 0
  cluster_name  = aws_ecs_cluster.main.name

  capacity_providers = ["${var.ecscp}"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "${var.ecscp}"
  }
}

##############################################################
#
# OUTPUTS
#
##############################################################
output "clusterid" {
  value = aws_ecs_cluster.main.id
}

output "clustername" {
  value = aws_ecs_cluster.main.name
}
