# How to get the spot instance price by AWS CLI

```bash
aws --region=ap-northeast-2 ec2 describe-spot-price-history --instance-types c4.large --start-time=$(date +%s) --product-descriptions="Linux/UNIX" --query 'SpotPriceHistory[*].{az:AvailabilityZone, price:SpotPrice}'
```