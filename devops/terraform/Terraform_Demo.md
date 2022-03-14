# Terraform概述

## 概述
Terraform是HashiCorp公司旗下的Provision Infrastructure产品, 是一个IT基础架构自动化编排工具。“Write, Plan, and Create Infrastructure as Code”

- Terraform基于AWS Go SDK进行构建，采用HashiCorp配置语言（HCL）对资源进行编排
- 支持在真正运行之前看到执行计划(运行dryrun： Terraform plan)。
- 执行状态保存到文件中，因此能够离线方式查看资源情况（前提是不要在Terraform 之外对资源进行修改）。Terraform 配置的状态能够保存在本地文件、Consul、S3等处。
- AWS Module：https://registry.terraform.io/namespaces/terraform-aws-modules

## Terraform安装
- 二进制版本: https://www.terraform.io/downloads.html
- 基于源码编译安装：https://github.com/hashicorp/terraform

## 配置介绍
1. Terraform格式和JSON
  - Terraform格式更加人性化，支持 注释，并且是大多数Terraform文件通常推荐的格式。Terraform格式后缀名以.tf结尾。
  - JSON格式适用于机器创建，修改和更新，也可以由Terraform操作员完成。JSON格式后缀名以.tf.json结尾。
- 样例
```
# An AMI
variable "ami" { description = "the AMI to use" }
/* A multi line comment. */
resource "aws_instance" "web" {
    ami = "${var.ami}"
    count = 2
    source_dest_check = false
    connection { user = "root"}
}
```

2. AWS Provider 配置
  - 静态凭据
  - 环境变量
  - 共享凭据文件 (推荐)
  - EC2角色 (推荐)

## Demo
1. terraform providers
```yaml
provider "aws" {
    region = "cn-north-1"
    shared_credentials_file = "~/.aws/credentials"
    profile = "cn-north-1"
}
```

2. terraform fmt s3demo.tf
```yaml
resource "aws_s3_bucket" "s3_bucket" {
    bucket = "my-tf-test-bucket001"
    acl = "private"
    tags = {
        Name = "My bucket"
    Environment = "Dev"
    }
}
```

其他配置： https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

3. terraform init

4. terraform plan

5. terraform apply

6. 修改 s3demo.tf

7. terraform plan and terraform apply

8. terraform destroy

## 参考文献
- https://registry.terraform.io/providers/hashicorp/aws/latest/docs

- https://learn.hashicorp.com/collections/terraform/aws-get-started

- https://aws.amazon.com/cn/blogs/china/aws-china-region-guide-series-terraform1/
