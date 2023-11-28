##############################################################
#
# GLOBAL SECURITY GROUPS
#
##############################################################
resource "aws_security_group" "ecsinstance" {
  name        = "${var.prefix}-ecsinstance"
  description = "Applied to EC2 instances to designtate being part of an ECS Cluster"
  vpc_id      = var.vpcid

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
  }

  tags  = merge(var.tags, {Name = "${var.prefix}-ecs-instance"})
}

##############################################################
#
# OUTPUTS
#
##############################################################
output "ecsinstanceid" {
  value = aws_security_group.ecsinstance.id
}

output "ecsinstancename" {
  value = aws_security_group.ecsinstance.name
}
