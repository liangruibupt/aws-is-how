# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#!/bin/bash
DIR=$(dirname $(realpath $0))
echo "DIR=$DIR"
POLICY_NAME=bridgeMQTT
REGION_NAME=cn-north-1
echo 'get-policy'
aws iot get-policy --policy-name $POLICY_NAME --region $REGION_NAME > /dev/null 2>&1
rv=$?
echo "get-policy rv=$rv"
if [ $rv -ne 0 ]; then
    echo 'create policy'
    aws iot create-policy --region $REGION_NAME --policy-name $POLICY_NAME --policy-document '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Action": "iot:*","Resource": "*"}]}'
    sleep 2
fi
echo 'create-keys-and-certificate'
TMP_FILE=$(mktemp)
echo "TMP_FILE=$TMP_FILE"
aws iot create-keys-and-certificate --region $REGION_NAME --set-as-active \
    --certificate-pem-outfile /etc/mosquitto/certs/cert.crt \
    --private-key-outfile /etc/mosquitto/certs/private.key \
    --public-key-outfile /etc/mosquitto/certs/public.key \
    --output json > $TMP_FILE
CERTIFICATE_ARN=$(jq -r ".certificateArn" $TMP_FILE)
CERTIFICATE_ID=$(jq -r ".certificateId" $TMP_FILE)
echo "CERTIFICATE_ID=$CERTIFICATE_ID CERTIFICATE_ARN=$CERTIFICATE_ARN"
echo "CERTIFICATE_ID=$CERTIFICATE_ID" > /etc/mosquitto/certs/cert-id.txt
echo 'attach-principal-policy'
aws iot attach-principal-policy --region $REGION_NAME --policy-name bridgeMQTT --principal $CERTIFICATE_ARN
chmod 644 /etc/mosquitto/certs/private.key
chmod 644 /etc/mosquitto/certs/cert.crt
rm -f $TMP_FILE
exit 0
