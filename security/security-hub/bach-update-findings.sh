#!/bin/bash

findingsID=$(aws securityhub get-findings --filters '{"AwsAccountId":[{"Value": "876820548815","Comparison":"EQUALS"}],"WorkflowStatus": [{"Value":"RESOLVED","Comparison":"NOT_EQUALS"}]}' --max-items 50 --region cn-north-1 | jq '.Findings[].Id')

for FINDING_ID in ${findingsID}
do
  echo ${FINDING_ID}
  aws securityhub batch-update-findings \
    --finding-identifiers Id=${FINDING_ID},ProductArn="arn:aws-cn:securityhub:cn-north-1::product/aws/securityhub" \
    --note '{"Text": "Known issue that is not a risk.", "UpdatedBy": "YOUR_USER"}' \
    --severity '{"Label": "LOW"}' --workflow '{"Status": "RESOLVED"}' \
    --region cn-north-1
done


