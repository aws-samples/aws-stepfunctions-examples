# ------------------------------------------------------------
# basics - these are the input variables with common names
# typically used across multiple combos and modules
# desc: the prefix variable exists provides to prefix for all resource names
variable "prefix" {
  type    = string
  default = "sfn-demo-test"
}

# desc: the region variable defines which AWS region we are building these resources in.
variable "region" {
  type    = string
  default = "us-east-2"
}

# ------------------------------------------------------------
# s3 specific variables
variable "tags" {
  type    = map(string)
  default = {
    Project     = "sfn-demo"
    CostCode    = "ABC123"
    Environment = "DEV"
  }
}

variable "force_destroy" {
  type    = bool
  default = false
}

# ------------------------------------------------------------
