# Cluster Expansion 

- **Add brokers to cluster and re-assign partition**
- Storage scaling

# Adding brokers to your Amazon MSK cluster

After you add the brokers to your Amazon MSK cluster, you will run the partition reassignment, and it will move some of the partitions on to the new brokers so they are carrying traffic - rebalancing partitions.

Note:
- With Amazon MSK you can only scale in units that match your number of deployed AZs - if you deploy with 3 AZs, you can only scale up by 3 brokers at a time

- When you add brokers, they will be idle until you assign partitions from the existing brokers to the new brokers, or add new topics. 

Each broker is assigned partitions, and producers write data to partitions. Thus if partitions are not mapped to brokers, brokers cannot accept, send or fetch requests from clients.

- Migrating partitions will take time while data is replicated to the new brokers, and could impact the performance of the cluster
    - Don’t do this while under full load in production
    - You can rate limit replication to limit the risk of this

- You must use the MSK tools (Console, CLI) to do this - do not do it directly by building brokers and updating ZK. 

- There is no need to directly manage the Zookeeper cluster within your MSK deployment.

## Preparation for cluster expansion

Please finish the [Cluster-creation](Cluster-creation.md) section

- Create the Topics with 10 partitions
```bash
cd kafka_2.12-2.2.1/
bin/kafka-topics.sh --create --zookeeper $ZookeeperConnectString --topic test10 --partitions 10 --replication-factor 3
```

- From console to add the new brokers

Edit the total number of brokers you want to have in each availability zone and select Save Changes

- By CLI to add the new brokers
```bash
CLUSTER_VERSION=$(aws kafka describe-cluster --cluster-arn $ClusterArn --output json --region us-west-2 | jq ".ClusterInfo.CurrentVersion" | tr -d \")
echo $CLUSTER_VERSION

aws kafka describe-cluster --cluster-arn $ClusterArn --output json --region us-west-2 | jq ".ClusterInfo.NumberOfBrokerNodes"
3

ClusterOperationArn=$(aws kafka update-broker-count --cluster-arn $ClusterArn --current-version $CLUSTER_VERSION --target-number-of-broker-nodes 6 --region us-west-2 | jq ".ClusterOperationArn" | tr -d \")
echo $ClusterOperationArn

# Waite until OperationState=UPDATE_COMPLETE
aws kafka describe-cluster-operation --cluster-operation-arn  $ClusterOperationArn --output json --region us-west-2 | jq ".ClusterOperationInfo | (.OperationState,.OperationType,.TargetClusterInfo)"
```

You can now reassign partitions to the new brokers.

## Re-assign partitions after changing cluster size
- Generate a list of topics that you want to move
```bash
bin/kafka-topics.sh --zookeeper $ZookeeperConnectString --describe --topic test10
Topic:test10    PartitionCount:10       ReplicationFactor:3     Configs:
        Topic: test10   Partition: 0    Leader: 3       Replicas: 3,2,1 Isr: 3,2,1
        Topic: test10   Partition: 1    Leader: 2       Replicas: 2,1,3 Isr: 2,1,3
        Topic: test10   Partition: 2    Leader: 1       Replicas: 1,3,2 Isr: 1,3,2
        Topic: test10   Partition: 3    Leader: 3       Replicas: 3,1,2 Isr: 3,1,2
        Topic: test10   Partition: 4    Leader: 2       Replicas: 2,3,1 Isr: 2,3,1
        Topic: test10   Partition: 5    Leader: 1       Replicas: 1,2,3 Isr: 1,2,3
        Topic: test10   Partition: 6    Leader: 3       Replicas: 3,2,1 Isr: 3,2,1
        Topic: test10   Partition: 7    Leader: 2       Replicas: 2,1,3 Isr: 2,1,3
        Topic: test10   Partition: 8    Leader: 1       Replicas: 1,3,2 Isr: 1,3,2
        Topic: test10   Partition: 9    Leader: 3       Replicas: 3,1,2 Isr: 3,1,2

cat topics-to-move.json
{
  "topics": [
    {
      "topic": "test10"
    }
  ],
  "version": 1
}
```
- Use kafka-reassign-partitions tool to generate a reassignment template
```bash
bin/kafka-reassign-partitions.sh --zookeeper $ZookeeperConnectString --topics-to-move-json-file topics-to-move.json --broker-list "1,2,3,4,5,6" --generate

# save the Proposed partition reassignment configuration into expand-cluster-reassignment.json
cat expand-cluster-reassignment.json | jq "."

{"version":1,"partitions":[{"topic":"test10","partition":5,"replicas":[3,5,2],"log_dirs":["any","any","any"]},{"topic":"test10","partition":2,"replicas":[4,1,6],"log_dirs":["any","any","any"]},{"topic":"test10","partition":7,"replicas":[1,3,2],"log_dirs":["any","any","any"]},{"topic":"test10","partition":4,"replicas":[5,6,3],"log_dirs":["any","any","any"]},{"topic":"test10","partition":1,"replicas":[1,2,4],"log_dirs":["any","any","any"]},{"topic":"test10","partition":9,"replicas":[6,1,4],"log_dirs":["any","any","any"]},{"topic":"test10","partition":6,"replicas":[2,5,3],"log_dirs":["any","any","any"]},{"topic":"test10","partition":0,"replicas":[2,3,1],"log_dirs":["any","any","any"]},{"topic":"test10","partition":3,"replicas":[6,4,5],"log_dirs":["any","any","any"]},{"topic":"test10","partition":8,"replicas":[4,2,1],"log_dirs":["any","any","any"]}]}
```

