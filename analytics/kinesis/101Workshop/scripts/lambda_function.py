import base64
from datetime import datetime
import time
import json
import boto3
import random
import uuid
import os

client = boto3.client('firehose')


def check_data(data):
    payload = json.loads(data)

    if payload['type'] == 'trip' and payload['pickup_longitude'] != 0 \
            and payload['pickup_latitude'] != 0 \
            and payload['dropoff_latitude'] != 0 \
            and payload['dropoff_longitude'] != 0:
        return True
    else:
        return False


def gen_retry_output_list(resp, outputRecList):
    recCount = 0
    retryOutputList = []
    for respRec in resp['RequestResponses']:
        try:
            respError = respRec['ErrorCode']
            if respError == 'ServiceUnavailableException':
                retryOutputList.append(outputRecList[recCount])
        except KeyError:
            pass
        recCount += 1

    return retryOutputList


def get_sleep_time(retryCount, exponentialBackoff, seed):

    if exponentialBackoff == True:
        return 2 * seed ** retryCount / 1000
    else:
        return 500 / 1000


def lambda_handler(event, context):
    print('Loading function' + ' ' +
          datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%fZ'))
    print('Processing {} record(s).'.format(len(event['Records'])))
    output = {}
    outputRecList = []
    retryOutputList = []
    numRetries = int(os.environ['number_of_retries'])
    retryCount = 1
    eventRecords = len(event['Records'])
    tripIds = []
    deliveryStreamName = os.environ['delivery_stream_name']
    seed = int(os.environ['exponential_backoff_seed'])
    exponentialBackoff = False

    for record in event['Records']:
        recordData = base64.b64decode(record['kinesis']['data'])
        recordDataJson = json.loads(recordData)
        if check_data(recordData):
            output['Data'] = recordData
            outputRecList.append(output)
            output = {}
            tripIds.append(recordDataJson['trip_id'])

    if len(outputRecList) > 0:

        resp = \
            client.put_record_batch(DeliveryStreamName=deliveryStreamName,
                                    Records=outputRecList)
    else:
        print('No records to send ...')
        return {'statusCode': 200,
                'body': json.dumps('Lambda successful!')}

    if resp['FailedPutCount'] != 0:
        print('Failed to process {} record(s).'.format(resp['FailedPutCount'
                                                            ]))

        if resp['FailedPutCount'] != eventRecords:

            while retryCount <= numRetries:

                print('Retrying {} failed records up to {} times with exponential backoff...'.format(resp['FailedPutCount'
                                                                                                          ], numRetries - (retryCount - 1)))
                retryOutputList = gen_retry_output_list(resp,
                                                        outputRecList)
                if len(retryOutputList) > 0:
                    exponentialBackoff = True
                    print('Backing Off for {} seconds ...'.format(get_sleep_time(retryCount,
                                                                                 exponentialBackoff, seed)))
                    time.sleep(get_sleep_time(retryCount,
                                              exponentialBackoff, seed))

                    retryResp = \
                        client.put_record_batch(DeliveryStreamName=deliveryStreamName,
                                                Records=retryOutputList)

                    if retryResp['FailedPutCount'] == 0:
                        print(
                            'Retry successful after {} tries ...'.format(retryCount))

                        return {'statusCode': 200,
                                'body': json.dumps('Lambda successful!'
                                                   )}

                    retryCount += 1
                    outputRecList = retryOutputList
                    retryOutputList = []
                    resp = retryResp
                    print(resp['RequestResponses'])
                else:
                    print('Potential non-retriable errors.')
                    print(resp['RequestResponses'])
                    break

            print(
                'All retries unsuccessful. Letting Lambda retry but there could be duplicates ...')
            raise Exception('Records could not be sent. Lambda to retry ...'
                            )
        else:
            print('Since all records failed, letting Lambda retry..')
            print(tripIds)
            print(resp['RequestResponses'])
            raise Exception('Records could not be sent. Lambda to retry ...'
                            )
    else:
        print('Records successfully sent ...')
        return {'statusCode': 200,
                'body': json.dumps('Lambda successful!')}
