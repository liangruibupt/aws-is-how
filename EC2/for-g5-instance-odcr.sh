#!/bin/bash

# Set your AWS credentials
AWS_ACCESS_KEY_ID="***"
AWS_SECRET_ACCESS_KEY="***"
AWS_REGION="cn-north-1"

# Set the EC2 instance configuration
INSTANCE_TYPE="g5.2xlarge"
AVAILABILITY_ZONE="cn-north-1a"

while true; do
    # Create the EC2 instance
    odcr_id=$(aws ec2 create-capacity-reservation \
        --instance-type $INSTANCE_TYPE \
        --availability-zone $AVAILABILITY_ZONE \
        --instance-count 1 \
        --instance-platform Linux/UNIX \
        --instance-match-criteria targeted \
        --query 'CapacityReservation.CapacityReservationId' \
        --output text)


    echo "Created EC2 ODCR: $odcr_id"

    # Wait for 5 minutes
    sleep 300
done
