## Alias target Test
1. Before you proceed, locate the HostedZoneId for Elastic Load Balancing, AWS Elastic Beanstalk, Amazon Simple Storage Service (Amazon S3), and Amazon CloudFront endpoints for each region.

[Route53 - Alias - target](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-route53-aliastarget.html)

[Region Endpoint](https://docs.amazonaws.cn/en_us/general/latest/gr/rande.html#cnnorth_region)

[Values for alias Route53 records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias.html)

- CloudFront
Alias records for CloudFront can't be created in a private zone. So you need public zone.
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z2LUYG0HCUTETD --change-batch file://cn-cloudfront-alias.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

- NLB
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://nlb-alias.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

aws route53 list-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

- ALB
```bash
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://alb-alias.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

aws route53 list-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

- API Gateway
```bash
# Create CNAME in private Zone point to API GW private api domain
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://apigw-privateapi-cname-bjs.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

# Create VPCE alias in private Zone point to APIGW VPCE which used by private API
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://apigw-privateapi-vpce-alias-bjs.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

# create CNAME in private Zone point to API GW regional API domain
aws route53 change-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --change-batch file://apigw-regionalpi-cname-bjs.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

# Create APIGW alias in private Zone with regional API
aws route53 change-resource-record-sets --hosted-zone-id Z08202231ZEUWA2PZ7ZBZ --change-batch file://apigw-alias-bjs.json --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1

{
    "ChangeInfo": {
        "Id": "/change/C02705502PO8W4CH3L7UG",
        "Status": "PENDING",
        "SubmittedAt": "2020-11-13T08:44:40.330Z",
        "Comment": "Creating Alias resource record sets in Route 53"
    }
}

aws route53 list-resource-record-sets --hosted-zone-id  Z08202231ZEUWA2PZ7ZBZ --region cn-northwest-1 --profile cn-north-1
{
            "Name": "apigw-regional-alias.api.ray-alb-webapp.top.",
            "Type": "A",
            "AliasTarget": {
                "HostedZoneId": "Z3N456W6CBMXJZ",
                "DNSName": "d-tsvr8qjugg.execute-api.cn-north-1.amazonaws.com.cn.",
                "EvaluateTargetHealth": false
            }
}

aws route53 list-resource-record-sets --hosted-zone-id Z0807456FWSN21W2TRAZ --endpoint-url https://route53.amazonaws.com.cn --region cn-northwest-1 --profile cn-north-1
```

Beijing：Z3N456W6CBMXJZ
Ningxia：Z1HSIYANU8ZW46