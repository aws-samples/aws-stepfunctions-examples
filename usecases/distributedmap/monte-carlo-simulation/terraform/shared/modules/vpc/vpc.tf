##############################################################
#
# VPC
#
##############################################################
resource "aws_vpc" "main" {
  cidr_block = var.cidr
  enable_dns_support = true
  enable_dns_hostnames = true

  tags = merge(var.tags, {Name = "${var.prefix}-vpc"})
}

##############################################################
#
# VPC FLOW LOGS
#
##############################################################
resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.flowlogs.arn
  log_destination = aws_cloudwatch_log_group.flowlogs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags  = merge(var.tags, {Name = "${var.prefix}-vpc-flowlogs"}) 
}

resource "aws_cloudwatch_log_group" "flowlogs" {
  name = "${var.prefix}-vpc-flowlogs"

  tags = merge(var.tags, {Name = "${var.prefix}-vpc-flowlogs"})
}

resource "aws_iam_role" "flowlogs" {
  name  = "${var.prefix}-vpc-flowlogs-role"
  tags  = merge(var.tags, {Name = "${var.prefix}-vpc-flowlogs-role"}) 

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "vpc-flow-logs.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "flowlogs" {
  name = "${var.prefix}-vpc-flowlogs-policy"
  role = aws_iam_role.flowlogs.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
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

##############################################################
#
# VPC ENDPOINTS
#
##############################################################
resource "aws_security_group" "endpoints" {
  name        = "${var.prefix}-vpc-endpoints"
  description = "Default group for VPC Endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    description      = "TLS from VPC"
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = [aws_vpc.main.cidr_block]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
  }

  tags  = merge(var.tags, {Name = "${var.prefix}-vpc-endpoints"}) 
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id          = aws_vpc.main.id
  service_name    = "com.amazonaws.${var.region}.s3"
  route_table_ids = [
    aws_route_table.public.id,
    aws_route_table.primary_private.id,
    aws_route_table.secondary_private.id
  ]

  tags  = merge(var.tags, {Name = "${var.prefix}-s3"}) 
}

resource "aws_vpc_endpoint" "alb" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.elasticloadbalancing"
  vpc_endpoint_type   = "Interface"

  security_group_ids  = [
    aws_security_group.endpoints.id,
  ]

  subnet_ids          = [
    aws_subnet.primary_private.id,
    aws_subnet.secondary_private.id
  ]

  private_dns_enabled = true

  tags  = merge(var.tags, {Name = "${var.prefix}-alb"}) 
}

resource "aws_vpc_endpoint" "ecr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"

  security_group_ids  = [
    aws_security_group.endpoints.id,
  ]

  subnet_ids          = [
    aws_subnet.primary_private.id,
    aws_subnet.secondary_private.id
  ]

  private_dns_enabled = true

  tags  = merge(var.tags, {Name = "${var.prefix}-ecr"})
}

resource "aws_vpc_endpoint" "ecrapi" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"

  security_group_ids  = [
    aws_security_group.endpoints.id,
  ]

  subnet_ids          = [
    aws_subnet.primary_private.id,
    aws_subnet.secondary_private.id
  ]

  private_dns_enabled = true

  tags  = merge(var.tags, {Name = "${var.prefix}-ecr-api"})
}

resource "aws_vpc_endpoint" "ecsagent" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecs-agent"
  vpc_endpoint_type   = "Interface"

  security_group_ids  = [
    aws_security_group.endpoints.id,
  ]

  subnet_ids          = [
    aws_subnet.primary_private.id,
    aws_subnet.secondary_private.id
  ]

  private_dns_enabled = true

  tags  = merge(var.tags, {Name = "${var.prefix}-ecs-agent"})
}

resource "aws_vpc_endpoint" "ecstelemetry" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecs-telemetry"
  vpc_endpoint_type   = "Interface"

  security_group_ids  = [
    aws_security_group.endpoints.id,
  ]

  subnet_ids          = [
    aws_subnet.primary_private.id,
    aws_subnet.secondary_private.id
  ]

  private_dns_enabled = true

  tags  = merge(var.tags, {Name = "${var.prefix}-ecs-telemetry"})
}

resource "aws_vpc_endpoint" "ecs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecs"
  vpc_endpoint_type   = "Interface"

  security_group_ids  = [
    aws_security_group.endpoints.id,
  ]

  subnet_ids          = [
    aws_subnet.primary_private.id,
    aws_subnet.secondary_private.id
  ]

  private_dns_enabled = true

  tags  = merge(var.tags, {Name = "${var.prefix}-ecs"})
}

