# ------------------------------------------------------------
# basics - these are the input variables with common names
# typically used across multiple combos and modules
# desc: the prefix variable exists provides to prefix for all resource names
variable "prefix" {
  type    = string
  default = "sfn-lambda"
}

# desc: the region variable defines which AWS region we are building these resources in.
variable "region" {
  type    = string
  default = "us-east-2"
}

# ------------------------------------------------------------
# lambda specific variables
variable "tags" {
  type    = map(string)
  default = {
    Project = "sfn-lambda"
  }
}

variable "filename" {
  type    = string
}

variable "filehash" {
  type    = string
}

variable "name" {
  type    = string
}

variable "memory" {
  type    = number
  default = 128
}

variable "layers" {
  type    = list(string)
  default = []
}

variable "timeout" {
  type    = number
  default = 3
}

variable "runtime" {
  type    = string
  default = "python3.10"
}

variable "recordcount" {
  type    = number
  default = 500000
}

variable "fedrate" {
  type    = number
  default = 8
}

variable "sourcebucket" {
  type  = string
}

variable "destinationbucket" {
  type    = string
}

# ------------------------------------------------------------
