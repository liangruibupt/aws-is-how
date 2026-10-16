# EKS Cluster and Nodes

EKS 集群创建、Linux / Windows 节点组，以及节点运维相关笔记。

## Docs

- [EKS_in_Beijing_3AZ](EKS_in_Beijing_3AZ.md)：eksctl 在北京区先用不含 cn-north-1d 的子网建集群，再创建跨 3 个 AZ 的自管 / 托管节点组
- [Windows-pod-EKS](Windows-pod-EKS.md)：开启 EKS Windows 支持（VPC controller）、eksctl 创建 Windows 自管节点组、配置 aws-auth、用 nodeSelector 部署 IIS 示例
- [Install-SSM-Agent-on-EKS-Worker-Node](Install-SSM-Agent-on-EKS-Worker-Node.md)：给 Worker Node 装 SSM Agent 的两种方式：一次性 DaemonSet，或托管节点组 Launch Template UserData
- [Exclusive_Node_from_ELB](Exclusive_Node_from_ELB.md)：`kubernetes.io/role/internal-elb` 子网标签只决定 ELB 放在哪些子网；用 `externalTrafficPolicy: Local` 让只有运行 Pod 的节点接收 CLB 流量

## Scripts

- [scripts/aws-auth-cm-windows.yaml](scripts/aws-auth-cm-windows.yaml)：aws-auth ConfigMap 模板，同时映射 Linux 和 Windows 节点的 Instance Role
- [scripts/windows_server_iis.yaml](scripts/windows_server_iis.yaml)：Windows Server Core IIS 示例 Deployment + LoadBalancer Service（namespace `windows`）
- [scripts/ssm_daemonset.yaml](scripts/ssm_daemonset.yaml)：通过写入宿主机 `/etc/cron.d` 在 Linux 节点上安装 SSM Agent 的 DaemonSet
- [scripts/webkook-lambda.py](scripts/webkook-lambda.py)：Lambda 实现的 Kubernetes mutating admission webhook，用 JSON Patch 把 Pod 的 Docker Hub / quay.io / gcr.io 镜像地址改写为 cn-northwest-1 ECR 镜像仓库（Python 2 写法）
- [scripts/new-webhook-lambda.py](scripts/new-webhook-lambda.py)：上述 webhook 的新版本，增加 asia/eu/us.gcr.io 和 EKS 官方 ECR（us-west-2）的映射，匹配到第一个前缀即停止
