output "public_url" {
  description = "The HTTPS URL to open on phone/iPad (add to Home Screen)."
  value       = "https://${aws_cloudfront_distribution.this.domain_name}"
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "efs_id" {
  value = aws_efs_file_system.data.id
}

output "ecs_cluster" {
  value = aws_ecs_cluster.this.name
}
