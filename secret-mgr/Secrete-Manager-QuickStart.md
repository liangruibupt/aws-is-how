# AWS Secrets Manager Quick Start Tutorials

[Offical Secrets Manager Tutorials doc](https://docs.aws.amazon.com/secretsmanager/latest/userguide/tutorials.html)

1. Create new AWS Secrets Manager->Secrets->quickstart/MyCustomTypeSecret

  Run the [secret-mgr-demo](secret-mgr-demo.py)

2. Create new AWS Secrets by AWS CLI under 444455556666 account and use the CMK created above.
  ```bash
  aws secretsmanager create-secret --name MyTestDatabaseMasterSecret --description "Test secret for RDS" \
    --kms-key-id {cmk-arn} --secret-string file://mycreds.json \
    --region cn-north-1 --profile cn-north-1
  ```
  Run the [rds-secret-mgr-demo](rds-secret-mgr-demo.py)