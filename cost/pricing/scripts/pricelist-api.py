import boto3
import json
import pprint

# boto_sess = boto3.session.Session(region_name='us-east-1', profile_name='global_ruiliang')
# pricing = boto_sess.client('pricing', endpoint_url='https://api.pricing.us-east-1.amazonaws.com')

boto_sess = boto3.session.Session(profile_name='global_ruiliang')
pricing = boto_sess.client('pricing')

print("All Services")
print("============")
response = pricing.describe_services()
for service in response['Services']:
    print(service['ServiceCode'] + ": " + ", ".join(service['AttributeNames']))
print()


print("Selected EC2 Attributes & Values")
print("================================")
response = pricing.describe_services(ServiceCode='AmazonEC2')
attrs = response['Services'][0]['AttributeNames']

for attr in attrs:
    response = pricing.get_attribute_values(ServiceCode='AmazonEC2', AttributeName=attr)

    values = []
    for attr_value in response['AttributeValues']:
        values.append(attr_value['Value'])

    print("  " + attr + ": " + ", ".join(values))


print("Selected EC2 Products")
print("=====================")

response = pricing.get_products(
     ServiceCode='AmazonEC2',
     Filters = [
         {'Type' :'TERM_MATCH', 'Field':'operatingSystem', 'Value':'Windows'              },
         {'Type' :'TERM_MATCH', 'Field':'vcpu',            'Value':'64'                   },
         {'Type' :'TERM_MATCH', 'Field':'memory',          'Value':'256 GiB'              },
         {'Type' :'TERM_MATCH', 'Field':'preInstalledSw',  'Value':'SQL Ent'              },
         {'Type' :'TERM_MATCH', 'Field':'location',        'Value':'Asia Pacific (Tokyo)'}
     ],
     MaxResults=100
)

for price in response['PriceList']:
 pp = pprint.PrettyPrinter(indent=1, width=300)
 pp.pprint(json.loads(price))
 print()