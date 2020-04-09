# Allowing users in other accounts to use a CMK

[offical support doc](https://aws.amazon.com/premiumsupport/knowledge-center/share-cmk-account/)

1. Create CMK Key which allow external account to use
When you create the new CMK in KMS console wizard `Step 3 Define key usage permissions`, you can specify the external account to use the CMK key.

Then `Step 4 Review and edit key policy`, you can use its Policy parameter to specify a key policy as below step that gives an external account, or external users and roles, permission to use the CMK. You must also add IAM policies in the external account that delegate these permissions to the account's users and roles, even when users and roles are specified in the key policy. 

For existed CMK key, you can specify a key policy as below that gives an external account, or external users and roles, permission to use the CMK.

2. Add a key policy statement in the local account

To give an external account permission to use the CMK, add a statement to the key policy that specifies the external account. 

For example, assume that you want to allows ExampleRole and ExampleUser in account 444455556666 to use a CMK in account 111122223333.
**Note: for China region ARN partition is arn:aws-cn, for Global region ARN partition is arn:aws**

```json
# external account level
{
    "Sid": "Allow an external account to use this CMK",
    "Effect": "Allow",
    "Principal": {
        "AWS": [
            "arn:aws-cn:iam::444455556666:root"
        ]
    },
    "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
    ],
    "Resource": "*"
}

# external users and roles level
{
    "Sid": "Allow an external account to use this CMK",
    "Effect": "Allow",
    "Principal": {
        "AWS": [
            "arn:aws-cn:iam::444455556666:role/ExampleRole"
            "arn:aws-cn:iam::444455556666:user/ExampleUser"
        ]
    },
    "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
    ],
    "Resource": "*"
}
```


3. Add IAM policies in the external account

The external account cannot use the CMK until you attach IAM policies that delegate those permissions, or use grants to manage access to the CMK. The IAM policies are set in the external account.

For example, assume that you want to allows the principal to use the CMK in account 111122223333 for cryptographic operations. To give this permission to users and roles in account 444455556666, attach the policy to the users or roles in account 444455556666.

**Note: for China region ARN partition is arn:aws-cn, for Global region ARN partition is arn:aws**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowExternalAccount",
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws-cn:kms:cn-north-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab"
    }
  ]
}
```


4. Using external CMKs with AWS services
- Create new AWS Secrets Manager->Secrets->quickstart/MyCustomTypeSecret under 111122223333 account and use the CMK created above.
  - In 111122223333 account run the [secret-mgr-demo](secret-mgr/secret-mgr-demo.py)
- Create new AWS Secrets by AWS CLI under 444455556666 account and use the CMK created above.
```bash
aws secretsmanager create-secret --name quickstart/ExternalCMKSecret --description "Test secret with external CMK" \
    --kms-key-id {cmk-arn} --secret-string file://mycreds.json \
    --region cn-north-1 --profile cn-north-1-second-external
```
- In 111122223333 account run the [secret-mgr-demo](secret-mgr/secret-mgr-demo-external-account.py)