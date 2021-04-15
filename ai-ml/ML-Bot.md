# ML-Bot info

[Deployment Guide](http://ml-bot.s3-website.cn-north-1.amazonaws.com.cn/)

1. Domain: https://ml-bot-workshop.ruiliang.people.a2z.org.cn

2. Authing URL: https://ml-bot-workshop-ruiliang.authing.cn

3. S3 Bucket: http://ml-bot-exampledata-876820548815.s3.cn-northwest-1.amazonaws.com.cn/

4. server-certificate
```bash
aws iam upload-server-certificate --region $ec2_region --server-certificate-name ml-bot \
--certificate-body file://cert.pem \
--certificate-chain file://chain.pem \
--private-key file://privkey.pem \
--path /cloudfront/ || echo


{
    "ServerCertificateMetadata": {
        "Path": "/cloudfront/",
        "ServerCertificateName": "ml-bot",
        "ServerCertificateId": "ASCA4YJUTZTH5VG2OBEZP",
        "Arn": "arn:aws-cn:iam::876820548815:server-certificate/cloudfront/ml-bot",
        "UploadDate": "2021-04-13T10:13:31Z",
        "Expiration": "2021-05-23T04:16:19Z"
    }
}
```

5. CloudFormaton output

| - Key - | - Value - | - Description - | 
| -- | -- | -- |
| CloudFrontDomain | djcq8v2iaw596.cloudfront.cn | The domain name of the portal. Create a CNAME and point to this record. |
| DistributionId | E1PIM0XOS69GSM | The Portal CloudFront Distribution ID. |
| Domain | ml-bot-workshop.ruiliang.people.a2z.org.cn | The domain URL of the portal |
| LambdaApiRestApiEndpoint727FDDA9 | https://g40hoxnfp9.execute-api.cn-northwest-1.amazonaws.com.cn/Prod/ |

6. Portal URL: https://ml-bot-workshop.ruiliang.people.a2z.org.cn/