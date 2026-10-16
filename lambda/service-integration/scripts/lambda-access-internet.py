import json
import urllib
import boto3
import requests

s3 = boto3.client('s3')

def lambda_handler(event, context):
    # TODO implement
    input_str = event.get('data')
    print(input_str )
    webUrl  = urllib.request.urlopen('https://www.baidu.com')
    print ("result code: " + str(webUrl.getcode()))
    data = webUrl.read()
    #print (data)
    myip = requests.get('http://checkip.amazonaws.com').text.rstrip()
    print(myip)
    apigw_url = 'https://mbak6j9owc.execute-api.cn-north-1.amazonaws.com.cn/dev/pets/1'
    webUrl  = urllib.request.urlopen(apigw_url)
    print ("api gateway result code: " + str(webUrl.getcode()))
    data = webUrl.read()
    res_body = '我们返回的结果是，谢谢@！。？ {}'.format(myip)
    print (res_body)
    return {
        'statusCode': 200,
        'body': res_body
    }
