# EKS on Fargate

在中国区用 eksctl 创建 EKS on Fargate 集群，配置 Fargate Profile 和 AWS Load Balancer Controller。

## Docs

- [EKSonFargate-QuickStart](EKSonFargate-QuickStart.md)：带默认 Fargate Profile 建集群并部署 nginx；手动创建 Fargate Profile（含 kube-system）；安装 AWS Load Balancer Controller（OIDC、IAM Policy、ServiceAccount）并通过 Ingress 部署 2048 游戏；以及 Fargate Profile 如何调度 Pod

## Scripts

- [scripts/iam_policy.json](scripts/iam_policy.json)：AWS Load Balancer Controller 的 IAM Policy（中国区 `arn:aws-cn` 版本）
- [scripts/demo-kube-system-profile.json](scripts/demo-kube-system-profile.json)：kube-system 命名空间的 Fargate Profile 输入文件（目前为空文件）
