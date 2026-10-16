# Containers: Amazon EKS / ECS

容器相关笔记和脚本（EKS、EKS on Fargate、ECS、ECR），按主题分类：

| Folder | 内容 |
|---|---|
| [eks-cluster](eks-cluster/README.md) | EKS 集群与节点：北京区 3 AZ 建集群、Windows 节点、Worker Node 安装 SSM Agent、节点与 ELB Target Group、镜像地址改写 webhook |
| [eks-fargate](eks-fargate/README.md) | EKS on Fargate：Fargate Profile、AWS Load Balancer Controller 与 2048 示例 |
| [eks-security](eks-security/README.md) | EKS 安全：IRSA（Pod 级 IAM Role）、ACM Private CA 为 Kubernetes 签发证书 |
| [ecs](ecs/README.md) | ECS / ECR：ALB 动态端口映射与多 Target Group、FireLens 日志路由、Tomcat 镜像示例、ECR 同步与 ECS 服务发现 |
