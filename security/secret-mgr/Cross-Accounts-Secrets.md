# How do I share AWS Secrets Manager secrets between AWS accounts?

## Use case1:
The Security_Account user manages your credentials, and the Dev_Account application retrieves secrets in the Security_Account user account.

**Note**: The secret will use the KMS to do encryption, so you need consider the KMS key sharing

For example: A secret named quickstart/ExternalCMKSecret in your Security_Account is encrypted using a customer master key (CMK) DevSecretCMK. Then the secret is shared with your Dev_Account.

1. Step1: Follow the guide [secrets-manager-share-between-accounts](https://aws.amazon.com/premiumsupport/knowledge-center/secrets-manager-share-between-accounts/)

2. Run the [secret-mgr-demo-external-account](scripts/secret-mgr-demo-external-account.py) on EC2 or Lambda