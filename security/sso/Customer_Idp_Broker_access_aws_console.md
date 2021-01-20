# Enabling custom identity broker access to the AWS console

Lets users who sign in to your organization's identity provider access the AWS Management Console, you can create a custom identity broker:

1. Verify that the user is authenticated by your identity provider in your broker application.

2. Call the AWS Security Token Service (AWS STS) AssumeRole to obtain temporary security credentials for the user. 

3. Call the AWS federation endpoint and supply the temporary security credentials to request a sign-in token. 

4. Construct a URL for the console that includes the token.

5. Give the URL to the user on your broker application or invoke the URL on the user's behalf.

Follow up [Enabling custom identity broker access to the AWS console official guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_enable-console-custom-url.html)

[Example using python code](scripts/customer_idp_broker.py) to construct the URL

# Reference
[How do I assume an IAM role](https://aws.amazon.com/premiumsupport/knowledge-center/iam-assume-role-cli/)