# AWS Secrets Manager

Secrets Manager enables you to replace hardcoded credentials in your code, including passwords, with an API call to Secrets Manager to retrieve the secret programmatically. This helps ensure the secret can't be compromised by someone examining your code, because the secret no longer exists in the code. Also, you can configure Secrets Manager to automatically rotate the secret for you according to a specified schedule. This enables you to replace long-term secrets with short-term ones, significantly reducing the risk of compromise. 

## AWS Secrets Manager Quick Start Tutorials

[Offical Secrets Manager Tutorials doc](https://docs.aws.amazon.com/secretsmanager/latest/userguide/tutorials.html)

1. [The key/value pairs to be stored in the secret](Custom-Type-Secrets.md)

2. [Secret for AWS RDS / AWS Redshift](Secrets-RDS.md)

3. [Access Secrets from other Account](Cross-Accounts-Secrets.md)

4. [Automating secret creation in AWS CloudFormation](Secrets-Mgr-CloudFormation.md)