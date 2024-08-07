#!/usr/bin/env python3

import argparse
import boto3
import datetime

parser = argparse.ArgumentParser()
parser.add_argument('--days', type=int, default=30)
args = parser.parse_args()


now = datetime.datetime.utcnow()
start = (now - datetime.timedelta(days=args.days)).strftime('%Y-%m-%d')
end = now.strftime('%Y-%m-%d')

ce = boto3.client('ce', 'cn-northwest-1')

results = []

token = None
while True:
    if token:
        kwargs = {'NextPageToken': token}
    else:
        kwargs = {}
    tags = ce.get_tags(TimePeriod={'Start': start, 'End':  end},
    **kwargs)
    print(tags)
    data = ce.get_cost_and_usage(
        TimePeriod={'Start': start, 'End':  end},
        Granularity='DAILY',
        Filter={"And": [
            {'Dimensions': {'Key': 'USAGE_TYPE', 'Values': ['CNN1-DataTransfer-Out-Bytes', 'CNW1-DataTransfer-Out-Bytes',
                                                            'CNN1-DataTransfer-Regional-Bytes', 'CNW1-DataTransfer-Regional-Bytes', 'CN-DataTransfer-Out-Bytes']}},
            {'Tags': {'Key': 'Name', 'Values': [
                'C9', 'mysql56', 'mysql8', 'ray-demo-tool', 'ray-demo-tools']}}
        ]
        },
        Metrics=['UnblendedCost'],
        GroupBy=[{'Type': 'DIMENSION', 'Key': 'LINKED_ACCOUNT'}, {'Type': 'DIMENSION', 'Key': 'SERVICE'}], **kwargs)
    results += data['ResultsByTime']
    token = data.get('NextPageToken')
    if not token:
        break

print('\t'.join(['TimePeriod', 'LinkedAccount',
                 'Service', 'Amount', 'Unit', 'Estimated']))
for result_by_time in results:
    for group in result_by_time['Groups']:
        amount = group['Metrics']['UnblendedCost']['Amount']
        unit = group['Metrics']['UnblendedCost']['Unit']
        print(result_by_time['TimePeriod']['Start'], '\t', '\t'.join(
            group['Keys']), '\t', amount, '\t', unit, '\t', result_by_time['Estimated'])
