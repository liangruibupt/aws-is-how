data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# Network: default VPC (or a supplied one) and one subnet per supported AZ.
# ---------------------------------------------------------------------------
data "aws_vpc" "selected" {
  id      = var.vpc_id != "" ? var.vpc_id : null
  default = var.vpc_id == "" ? true : null
}

data "aws_subnets" "in_vpc" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }
  filter {
    name   = "availability-zone"
    values = var.supported_azs
  }
}

# ---------------------------------------------------------------------------
# Security groups
# ---------------------------------------------------------------------------
# Task SG: NFS to itself (EFS) + app port 3000 from the ALB.
resource "aws_security_group" "task" {
  name        = "${var.name}-efs"
  description = "StudyLens task: EFS NFS (self) + app port from ALB"
  vpc_id      = data.aws_vpc.selected.id
}

resource "aws_security_group_rule" "task_nfs_self" {
  type              = "ingress"
  security_group_id = aws_security_group.task.id
  from_port         = 2049
  to_port           = 2049
  protocol          = "tcp"
  self              = true
}

resource "aws_security_group_rule" "task_app_from_alb" {
  type                     = "ingress"
  security_group_id        = aws_security_group.task.id
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "task_egress" {
  type              = "egress"
  security_group_id = aws_security_group.task.id
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
}

# ALB SG: HTTP 80 from the internet (CloudFront origin fetch).
resource "aws_security_group" "alb" {
  name        = "${var.name}-alb"
  description = "StudyLens ALB: HTTP 80 in"
  vpc_id      = data.aws_vpc.selected.id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---------------------------------------------------------------------------
# EFS: persistent /data for StudyLens JSON knowledge base
# ---------------------------------------------------------------------------
resource "aws_efs_file_system" "data" {
  creation_token = "${var.name}-data"
  encrypted      = true
  tags           = { Name = var.name }
}

resource "aws_efs_mount_target" "mt" {
  for_each        = toset(data.aws_subnets.in_vpc.ids)
  file_system_id  = aws_efs_file_system.data.id
  subnet_id       = each.value
  security_groups = [aws_security_group.task.id]
}

resource "aws_efs_access_point" "ap" {
  file_system_id = aws_efs_file_system.data.id
  posix_user {
    uid = 1000
    gid = 1000
  }
  root_directory {
    path = "/studylens"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }
  tags = { Name = var.name }
}

# ---------------------------------------------------------------------------
# IAM: task execution role (ECR pull + logs) and task role (Bedrock)
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "exec" {
  name               = "${var.name}-ecs-exec"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "exec_managed" {
  role       = aws_iam_role.exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name               = "${var.name}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

data "aws_iam_policy_document" "bedrock" {
  statement {
    actions = ["bedrock:InvokeModel", "bedrock:Converse", "bedrock:ConverseStream"]
    resources = [
      "arn:aws:bedrock:${var.region}:${data.aws_caller_identity.current.account_id}:inference-profile/${var.bedrock_inference_profile_id}",
      "arn:aws:bedrock:*::foundation-model/*",
      "arn:aws:bedrock:${var.region}:${data.aws_caller_identity.current.account_id}:inference-profile/*",
    ]
  }
}

resource "aws_iam_role_policy" "task_bedrock" {
  name   = "${var.name}-bedrock"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.bedrock.json
}

# ---------------------------------------------------------------------------
# Logs + ECS cluster + task definition + service
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.name}"
  retention_in_days = 30
}

resource "aws_ecs_cluster" "this" {
  name = var.name
}

resource "aws_ecs_task_definition" "this" {
  family                   = var.name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.exec.arn
  task_role_arn            = aws_iam_role.task.arn

  volume {
    name = "data"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.data.id
      transit_encryption = "ENABLED"
      authorization_config {
        access_point_id = aws_efs_access_point.ap.id
        iam             = "DISABLED"
      }
    }
  }

  container_definitions = jsonencode([{
    name         = var.name
    image        = var.image_uri
    essential    = true
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]
    mountPoints  = [{ sourceVolume = "data", containerPath = "/data" }]
    environment = [
      { name = "STUDYLENS_AUTH_USER", value = var.basic_auth_user },
      { name = "STUDYLENS_AUTH_PASS", value = var.basic_auth_pass },
      { name = "BEDROCK_REGION", value = var.region },
      { name = "BEDROCK_MODEL_ID", value = var.bedrock_inference_profile_id },
      { name = "ADAPTER_PORT", value = "8787" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = var.name
      }
    }
  }])
}

resource "aws_ecs_service" "this" {
  name            = var.name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.in_vpc.ids
    security_groups  = [aws_security_group.task.id]
    assign_public_ip = true # default VPC has an IGW, no NAT
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = var.name
    container_port   = 3000
  }

  health_check_grace_period_seconds = 120
  depends_on                        = [aws_lb_listener.http, aws_efs_mount_target.mt]
}

# ---------------------------------------------------------------------------
# ALB (internet-facing, HTTP:80) — CloudFront fronts it with HTTPS
# ---------------------------------------------------------------------------
resource "aws_lb" "this" {
  name               = "${var.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.in_vpc.ids
}

resource "aws_lb_target_group" "this" {
  name        = "${var.name}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.selected.id
  target_type = "ip"
  health_check {
    path                = "/"
    matcher             = "200,401" # Basic-Auth returns 401 unauthenticated
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 5
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

# ---------------------------------------------------------------------------
# CloudFront: free trusted *.cloudfront.net HTTPS in front of the HTTP ALB.
# Managed policies: CachingDisabled + AllViewerExceptHostHeader.
# ---------------------------------------------------------------------------
data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

resource "aws_cloudfront_distribution" "this" {
  enabled = true
  comment = var.name

  origin {
    domain_name = aws_lb.this.dns_name
    origin_id   = "alb"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id         = "alb"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    compress                 = true
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