- Execuate the template and start the reassignment
```bash
bin/kafka-reassign-partitions.sh --zookeeper $ZookeeperConnectString --reassignment-json-file expand-cluster-reassignment.json --execute

Current partition replica assignment

{"version":1,"partitions":[{"topic":"test10","partition":8,"replicas":[1,3,2],"log_dirs":["any","any","any"]},{"topic":"test10","partition":2,"replicas":[1,3,2],"log_dirs":["any","any","any"]},{"topic":"test10","partition":5,"replicas":[1,2,3],"log_dirs":["any","any","any"]},{"topic":"test10","partition":3,"replicas":[3,1,2],"log_dirs":["any","any","any"]},{"topic":"test10","partition":9,"replicas":[3,1,2],"log_dirs":["any","any","any"]},{"topic":"test10","partition":6,"replicas":[3,2,1],"log_dirs":["any","any","any"]},{"topic":"test10","partition":0,"replicas":[3,2,1],"log_dirs":["any","any","any"]},{"topic":"test10","partition":7,"replicas":[2,1,3],"log_dirs":["any","any","any"]},{"topic":"test10","partition":4,"replicas":[2,3,1],"log_dirs":["any","any","any"]},{"topic":"test10","partition":1,"replicas":[2,1,3],"log_dirs":["any","any","any"]}]}

Save this to use as the --reassignment-json-file option during rollback
Successfully started reassignment of partitions.
```

- Monitor the status of the reassignment
```bash
bin/kafka-reassign-partitions.sh --zookeeper $ZookeeperConnectString --reassignment-json-file expand-cluster-reassignment.json --verify

Status of partition reassignment: 
Reassignment of partition test10-8 completed successfully
Reassignment of partition test10-2 completed successfully
Reassignment of partition test10-5 completed successfully
Reassignment of partition test10-3 completed successfully
Reassignment of partition test10-9 completed successfully
Reassignment of partition test10-6 completed successfully
Reassignment of partition test10-0 completed successfully
Reassignment of partition test10-7 completed successfully
Reassignment of partition test10-4 completed successfully
Reassignment of partition test10-1 completed successfully

bin/kafka-topics.sh --zookeeper $ZookeeperConnectString --describe --topic test10

Topic:test10    PartitionCount:10       ReplicationFactor:3     Configs:
        Topic: test10   Partition: 0    Leader: 3       Replicas: 2,3,1 Isr: 3,2,1
        Topic: test10   Partition: 1    Leader: 2       Replicas: 1,2,4 Isr: 2,1,4
        Topic: test10   Partition: 2    Leader: 1       Replicas: 4,1,6 Isr: 1,6,4
        Topic: test10   Partition: 3    Leader: 6       Replicas: 6,4,5 Isr: 5,6,4
        Topic: test10   Partition: 4    Leader: 5       Replicas: 5,6,3 Isr: 5,6,3
        Topic: test10   Partition: 5    Leader: 3       Replicas: 3,5,2 Isr: 2,3,5
        Topic: test10   Partition: 6    Leader: 3       Replicas: 2,5,3 Isr: 3,2,5
        Topic: test10   Partition: 7    Leader: 2       Replicas: 1,3,2 Isr: 2,1,3
        Topic: test10   Partition: 8    Leader: 1       Replicas: 4,2,1 Isr: 1,2,4
        Topic: test10   Partition: 9    Leader: 6       Replicas: 6,1,4 Isr: 1,6,4
```

