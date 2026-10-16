# EKS Security: IAM and Certificates

EKS 上 Pod 级 IAM 权限和 TLS 证书管理。

## Docs

- [eks_attach_iam_role_to_pod](eks_attach_iam_role_to_pod.md)：IRSA 实现机制（pod-identity-webhook 注入 token 和 role-arn），以及自建 K8S 使用 kube2iam / 模拟 IRSA 的参考链接
- [EKS-Certification](EKS-Certification.md)：用 cert-manager + aws-privateca-issuer 插件对接 ACM Private CA 为 Kubernetes 签发证书（简介和官方文档链接）
