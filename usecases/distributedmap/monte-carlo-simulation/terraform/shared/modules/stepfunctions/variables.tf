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
# sfn specific variables
variable "tags" {
  type    = map(string)
  default = {
    Project     = "sfn-demo"
    CostCode    = "ABC123"
    Environment = "DEV"
  }
}

variable "compute" {
  type    = string
  default = "ecs"
}

variable "processlambda" {
  type    = string
  default = "null"
}

variable "partitionlambda" {
  type    = string
  default = "null"
}

variable "inventorypath" {
  type    = string
  default = "inventory/manifest.json"
}

variable "inventoryoutput" {
  type    = string
  default = "inventory/temp/"
}

variable "outputpath" {
  type    = string
  default = "output-data"
}

variable "batchoutput" {
  type    = string
  default = "yes"
}

variable "sampling" {
  type    = number
  default = 1
}

variable "datagenarn" {
  type    = string
}

variable "dataseedarn" {
  type    = string
}

variable "inventoryarn" {
  type    = string
}

variable "manifestarn" {
  type    = string
}

variable "dmapconcurrency" {
  type    = number
  default = 1000
}

variable "dmapbatchsize" {
  type    = number
  default = 100
}

variable "activitytimeout" {
  type    = number
  default = 300
}

variable "activityheartbeat" {
  type    = number
  default = 300
}

variable "ecscluster" {
  type    = string
  default = "null"
}

variable "ecsservice" {
  type    = string
  default = "null"
}

variable "ecsservicearn" {
  type    = string
  default = "null"
}

variable "ecstaskcount" {
  type    = number
  default = 100
}

variable "sourcebucket" {
  type    = string
}

variable "sourceprefix" {
  type    = string
}

variable "destinationbucket" {
  type    = string
}

variable "destinationprefix" {
  type    = string
}

# ------------------------------------------------------------
