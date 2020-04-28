# How to migrate global cloudformation to China reigon?

## Modify the global cloudformation for China region
1. Amazon Resource Name (ARN) syntax: 
- global region: arn:aws partition
- china region: arn:aws-cn partition
    
    ARN includes the aws-cn partition for resources in the region. For example: arn:aws-cn:iam::123456789012:user/div/subdiv/Zhang

    Suggest use the arn:${AWS::Partition} to automatically adjust based on region, not hard code

    The [ARN official document](https://docs.amazonaws.cn/en_us/aws/latest/userguide/ARNs.html)

2. Region code
- Beijing: cn-north-1 
- Ningxia: cn-northwest-1

3. You may need adjust service endpoint
- [Bejing Region endoppoint official document](https://docs.amazonaws.cn/en_us/aws/latest/userguide/endpoints-Beijing.html)
- [Ningxia Region endoppoint official document](https://docs.amazonaws.cn/en_us/aws/latest/userguide/endpoints-Ningxia.html)
    
    Sample Format: xyz.cn-north-1.amazonaws.com.cn


## Scan Your CloudFormation templates using Cfn_Nag

It is a good practice to make sure your CloudFormation follow AWS best practice. We use open source tool 
[cfn_nag](https://github.com/stelligent/cfn_nag) to scan your CloudFormation templates in our pipeline. It is highly recommended to do it on your local development before you public your cloudformation.

```shell script
# Install on Mac/Linux
brew install ruby brew-gem
brew gem install cfn-nag

# Validate your CloudFormation templates
cfn_nag_scan --input-path deployment/cloudformation-sample.template

------------------------------------------------------------
deployment/cloudformation-sample.template
------------------------------------------------------------
Failures count: 0
Warnings count: 0
```

If you see any warnings for failings, consider make your CloudFormation templates to follow the best practice. If you do need to suppress the Cfn_Nag rules, see [Rule Suppression](https://github.com/stelligent/cfn_nag#per-resource-rule-suppression) for how to add metadata to avoid warnings and failing in templates.

For exmaple:
```yaml
PublicAlbSecurityGroup:
  Properties:
    GroupDescription: 'Security group for a public Application Load Balancer'
    VpcId:
      Ref: vpc
  Type: AWS::EC2::SecurityGroup
  Metadata:
    cfn_nag:
      rules_to_suppress:
        - id: W9
          reason: "This is a public facing ELB and ingress from the internet should be permitted."
        - id: W2
          reason: "This is a public facing ELB and ingress from the internet should be permitted."
```