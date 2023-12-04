
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    archive = {
      source = "hashicorp/archive"
      version = "2.4.0"
    }
  }
}

provider "aws" {
  alias   = "main"
  region  = "us-east-2"
}