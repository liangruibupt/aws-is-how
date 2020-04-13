# How to upload SSL certificate to AWS services

## Prepare
Get the SSL certificate of your domain. You need the PEM–encoded certificate, PEM–encoded certificate chain, PEM–encoded private keys

The following example shows how to import a certificate using the AWS Command Line Interface (AWS CLI). The example assumes the following:
- The PEM-encoded certificate is stored in a file named Certificate.pem.
- The PEM-encoded certificate chain is stored in a file named CertificateChain.pem.
- The PEM-encoded, unencrypted private key is stored in a file named PrivateKey.pem.

## Import into ACM Using the AWS CLI
https://docs.aws.amazon.com/acm/latest/userguide/import-certificate-api-cli.html

```bash
aws acm import-certificate --certificate file://Certificate.pem \
    --certificate-chain file://CertificateChain.pem \
    --private-key file://PrivateKey.pem --region ${AWS_REGION}
```

## Upload and import an SSL certificate to AWS IAM
https://aws.amazon.com/cn/premiumsupport/knowledge-center/import-ssl-certificate-to-iam/

It's a best practice that you upload SSL certificates to AWS Certificate Manager (ACM). If you're using certificate algorithms and key sizes that aren't currently supported by ACM or ACM is not ready to be associated with AWS resources in your AWS Region, then you can also upload an SSL certificate to IAM.

```bash
aws iam upload-server-certificate --server-certificate-name ExampleCertificate \
 --certificate-body file://Certificate.pem \
 --certificate-chain file://CertificateChain.pem \
 --private-key file://PrivateKey.pem --region ${AWS_REGION}

aws iam list-server-certificates --region ${AWS_REGION}
```

## How can I associate an ACM SSL/TLS certificate with a CLB / ALB / NLB?
https://aws.amazon.com/premiumsupport/knowledge-center/associate-acm-certificate-alb-nlb/

```bash
# CLB
aws elb set-load-balancer-listener-ssl-certificate --load-balancer-name my-load-balancer --load-balancer-port 443 --ssl-certificate-id arn:aws:iam::123456789012:server-certificate/new-server-cert

# ALB / NLB
aws elbv2 create-listener \
    --load-balancer-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/my-load-balancer/50dc6c495c0c9188 \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=arn:aws:acm:us-west-2:123456789012:certificate/3dcb0a41-bd72-4774-9ad9-756919c40557 \
    --ssl-policy ELBSecurityPolicy-2016-08 --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067
```