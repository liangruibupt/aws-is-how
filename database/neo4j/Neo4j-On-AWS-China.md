## Start from docker
[docker-run-neo4j](https://neo4j.com/developer/docker-run-neo4j/)

```bash
docker run \
    --name testneo4j \
    -p7474:7474 -p7687:7687 \
    -d \
    -v $HOME/neo4j/data:/data \
    -v $HOME/neo4j/logs:/logs \
    -v $HOME/neo4j/import:/var/lib/neo4j/import \
    -v $HOME/neo4j/plugins:/plugins \
    --env NEO4J_AUTH=neo4j/test \
    neo4j:4.0.3

docker-compose up
docker-compose down

```

## Install Standalone from Cloudfromation
```bash
VERSION=3.5.3
export COMMUNITY_TEMPLATE=http://neo4j-cloudformation.s3.amazonaws.com/neo4j-community-standalone-stack-$VERSION.jsonexport STACKNAME=neo4j-comm-$(echo $VERSION | sed s/[^A-Za-z0-9]/-/g)export INSTANCE=r4.large
export REGION=us-east-1
export SSHKEY=my-ssh-keyname
aws cloudformation create-stack \
   --stack-name $STACKNAME \
   --region $REGION \
   --template-url $COMMUNITY_TEMPLATE \
   --parameters ParameterKey=InstanceType,ParameterValue=$INSTANCE \
     ParameterKey=NetworkWhitelist,ParameterValue=0.0.0.0/0 \
     ParameterKey=Password,ParameterValue=s00pers3cret \
     ParameterKey=SSHKeyName,ParameterValue=$SSHKEY \
     ParameterKey=VolumeSizeGB,ParameterValue=37 \
     ParameterKey=VolumeType,ParameterValue=gp2 \
     --capabilities CAPABILITY_NAMED_IAM

aws cloudformation wait stack-create-complete --region $REGION --stack-name "$STACKNAME"

aws cloudformation describe-stacks --region $REGION --stack-name "$STACKNAME" | jq -r '.Stacks[0].Outputs[]'

https://instance-ip-address:7473/

echo "Deleting stack $1"
aws cloudformation delete-stack --stack-name "$1" --region us-east-1
```

The username will be neo4j, and the password will be the instance ID.

## Install causal cluster (Enterprise Edition)
- In AWS global region, Enterprise Causal Cluster 3.5.16 by [cloudformation](database/neo4j/script/enterpise/Neo4j-Causal-Cluster-3.5.16.template)

- Enterprise Causal Cluster 4.0-enterprise via docker-compose
  1. Creates a five instance cluster with four core containers and one read replica container.
  2. Neo4j Browser to access the core1 instance on port 7474 or setup the load balancer for master route to 7474 backend port.
  3. Open ports 7474, 6477, 7687; 7475, 6478, 7688; 7476, 6479, 7689; 7477, 6480, 7690; 7978, 6481, 7691 and 5000

- Enterprise Causal Cluster 4.0-enterprise via distribute EC2 instance
Each EC2 instance Open ports 7474, 7687, 5000, 6000, 7000
Public-address is the public ip-address of the EC2 instance. If you use the private subnet, you can use the private ip-address of the EC2 instance.
```bash
docker run --name=neo4j-core --detach \
         --network=host \
         --publish=7474:7474 --publish=7687:7687 \
         --publish=5000:5000 --publish=6000:6000 --publish=7000:7000 \
         --hostname=public-address \
         --env NEO4J_dbms_mode=CORE \
         --env NEO4J_causal__clustering_expected__core__cluster__size=3 \
         --env NEO4J_causal__clustering_initial__discovery__members=core1-public-address:5000,core2-public-address:5000,core3-public-address:5000 \
         --env NEO4J_causal__clustering_discovery__advertised__address=public-address:5000 \
         --env NEO4J_causal__clustering_transaction__advertised__address=public-address:6000 \
         --env NEO4J_causal__clustering_raft__advertised__address=public-address:7000 \
         --env NEO4J_dbms_connectors_default__advertised__address=public-address \
         --env NEO4J_ACCEPT_LICENSE_AGREEMENT=yes \
         --env NEO4J_dbms_connector_bolt_advertised__address=public-address:7687 \
         --env NEO4J_dbms_connector_http_advertised__address=public-address:7474 \
         neo4j:4.0-enterprise
```
