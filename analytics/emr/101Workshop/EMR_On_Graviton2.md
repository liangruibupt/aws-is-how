# Creating EMR Cluster with Graviton2 instances
-  emr-6.1.0 
```bash
SUBNET_ID=subnet-091c41039340fd658

aws emr create-cluster --name graviton2-emr-cluster --use-default-roles --release-label emr-6.1.0 --instance-count 3 --instance-type c6g.2xlarge --applications  Name=Spark Name=Hadoop Name=Zeppelin --ec2-attributes SubnetIds=$SUBNET_ID,KeyName=ruiliang-lab-key-pair-cn-north1 --region cn-north-1

```

- emr-5.36.0 
```bash
SUBNET_ID=subnet-0cd4021f8055d2bc4

aws emr create-cluster --name graviton2-emr-cluster --use-default-roles --release-label emr-5.36.0 --instance-count 3 --instance-type c6g.2xlarge --applications  Name=Spark Name=Hadoop Name=Zeppelin --ec2-attributes SubnetIds=$SUBNET_ID,KeyName=ruiliang-lab-key-pair-cn-north1 --region cn-north-1

```