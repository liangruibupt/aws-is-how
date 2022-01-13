# Cluster Expansion 

- Add brokers to cluster and re-assign partition
- **Storage scaling**

# MSK Cluster Storage Expansion Lab

When MSK Cluster starts to retain data and you can see the data volume usage grow in CloudWatch monitoring. The storage can be scaled up in your Amazon MSK cluster to meet data growth and retention requirements.

- You can also set retention on a per topic basis. If you have some topics you only need short retention on, go ahead and lower it on a per topic basis to save some space.
- When cluster running out of disk space well. Brokers will safely shut down and will not restart until there is enough disk space to safely start again.
- Setup Cloudwatch alarms (or other monitoring) for your cluster or brokers are getting low on disk space.
- You can only expand the disk on the brokers the same amount on every broker. 
- There will be additional charges for the additional storage.
- **Note that you can only increase the amount of storage, you can't decrease it.**

## Prerequest
- This Lab requires you to have completed the Cluster Creation Lab
- Check ther cluster Storage: EBS storage volume per broker

## Modify EBS storage volume per broker using the CLI or AWS Console
```bash
aws kafka describe-cluster --cluster-arn $CLUSTER_ARN --output json | | jq '.ClusterInfo.BrokerNodeGroupInfo.StorageInfo'
{
  "EbsStorageInfo": {
    "VolumeSize": 100
  }
}

CLUSTER_VERSION=$(aws kafka describe-cluster --cluster-arn $CLUSTER_ARN --output json | jq ".ClusterInfo.CurrentVersion" | tr -d \")

CLUSTER_OPERATION_ARN=$(aws kafka update-broker-storage --cluster-arn $CLUSTER_ARN --current-version $CLUSTER_VERSION --target-broker-ebs-volume-info '{"KafkaBrokerNodeId": "All", "VolumeSizeGB": 200}' | jq ".ClusterOperationArn" | tr -d \") 
echo $ClusterOperationArn

# Waite until OperationState=UPDATE_COMPLETE
aws kafka describe-cluster-operation --cluster-operation-arn $CLUSTER_OPERATION_ARN | jq ".ClusterOperationInfo | (.OperationState,.OperationType,.TargetClusterInfo)"

aws kafka describe-cluster --cluster-arn $CLUSTER_ARN --output json | jq '.ClusterInfo.BrokerNodeGroupInfo.StorageInfo'
{
  "EbsStorageInfo": {
    "VolumeSize": 200
  }
}
```

## Reference
[Scaling up broker storage](https://docs.aws.amazon.com/msk/latest/developerguide/msk-update-storage.html)