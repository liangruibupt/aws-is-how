#!/bin/bash

standardsArn=$(aws securityhub get-enabled-standards --region cn-north-1 | jq '.StandardsSubscriptions[].StandardsSubscriptionArn')

for StandardsSubscriptionARN in ${standardsArn}
do
  #echo ${StandardsSubscriptionARN}
  SubscriptionARN=`echo ${StandardsSubscriptionARN} | tr -d '"'`
  echo ${SubscriptionARN}
  standardsControls=$(aws securityhub describe-standards-controls --standards-subscription-arn ${SubscriptionARN} --max-results 20 --region cn-north-1 | jq '.Controls[].StandardsControlArn')
  for standardsControlARN in ${standardsControls} 
  do
    #echo ${standardsControlARN}
    ControlARN=`echo ${standardsControlARN} | tr -d '"'`
    echo ${ControlARN}
    aws securityhub update-standards-control \
    --standards-control-arn ${ControlARN} \
    --control-status "DISABLED" --disabled-reason "Not applicable for my service" \
    --region cn-north-1
  done
done