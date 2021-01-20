# Okta and AWS in the Browser

https://github.com/okta/okta-oidc-aws

Setup the IAM web identity federation (OpenID Connect) and Okta

- Integrating an AWS-backed JavaScript web application with Okta.
- Setting up properly scoped permissions for federated access to AWS APIs.
- Basic usage of the AWS SDK for JavaScript.
- After logging in, the user will get temporary AWS credentials and assume the pre-specified IAM (AWS Identity and Access Management) role whose policy allows uploading and listing objects in Amazon S3.

## Setting up Okta
1. Create an Okta OIDC App and get the Client ID for that app
2. Set up CORS in Okta

## Setting up AWS
1. Create an Amazon S3 bucket and [configure CORS](https://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html)
```json
[
  {
      "AllowedHeaders": [
          "*"
      ],
      "AllowedMethods": [
          "HEAD",
          "GET",
          "PUT",
          "POST",
      ],
      "AllowedOrigins": [
          "*"
      ],
      "ExposeHeaders": [
          "x-amz-meta-custom-header",
          "ETag"
      ],
      "MaxAgeSeconds": 3000
  }
]
```

2. Create an IAM OpenID Connect Provider
Follow up the guide [Creating OpenID Connect (OIDC) identity providers](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)

3. Create an IAM Role and Assign Users Logged in through Okta
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws-cn:s3:::YOUR_BUCKET_NAME/okta-${YOUR_OIDC_PROVIDER_URL:sub}/*"
            ],
            "Effect": "Allow"
        },
        {
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws-cn:s3:::YOUR_BUCKET_NAME"
            ],
            "Effect": "Allow",
            "Condition": {
                "StringEquals": {
                    "s3:prefix": "okta-${YOUR_OIDC_PROVIDER_URL:sub}"
                }
            }
        }
    ]
}
```

## Running the sample
1. Clone the repo
```bash
git clone https://github.com/okta/okta-oidc-aws.git
cd okta-oidc-aws 
```
2. Create [sample.html](scripts/sample.html)
```bash
vi sample.html
```

3. Run the sample html
```bash
python3 -m http.server 8000
```

visit http://localhost:8000/sample.html
