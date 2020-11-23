# Customer type secret
1. Create new Secrets from AWS Secrets Manager Console

Navigate to AWS Secrets Manager->Secrets

![customType](media/customType.png)

Then Run the [secret-mgr-demo](scripts/secret-mgr-demo.py) on EC2 or Lambda

2. Create new AWS Secrets by AWS CLI under 444455556666 account and use the CMK created above.
  ```bash
  aws secretsmanager create-secret --name MyTestDatabaseMasterSecret --description "Test secret for RDS" \
    --kms-key-id {cmk-arn} --secret-string file://mycreds.json \
    --region cn-north-1 --profile cn-north-1
  ```

3. Run the [rds-secret-mgr-demo](scripts/rds-secret-mgr-demo.py) on EC2 or Lambda
