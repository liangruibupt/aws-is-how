```bash
aws iam create-role --role-name CodePipelineRole --assume-role-policy-document file://trust_policy.json --region cn-north-1 --profile china_ruiliang

aws iam put-role-policy --role-name CodePipelineRole --policy-name CodePipelinePolicy --policy-document file://policy.json --region cn-north-1 --profile china_ruiliang
```

```bash
aws iam get-role --role-name CodePipelineRole --region cn-north-1 --profile china_ruiliang
aws iam get-role-policy --role-name CodePipelineRole --policy-name CodePipelinePolicy --region cn-north-1 --profile china_ruiliang
```

```bash
aws iam create-role --role-name HelloWorldCloudFormationRole --assume-role-policy-document file://trusted-entity.json --region cn-north-1 --profile china_ruiliang

aws iam put-role-policy --role-name HelloWorldCloudFormationRole --policy-name HelloWorldCloudFormationPolicy --policy-document file://user-policy.json --region cn-north-1 --profile china_ruiliang
```

```bash
cd lambda
zip hello-world.zip *
aws s3 cp hello-world.zip s3://codefamily-sample/codecommit/builds/ --region cn-north-1 --profile china_ruiliang

```

```bash
aws cloudformation create-stack --stack-name HelloWorldCodePipeline --template-body file://test-codepipeline.json --region cn-north-1 --profile china_ruiliang

```