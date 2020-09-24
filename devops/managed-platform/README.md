# AWS DevOps Management Observability workshop

1. Provide timely and effective monitoring and response.
2. Gain insights for the application, development, and operations.

The fully hands on lab guide can be found in https://reinvent2019.aws-management.tools/mgt306/en/introduction.html and source code can be found in https://github.com/aws-samples/reinvent2018-dev303-code

Workshop Modules for  AWS DevOps observability capabilities

1. Configure an EKS micro-service application with CloudWatch & X-Ray integration
2. Create a Cross-Account, Cross-Region Dashboard
3. Create Sythentic Canary tests
4. Use ServiceLens to identify operational issues
5. Create Contributor Insight Rules to identify “top contributors”
6. Create custom metrics from Lambda functions with Embedded Metric Format


## Configure an EKS micro-service application
1. Create EKS Cluster

```bash
eksctl create cluster \
--name observability-workshop \
--version 1.17 \
--region eu-west-1 \
--nodegroup-name linux-nodes \
--nodes 4 --nodes-min 1 --nodes-max 4 \
--ssh-access --ssh-public-key ruiliang-keypair-eu-west1 \
--managed

kubectl get nodes
NAME                                           STATUS   ROLES    AGE   VERSION
ip-192-168-20-121.eu-west-1.compute.internal   Ready    <none>   66m   v1.14.8-eks-b8860f
ip-192-168-52-200.eu-west-1.compute.internal   Ready    <none>   66m   v1.14.8-eks-b8860f
ip-192-168-54-32.eu-west-1.compute.internal    Ready    <none>   66m   v1.14.8-eks-b8860f
ip-192-168-68-139.eu-west-1.compute.internal   Ready    <none>   66m   v1.14.8-eks-b8860f
```

2. Deploy “AnyCompany Shop” microservices application

- Deploy Resources
```bash
aws cloudformation create-stack \
--stack-name observability-workshop \
--template-url https://s3.amazonaws.com/aws-tracing-workshop-artifacts/cloudformation.yaml --capabilities CAPABILITY_NAMED_IAM --region eu-west-1

aws cloudformation wait stack-create-complete --stack-name observability-workshop

git clone https://github.com/aws-samples/reinvent2018-dev303-code.git

cd reinvent2018-dev303-code/
sed -i 's/us-west-2/eu-west-1/g' deploy/eks/prep.yaml
kubectl create -f deploy/eks/prep.yaml
```

- Prepare and deploy credentials
```bash
# Get the nodegroup (assuming there is only 1 nodegroup at this point)
NODEGROUP=$(eksctl get nodegroups --cluster=observability-workshop | awk '{print $2}' | tail -n1)

# Get EKS worker node IAM instance role ARN
PROFILE=$(aws ec2 describe-instances --filters Name=tag:Name,Values=observability-workshop-$NODEGROUP-Node --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' --output text | cut -d '/' -f 2)

# Fetch IAM instance role name
ROLE=$(aws iam get-instance-profile --instance-profile-name $PROFILE --query "InstanceProfile.Roles[0].RoleName" --output text)

echo $ROLE # Print role name

# Attach IAM policy for Orderservice
ARN=$(aws iam list-policies --scope Local --query "Policies[?PolicyName=='OrderserviceSQS-Policy'].Arn" --output text)
echo $ARN
aws iam attach-role-policy --role-name $ROLE --policy-arn $ARN

# Attach IAM policy for Catalogservice
ARN=$(aws iam list-policies --scope Local --query "Policies[?PolicyName=='CatalogserviceDDB-Policy'].Arn" --output text)
echo $ARN
aws iam attach-role-policy --role-name $ROLE --policy-arn $ARN
```

- Deploy “AnyCompany Shop”
```bash

```

# Cleanup
```bash
kubectl get svc --all-namespaces

# Delete any services that have an associated EXTERNAL-IP value
kubectl delete svc service-name

# Delete the cluster and its associated nodes
eksctl delete cluster --name observability-workshop --region eu-west-1
```
# Reference

