# Create a Lambda Function for a Cross-Account Config Rule
With appropriate authorization, you can create a Config rule in one account that uses an AWS Lambda function owned by another account. Such a setup allows you to maintain a single copy of the Lambda function. You do not have to duplicate source code across accounts.

## Steps overview
1.	Create a Lambda function for a cross-account Config rule in the admin-account.
2.	Authorize Config Rules in the managed-account to invoke a Lambda function in the admin-account.
3.	Create an IAM role in the managed-account to pass to the Lambda function.
4.	Add a policy and trust relationship to the IAM role in the managed-account.
5.	Pass the IAM role from the managed-account to the Lambda function.

## Reference
[How to Centrally Manage AWS Config Rules across Multiple AWS Accounts](https://aws.amazon.com/blogs/devops/how-to-centrally-manage-aws-config-rules-across-multiple-aws-accounts/)

[Creating AWS Config Custom Lambda Rules](https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_develop-rules_lambda-functions.html)
