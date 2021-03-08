import boto3
import json
import os

sm_client = boto3.client('runtime.sagemaker')
iot_client = boto3.client('iot-data')
sns_client = boto3.client('sns')

#修改成自己的Sagemaker Endpoint Name
ENDPOINT_NAME = 'xgboost-2021-02-22-09-57-18-807'

CURRENT_REGION = os.environ["AWS_REGION"]

#修改成自己的SNS Topic
SNS_TOPIC_ARN = 'arn:aws-cn:sns:cn-northwest-1:account-id:NotifyMe'

#修改成自己的手机号
PHONE_NUMBER = '+8613901092048'

def lambda_handler(event, context):
    
    print("Received event: " + json.dumps(event))
    
    wind_speed = str(event['wind_speed'])
    RPM_blade = str(event['RPM_blade'])
    oil_temperature = str(event['oil_temperature'])
    oil_level = str(event['oil_level'])
    temperature = str(event['temperature'])
    humidity = str(event['humidity'])
    vibrations_frequency = str(event['vibrations_frequency'])
    pressure = str(event['pressure'])
    wind_direction = str(event['wind_direction'])
    
    seperator = ","
    payload_list = (wind_speed,RPM_blade,oil_temperature,oil_level,temperature,humidity,vibrations_frequency,pressure,wind_direction)
    payload = seperator.join(payload_list)
    print(payload)

    
    response = sm_client.invoke_endpoint(EndpointName=ENDPOINT_NAME,
                                       ContentType='text/csv',
                                       Body=payload)
    print("Response: " +str(response))
    
    result = json.loads(response['Body'].read().decode())
    print("Result: " +str(result))
    
    if result > 0.85:
        prediction_value = 1
    else: 
        prediction_value = 0
    
    print ("Prediction Value: " +str(prediction_value))
 
    if str(prediction_value) == '1':
        print ("Identified Failure..")
        device_state = {"state" : { "desired" : { "switch" : "off" }}}
        shadow_payload = json.dumps(device_state)

        response = iot_client.publish(
            # 修改成自己的IoT Topic
            topic ='$aws/things/windturbine/shadow/update',
            qos = 1,
            payload = shadow_payload
        )
        
        if (CURRENT_REGION == 'cn-north-1' or CURRENT_REGION == 'cn-northwest-1'):
            response = sns_client.publish(
                # 修改成自己的SNS Topic
                TopicArn = SNS_TOPIC_ARN, 
                Message = 'A device is about to be failed',
                Subject = 'Real Time Prediction'
            )
        else:
            response = sns_client.publish(
                # 修改成自己的手机号
                PhoneNumber = PHONE_NUMBER, 
                Message = 'A device is about to be failed',
                Subject = 'Real Time Prediction'
            )


    return "success"


