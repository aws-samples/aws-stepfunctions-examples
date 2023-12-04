##############################################################
#
# S3 BUCKETS
#
#######################################ßßß####################
resource "random_string" "random" {
  length  = 20
  upper   = false
  lower   = true
  number  = true
  special = false
}

resource "aws_s3_bucket" "source" {
  bucket        = "${var.prefix}-source-${random_string.random.result}"
  force_destroy  = var.force_destroy

  tags    = merge(var.tags, {Name = "${var.prefix}-source-${random_string.random.result}"})
}

resource "aws_s3_bucket" "destination" {
  bucket        = "${var.prefix}-destination-${random_string.random.result}"
  force_destroy = var.force_destroy

  tags    = merge(var.tags, {Name = "${var.prefix}-destination-${random_string.random.result}"})
}

##############################################################
#
# OUTPUTS
#
##############################################################
output "sourceid" {
  value = aws_s3_bucket.source.id
}

output "sourcearn" {
  value = aws_s3_bucket.source.arn
}

output "destinationid" {
  value = aws_s3_bucket.destination.id
}

output "destinationarn" {
  value = aws_s3_bucket.destination.arn
}
