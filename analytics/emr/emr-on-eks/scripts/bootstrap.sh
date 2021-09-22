if [ $# -eq 0 ]
  then
    echo "Please provide EKSClusterName, Region and EKSClusterAdminArn from cloudformation outputs"
    return
fi

#cloud9 comes with AWS v1. Upgrade to AWS v2
sudo yum install jq -y

aws configure set region $2

account_id=`aws sts get-caller-identity --query Account --output text`

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install eksctl on cloud9. You must have eksctl 0.34.0 version or later.

curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
eksctl version

# Install kubectl on cloud9.

curl -o kubectl https://amazon-eks.s3.us-west-2.amazonaws.com/1.18.8/2020-09-18/bin/linux/amd64/kubectl
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin

# Install helm on cloud9.

curl -sSL https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash

# Copy TPC-DS data into account bucket
#aws s3 cp --recursive s3://aws-data-analytics-workshops/emr-eks-workshop/data/ s3://emr-eks-workshop-$account_id/data/

aws eks update-kubeconfig --name $1 --region $2 --role-arn $3

# Allow Cloud9 to talk to EKS Control Plane. Add Cloud9 IP address address inbound rule to EKS Cluster Security Group
export EKS_SG=`aws eks describe-cluster --name $1 --query cluster.resourcesVpcConfig.clusterSecurityGroupId | sed 's/"//g'`
export C9_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)
aws ec2 authorize-security-group-ingress  --group-id ${EKS_SG}  --protocol tcp  --port 443  --cidr ${C9_IP}/32

#Create a namespace on EKS for EMR cluster
kubectl create namespace emr-eks-workshop-namespace

#Create a namespace on EKS Fargate for EMR cluster
kubectl create namespace eks-fargate

# Create Amazon EMR Cluster in EKS emr-eks-workshop-namespace namespace

eksctl create iamidentitymapping \
    --cluster $1 \
    --namespace emr-eks-workshop-namespace \
    --service-name "emr-containers"

aws emr-containers create-virtual-cluster \
--name emr_eks_cluster \
--container-provider '{
    "id":   "'"$1"'",
    "type": "EKS",
    "info": {
        "eksInfo": {
            "namespace": "emr-eks-workshop-namespace"
        }
    }
}'    

# Setup the Trust Policy for the IAM Job Execution Role

aws emr-containers update-role-trust-policy \
       --cluster-name $1 \
       --namespace emr-eks-workshop-namespace \
       --role-name EMR_EKS_Job_Execution_Role

# Create Amazon EMR Cluster in EKS eks-fargate namespace

eksctl create iamidentitymapping \
    --cluster $1 \
    --namespace eks-fargate \
    --service-name "emr-containers"

# Setup the Trust Policy for the IAM Job Execution Role

aws emr-containers update-role-trust-policy \
       --cluster-name $1 \
       --namespace eks-fargate \
       --role-name EMR_EKS_Job_Execution_Role

# Enable IAM Roles for Service Accounts (IRSA) on the EKS cluster

eksctl utils associate-iam-oidc-provider --cluster $1 --approve

