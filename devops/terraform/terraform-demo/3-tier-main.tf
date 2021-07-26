module "vpc" {

  source = "terraform-aws-modules/vpc/aws"


  name = "myvpc"

  cidr = "10.10.0.0/16"


  azs = ["cn-north-1a", "cn-north-1b"]

  public_subnets = ["10.10.0.0/24", "10.10.10.0/24"]

  private_subnets = ["10.10.1.0/24", "10.10.11.0/24"]

  database_subnets = ["10.10.2.0/24", "10.10.12.0/24"]


  create_database_subnet_group = true

  enable_dns_hostnames = true

  enable_dns_support = true

  enable_dynamodb_endpoint = true

  enable_s3_endpoint = true


  tags = {

    Owner = "user"

    Environment = "staging"

  }

}


module "websg" {

  source = "terraform-aws-modules/security-group/aws"


  name = "web-service"

  description = "Security group for HTTP and SSH within VPC"

  vpc_id = "${module.vpc.vpc_id}"


  ingress_rules = ["http-80-tcp", "https-443-tcp", "ssh-tcp", "all-icmp"]

  ingress_cidr_blocks = ["0.0.0.0/0"]

  ingress_ipv6_cidr_blocks = []

  egress_rules = ["all-all"]

  egress_cidr_blocks = ["0.0.0.0/0"]

  egress_ipv6_cidr_blocks = []

}


module "appsg" {

  source = "terraform-aws-modules/security-group/aws"


  name = "app-service"

  description = "Security group for App within VPC"

  vpc_id = "${module.vpc.vpc_id}"


  ingress_ipv6_cidr_blocks = []

  egress_ipv6_cidr_blocks = []


  ingress_with_source_security_group_id = [

    {

      rule = "all-all"

      source_security_group_id = "${module.websg.this_security_group_id}"

    },

  ]


  egress_with_source_security_group_id = [

    {

      rule = "all-all"

      source_security_group_id = "${module.websg.this_security_group_id}"

    },

  ]

}


module "dbssg" {

  source = "terraform-aws-modules/security-group/aws"


  name = "dbs-service"

  description = "Security group for Database within VPC"

  vpc_id = "${module.vpc.vpc_id}"


  ingress_ipv6_cidr_blocks = []

  egress_ipv6_cidr_blocks = []


  ingress_with_source_security_group_id = [

    {

      rule = "all-all"

      source_security_group_id = "${module.appsg.this_security_group_id}"

    },

  ]


  egress_with_source_security_group_id = [

    {

      rule = "all-all"

      source_security_group_id = "${module.appsg.this_security_group_id}"

    },

  ]

}


module "ec2_web_1a" {

  source = "terraform-aws-modules/ec2-instance/aws"


  name = "web_1a"

  instance_count = 1


  ami = "${var.inst_ami}"

  instance_type = "${var.inst_type}"

  key_name = "${var.aws_key_pair}"

  monitoring = true

  vpc_security_group_ids = ["${module.websg.this_security_group_id}"]

  subnet_id = "${module.vpc.public_subnets[0]}"

  associate_public_ip_address = true


  tags = {

    Terraform = "true"

    Environment = "dev"

  }

}


module "ec2_web_1b" {

  source = "terraform-aws-modules/ec2-instance/aws"


  name = "web_1b"

  instance_count = 1


  ami = "${var.inst_ami}"

  instance_type = "${var.inst_type}"

  key_name = "${var.aws_key_pair}"

  monitoring = true

  vpc_security_group_ids = ["${module.websg.this_security_group_id}"]

  subnet_id = "${module.vpc.public_subnets[1]}"

  associate_public_ip_address = true


  tags = {

    Terraform = "true"

    Environment = "dev"

  }

}


module "ec2_app_1a" {

  source = "terraform-aws-modules/ec2-instance/aws"


  name = "app_1a"

  instance_count = 2


  ami = "${var.inst_ami}"

  instance_type = "${var.inst_type}"

  key_name = "${var.aws_key_pair}"

  monitoring = true

  vpc_security_group_ids = ["${module.appsg.this_security_group_id}"]

  subnet_id = "${module.vpc.private_subnets[0]}"

  associate_public_ip_address = false


  tags = {

    Terraform = "true"

    Environment = "dev"

  }

}


module "ec2_app_1b" {

  source = "terraform-aws-modules/ec2-instance/aws"


  name = "app_1b"

  instance_count = 2


  ami = "${var.inst_ami}"

  instance_type = "${var.inst_type}"

  key_name = "${var.aws_key_pair}"

  monitoring = true

  vpc_security_group_ids = ["${module.appsg.this_security_group_id}"]

  subnet_id = "${module.vpc.private_subnets[1]}"

  associate_public_ip_address = false


  tags = {

    Terraform = "true"

    Environment = "dev"

  }

}


module "mysql01" {

  source = "terraform-aws-modules/rds/aws"


  identifier = "mysql01"

  engine = "mysql"

  engine_version = "5.7.11"

  instance_class = "db.t2.small"

  allocated_storage = 20

  storage_type = "gp2"

  name = "demodb"

  username = "myadmin"

  password = "rootroot"

  port = "3306"

  multi_az = true

  vpc_security_group_ids = ["${module.dbssg.this_security_group_id}"]

  maintenance_window = "Mon:00:00-Mon:03:00"

  backup_window = "03:00-06:00"


  tags = {

    Owner = "user"

    Environment = "dev"

  }


  subnet_ids = ["${module.vpc.database_subnets}"]

  family = "mysql5.7"

  final_snapshot_identifier = false

  backup_retention_period = 0

  publicly_accessible = false


  parameters = [

    {

      name = "character_set_client"

      value = "utf8"

    },

    {

      name = "character_set_server"

      value = "utf8"

    },

  ]

}