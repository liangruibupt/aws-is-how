# Amazon ECS and ECR

ECS 服务的负载均衡、日志与监控，以及镜像构建和 ECR 相关笔记。

## Docs

- [ECS-Dynamic-Port-Mapping](ECS-Dynamic-Port-Mapping.md)：ALB 动态端口映射自动注册 ECS 任务；一个 ECS 服务挂多个 Target Group 的三种示例（同容器多端口、内外网两个 LB、多容器）
- [ECS-FireLens](ECS-FireLens.md)：cats / dogs / web 示例：构建镜像推送 ECR、创建 ECS 集群与任务定义、ALB 路径路由（EC2 + Fargate），Container Insights 监控和 FireLens（Fluent Bit）日志路由到 CloudWatch Logs
- [ECR-Sync-and-ECS-Service-Discovery](ECR-Sync-and-ECS-Service-Discovery.md)：ECS 服务发现（Cloud Map / Route 53）和 ECR 镜像从 Global 同步到中国区的参考链接与问题记录

## Projects

- [tomcat](tomcat/README.md)：基于 `tomcat:8-jre8` 打包 sample.war 的 Dockerfile，以及本地构建运行、推送到 cn-north-1 ECR 的命令
