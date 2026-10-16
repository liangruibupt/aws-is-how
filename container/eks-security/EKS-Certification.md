# Securing Kubernetes with Private CA

Kubernetes containers and applications use digital certificates to provide secure authentication and encryption over TLS. A widely adopted solution for TLS certificate life-cycle management in Kubernetes is [cert-manager](https://cert-manager.io/docs/), an add-on to Kubernetes that requests certificates, distributes them to Kubernetes containers, and automates certificate renewal. 

ACM Private CA provides an open-source plug-in to cert-manager, [aws-privateca-issuer](https://github.com/cert-manager/aws-privateca-issuer), for cert-manager users who want to set up a CA without storing private keys in the cluster. Users with regulatory requirements for controlling access to and auditing their CA operations can use this solution to improve auditability and support compliance. You can use the AWS Private CA Issuer plugin with Amazon Elastic Kubernetes Service (Amazon EKS), a self-managed Kubernetes on AWS, or in on-premises Kubernetes. 

## Reference
[Securing Kubernetes with ACM Private CA](https://docs.aws.amazon.com/acm-pca/latest/userguide/PcaKubernetes.html)