##############################################################
#
# DHCP OPTIONS
#
##############################################################
resource "aws_vpc_dhcp_options" "main" {
  domain_name          = var.domain
  domain_name_servers  = [ "AmazonProvidedDNS" ]
  ntp_servers          = [ "129.6.15.29" ]

  tags = merge(var.tags, {Name = "${var.prefix}-dhcp"})
}

resource "aws_vpc_dhcp_options_association" "main" {
  vpc_id          = aws_vpc.main.id
  dhcp_options_id = aws_vpc_dhcp_options.main.id
}

##############################################################
#
# SUBNETS
#
##############################################################
resource "aws_subnet" "primary_public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.cidr, 8, 1)
  map_public_ip_on_launch = true
  availability_zone       = "${var.region}a"

  tags = merge(var.tags, {Name = "${var.prefix}-ppub"})
}

resource "aws_subnet" "secondary_public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.cidr, 8, 2)
  map_public_ip_on_launch = true
  availability_zone       = "${var.region}c"

  tags = merge(var.tags, {Name = "${var.prefix}-spub"})
}

resource "aws_subnet" "primary_private" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.cidr, 8, 3)
  map_public_ip_on_launch = false
  availability_zone       = "${var.region}a"

  tags = merge(var.tags, {Name = "${var.prefix}-pprv"})
}

resource "aws_subnet" "secondary_private" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.cidr, 8, 4)
  map_public_ip_on_launch = false
  availability_zone       = "${var.region}c"

  tags = merge(var.tags, {Name = "${var.prefix}-sprv"})
}

##############################################################
#
# ROUTING
#
##############################################################
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {Name = "${var.prefix}-igw"})
}

resource "aws_eip" "pnat" {
  vpc = true

  tags = merge(var.tags, {Name = "${var.prefix}-pnat"})
}

resource "aws_eip" "snat" {
  vpc = true

  tags = merge(var.tags, {Name = "${var.prefix}-snat"})
}

resource "aws_nat_gateway" "pnat" {
  allocation_id = aws_eip.pnat.id
  subnet_id     = aws_subnet.primary_public.id

  tags = merge(var.tags, {Name = "${var.prefix}-pnat"})
}

resource "aws_nat_gateway" "snat" {
  allocation_id = aws_eip.snat.id
  subnet_id     = aws_subnet.secondary_public.id

  tags = merge(var.tags, {Name = "${var.prefix}-snat"})
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(var.tags, {Name = "${var.prefix}-public"})
}

resource "aws_route_table" "primary_private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block      = "0.0.0.0/0"
    nat_gateway_id  = aws_nat_gateway.pnat.id
  }

  tags = merge(var.tags, {Name = "${var.prefix}-pprivate"})
}

resource "aws_route_table" "secondary_private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block      = "0.0.0.0/0"
    nat_gateway_id  = aws_nat_gateway.snat.id
  }

  tags = merge(var.tags, {Name = "${var.prefix}-sprivate"})
}

resource "aws_route_table_association" "primary_public" {
  subnet_id      = aws_subnet.primary_public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "secondary_public" {
  subnet_id      = aws_subnet.secondary_public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "primary_private" {
  subnet_id      = aws_subnet.primary_private.id
  route_table_id = aws_route_table.primary_private.id
}

resource "aws_route_table_association" "secondary_private" {
  subnet_id      = aws_subnet.secondary_private.id
  route_table_id = aws_route_table.secondary_private.id
}

##############################################################
#
# OUTPUTS
#
##############################################################
output "id" {
  value = aws_vpc.main.id
}

output "cidr" {
  value = var.cidr
}

output "primarypublicsubnetid" {
  value = aws_subnet.primary_public.id
}

output "secondarypublicsubnetid" {
  value = aws_subnet.secondary_public.id
}

output "primaryprivatesubnetid" {
  value = aws_subnet.primary_private.id
}

output "seconaryprivatesubnetid" {
  value = aws_subnet.secondary_private.id
}

output "publicsubnetids" {
  value = [
    aws_subnet.primary_public.id,
    aws_subnet.secondary_public.id
  ]
}

output "privatesubnetids" {
  value = [
    aws_subnet.primary_private.id,
    aws_subnet.secondary_private.id
  ]
}
