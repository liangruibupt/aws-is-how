provider "aws" {
  region = "cn-north-1"

  shared_credentials_file = "~/.aws/credentials"

  profile = "cn-north-1"

}

resource "aws_s3_bucket" "s3_bucket" {

  bucket = "my-tf-test-bucket002-ruiliang-01"

  acl = "private"

  tags = {

    Name = "My bucket"

    Environment = "Dev0001"

  }

}