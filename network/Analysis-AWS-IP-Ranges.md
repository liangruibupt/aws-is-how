# Analysis the AWS IP address ranges

[AWS IP address ranges](https://docs.aws.amazon.com/general/latest/gr/aws-ip-ranges.html)

## Download the ip-ranges.json
```bash
wget https://ip-ranges.amazonaws.com/ip-ranges.json
```

## Analysis
1. Familiar with [syntax](https://docs.aws.amazon.com/general/latest/gr/aws-ip-ranges.html#aws-ip-syntax)

2. Filtering the JSON file
- Get the information for a specific Region
```bash
jq '.prefixes[] | select(.region=="cn-north-1")' < ip-ranges.json
```

- Get all IPv4 addresses for a specific service - CLOUDFRONT
```bash
## Details of CLOUDFRONT
jq -r '.prefixes[] | select(.service=="CLOUDFRONT") ' < ip-ranges.json

## Just for IP of CLOUDFRONT
jq -r '.prefixes[] | select(.service=="CLOUDFRONT") | .ip_prefix' < ip-ranges.json
```

- Get all IPv4 addresses for a specific service in a specific Region - GLOBALACCELERATOR
```bash
## Details for GLOBALACCELERATOR and in Irelan region: eu-west-1
jq -r '.prefixes[] | select(.region=="eu-west-1") | select(.service=="GLOBALACCELERATOR")' < ip-ranges.json

## Just for IP of GLOBALACCELERATOR and in Irelan region: eu-west-1
jq -r '.prefixes[] | select(.region=="eu-west-1") | select(.service=="GLOBALACCELERATOR") | .ip_prefix' < ip-ranges.json
```