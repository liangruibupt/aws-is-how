variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "name" {
  description = "Base name for all StudyLens resources"
  type        = string
  default     = "studylens"
}

variable "image_uri" {
  description = "ECR image URI (with tag) built from ../app. e.g. <acct>.dkr.ecr.us-east-1.amazonaws.com/studylens:latest"
  type        = string
}

variable "bedrock_inference_profile_id" {
  description = "Bedrock inference profile id the in-container adapter calls"
  type        = string
  default     = "us.openai.gpt-5.6-luna"
}

variable "basic_auth_user" {
  description = "HTTP Basic-Auth username enforced by the container's auth wrapper"
  type        = string
  default     = "liang"
}

variable "basic_auth_pass" {
  description = "HTTP Basic-Auth password. Provide via TF_VAR_basic_auth_pass or a tfvars file kept out of git."
  type        = string
  sensitive   = true
}

variable "vpc_id" {
  description = "VPC to deploy into. Empty string = use the account's default VPC."
  type        = string
  default     = ""
}

variable "supported_azs" {
  description = "AZs allowed for the Fargate task + ALB + EFS mount targets (this account rejects use1-az3/az5/az6 for these services)."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1c", "us-east-1d"]
}

variable "cpu" {
  type    = string
  default = "256"
}

variable "memory" {
  type    = string
  default = "512"
}
