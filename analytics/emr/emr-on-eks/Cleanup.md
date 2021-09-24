# Cleanup

1. Delete all the virtual clusters
```bash

# List all the virtual cluster ids
aws emr-containers list-virtual-clusters --region us-east-2

# List running job and cancel it
aws emr-containers list-job-runs --region us-east-2 \
--virtual-cluster-id <virtual-cluster-id> \
--states PENDING SUBMITTED RUNNING CANCEL_PENDING | jq -r '.jobRuns[0].id'

aws emr-containers cancel-job-run --region us-east-2 \
--id <value> --virtual-cluster-id <value>

# Delete virtual cluster by passing virtual cluster id
aws emr-containers delete-virtual-cluster --region us-east-2 --id <virtual-cluster-id>

```

2. Delete the Application
```bash
export DASHBOARD_VERSION="v2.0.0"
kubectl delete -f https://raw.githubusercontent.com/kubernetes/dashboard/${DASHBOARD_VERSION}/aio/deploy/recommended.yaml
```

3. Delete the EKS cluter
```bash
eksctl delete fargateprofile --cluster eks-emr-cluster --name emr_eks_default --region us-east-2

eksctl delete cluster --name=eks-emr-cluster --region us-east-2
```

4. Delete the Glue table and database that was created as part of the the workshop labs.

5. Delete the S3_BUKET or Prefix