- Rollback

Note that this only rolls back the partition assignment - it does not roll back the broker creation/addition to the cluster.

```bash

bin/kafka-reassign-partitions.sh --zookeeper $ZookeeperConnectString --reassignment-json-file current-cluster-reassignment.json --execute

Save this to use as the --reassignment-json-file option during rollback
Successfully started reassignment of partitions.

cat current-cluster-reassignment.json
{"version":1,"partitions":[{"topic":"test10","partition":8,"replicas":[1,3,2],"log_dirs":["any","any","any"]},{"topic":"test10","partition":2,"replicas":[1,3,2],"log_dirs":["any","any","any"]},{"topic":"test10","partition":5,"replicas":[1,2,3],"log_dirs":["any","any","any"]},{"topic":"test10","partition":3,"replicas":[3,1,2],"log_dirs":["any","any","any"]},{"topic":"test10","partition":9,"replicas":[3,1,2],"log_dirs":["any","any","any"]},{"topic":"test10","partition":6,"replicas":[3,2,1],"log_dirs":["any","any","any"]},{"topic":"test10","partition":0,"replicas":[3,2,1],"log_dirs":["any","any","any"]},{"topic":"test10","partition":7,"replicas":[2,1,3],"log_dirs":["any","any","any"]},{"topic":"test10","partition":4,"replicas":[2,3,1],"log_dirs":["any","any","any"]},{"topic":"test10","partition":1,"replicas":[2,1,3],"log_dirs":["any","any","any"]}]}

bin/kafka-reassign-partitions.sh --zookeeper $ZookeeperConnectString --reassignment-json-file current-cluster-reassignment.json --verify
Status of partition reassignment: 
Reassignment of partition test10-8 completed successfully
Reassignment of partition test10-2 completed successfully
Reassignment of partition test10-5 completed successfully
Reassignment of partition test10-3 completed successfully
Reassignment of partition test10-9 completed successfully
Reassignment of partition test10-6 completed successfully
Reassignment of partition test10-0 completed successfully
Reassignment of partition test10-7 completed successfully
Reassignment of partition test10-4 completed successfully
Reassignment of partition test10-1 completed successfully

bin/kafka-topics.sh --zookeeper $ZookeeperConnectString --describe --topic test10

Topic:test10    PartitionCount:10       ReplicationFactor:3     Configs:
        Topic: test10   Partition: 0    Leader: 2       Replicas: 3,2,1 Isr: 3,2,1
        Topic: test10   Partition: 1    Leader: 1       Replicas: 2,1,3 Isr: 2,1,3
        Topic: test10   Partition: 2    Leader: 1       Replicas: 1,3,2 Isr: 1,2,3
        Topic: test10   Partition: 3    Leader: 3       Replicas: 3,1,2 Isr: 1,2,3
        Topic: test10   Partition: 4    Leader: 2       Replicas: 2,3,1 Isr: 1,2,3
        Topic: test10   Partition: 5    Leader: 3       Replicas: 1,2,3 Isr: 2,3,1
        Topic: test10   Partition: 6    Leader: 2       Replicas: 3,2,1 Isr: 3,2,1
        Topic: test10   Partition: 7    Leader: 1       Replicas: 2,1,3 Isr: 2,1,3
        Topic: test10   Partition: 8    Leader: 1       Replicas: 1,3,2 Isr: 1,2,3
        Topic: test10   Partition: 9    Leader: 3       Replicas: 3,1,2 Isr: 1,2,3
```

- Scale in

Note: UpdateBrokerCount operation: The number of broker nodes cannot be reduced.