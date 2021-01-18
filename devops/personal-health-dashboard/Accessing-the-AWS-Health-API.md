# Accessing the AWS Health API

AWS Health is a RESTful web service that uses HTTPS to retrive data as JSON. Your application code can make requests directly to the AWS Health API. 

When you use the REST API directly, you must write the necessary code to sign and authenticate your requests.

[The AWS Health API](https://docs.amazonaws.cn/en_us/health/latest/ug/health-api.html#endpoints) follows a multi-Region application architecture and has two regional endpoints in an active-passive configuration. To support active-passive DNS failover, AWS Health provides a single, global endpoint. You can determine the active endpoint and corresponding signing Region by performing a DNS lookup on the global endpoint. 

```bash
# Global region
dig global.health.amazonaws.com | grep CNAME

# China region
dig global.health.amazonaws.com.cn  | grep CNAME
```

## Using the high availability endpoint demo 

[Using the Java demo](https://docs.amazonaws.cn/en_us/health/latest/ug/health-api.html#using-the-java-sample-code)

[Using the Python demo](https://docs.amazonaws.cn/en_us/health/latest/ug/health-api.html#using-the-python-code)

## Using the Python demo

[Set the AWS credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html)

```bash
git clone https://github.com/aws/aws-health-tools.git
cd aws-health-tools/high-availability-endpoint/python
pip3 install virtualenv
virtualenv -p python3 v-aws-health-env
python3 -m venv v-aws-health-env
source v-aws-health-env/bin/activate
pip3 install -r requirements.txt

aws sts get-session-token \
    --duration-seconds 900

export AWS_ACCESS_KEY_ID="Copy Paste AccessKeyId"
export AWS_SECRET_ACCESS_KEY="Copy Paste SecretAccessKey"
export AWS_SESSION_TOKEN="Copy Paste SessionToken"

# Modify the /aws-health-tools/high-availability-endpoint/python/region_lookup.py
qname = 'global.health.amazonaws.com.cn'


python3 main.py

deactivate
```

## Using boto3 API
```bash
python3 health-demo.py
```