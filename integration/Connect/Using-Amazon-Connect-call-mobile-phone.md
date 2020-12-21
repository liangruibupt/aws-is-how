# Use the Amazon Connect to call out the mobile phone

Amazon Connect is an easy to use omnichannel cloud contact center, which provides a seamless experience across voice and chat for your customers and agents. 

This demo will use the Amazon Connect to call out the mobile phone which invoked by lambda. The lambda can be trigged by different event source wuch as CloudWatch, SNS, etc.

![lambda-connect](media/lambda-connect.png)

## Configuration
1. Enable the Amazon Connect outbound calls, here I use the Tokyo region (ap-northeast-1) for demo.
![connect-callout-config](media/connect-callout-config.png)

2. Login your Amazon Connect dashboard with `Login URL` to configure the callout phone number and contact flow
![connect-login](media/connect-login.png)

3. Claim Phone number
![claim-phone-number](media/claim-phone-number.png)
![claim-phone-number2](media/claim-phone-number2.png)

4. Create the Lambda `InvokeAmazonConnect` with code [connect.py](scripts/connect.py)
- Python 3.8 runtime
- 30s timeout
- 128M memory
- In this demo, I use the AWS Secret Manager to store the AWS Global region credential with name `/prod/global/credential`. You need define it in China region with 2 key/value pair
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- Update the [connect.py](scripts/connect.py) with your Amazon Connect instance setting and call-out number. Please replace the values of `replace-with-*` parameters

At the top-left of your contact flow, under the `Name`, see the `Additional Information` section. 

- `DestinationPhoneNumber` = The phone number which you want to call out
- `ContactFlowId` = The contact flow ID is after the `contact-flow/` in the ARN string.
- `InstanceId` = The instance ID is the unique ID after `instance/` and before `contact-flow/` in the ARN string
- `SourcePhoneNumber` = The claimed phone number which used to place the call

![connect-flow-info](media/connect-flow-info.png)

5. Configure the Lambda function trigger event
- Event Bridge Event rule `Invoke-Global-Amazon-Connect-Event`
![event-bridge-rule](event-bridge-rule.png)
```json
{
  "source": [
    "ConnectEvent.alert"
  ]
}
```
- Set the Target as Lambda function `InvokeAmazonConnect`
![event-bridge-lambda](media/event-bridge-lambda.png)

![event-bridge-lambda2](media/event-bridge-lambda2.png)

- Fire sample Event
```bash
python scripts/put-sample-event.py
```

6. Testing the call-out, make sure the 

![connect-call-phone](media/connect-call-phone.png)


# Reference
[Using amazon-connect-callout](https://github.com/forhead/amazon-connect-callout)

[Automating outbound calling to customers using Amazon Connect](https://aws.amazon.com/blogs/contact-center/automating-outbound-calling-to-customers-using-amazon-connect/)

[Amazon Connect](https://aws.amazon.com/connect/)