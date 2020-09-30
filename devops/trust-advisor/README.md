# How to make the Trust Advisor Check automatically?

Trust Advisor help identify the baseline issue of below 5 pillars. There is no additional charge for Trust Advisor execution.

![5 pillars](media/pillars.png)

Make sure 
1. customers with a Business or Enterprise support plan
2. The lambda execution role has the `trustedadvisor` permission

## Refresh Function RefereshTrustedAdvisor

Invoke the Trust Advisor API to trigger the Check [referesh-trusted-advisor.py](script/referesh-trusted-advisor.py)

- Runtime: Python 3.8
- Memory: 128MB
- Timeout: 60 seconds

## Report Function TrustedAdvisorReport

Get the Trust Advisor report and sent out via email to receiver [get-trusted-advisor-report.py](script/get-trusted-advisor-report.py)

- Runtime: Python 3.8
- Memory: 256MB
- Timeout: 120 seconds
- Env variable: TO_EMAIL and FROM_EMAIL for sender email and receiver email

## Step Function

Integrate 2 function and automatically triggered by Amazon EventBridge (CloudWatch Events)

Sample step function define:

[step-function.json](script/step-function.json)

# Reference
[Using Trusted Advisor as a web service](https://docs.aws.amazon.com/awssupport/latest/user/trustedadvisor.html)