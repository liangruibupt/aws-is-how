# Install SSM Agent on Amazon EKS worker nodes

# Option1：Install SSM Agent on Amazon EKS worker nodes by using Kubernetes DaemonSet

## Prerequisites
- Attach the `AmazonSSMManagedInstanceCore` to IAM Role `eksctl-eksworkshop-nodegroup-eksw-NodeInstanceRole`
- This pattern isn't applicable to AWS Fargate
- This pattern applies only to Linux-based worker nodes

## Deploy the DaemonSet on the Amazon EKS cluster
This command first creates a DaemonSet to run the pods on worker nodes to install SSM Agent, waits for a minute, and then deletes the DaemonSet.

```
kubectl apply -f ssm_daemonset.yaml && sleep 120 && kubectl delete -f ssm_daemonset.yaml
daemonset.apps/ssm-installer created
daemonset.apps "ssm-installer" deleted
```

Monitor the status

```
kubectl get pods
NAME                  READY   STATUS             RESTARTS   AGE
ssm-installer-fltjr   0/1     CrashLoopBackOff   1          17s
ssm-installer-zx5wm   0/1     CrashLoopBackOff   1          18s

kubectl describe pod  ssm-installer-fltjr
Events:
  Type     Reason     Age                 From               Message
  ----     ------     ----                ----               -------
  Normal   Scheduled  101s                default-scheduler  Successfully assigned default/ssm-installer-fltjr to ip-192-168-71-196.cn-northwest-1.compute.internal
  Normal   Pulled     96s                 kubelet            Successfully pulled image "048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/dockerhub/amazonlinux" in 4.179020044s
  Normal   Pulled     96s                 kubelet            Successfully pulled image "048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/dockerhub/amazonlinux" in 68.605086ms
  Normal   Pulled     80s                 kubelet            Successfully pulled image "048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/dockerhub/amazonlinux" in 62.475367ms
  Normal   Created    54s (x4 over 96s)   kubelet            Created container ssm
  Normal   Started    54s (x4 over 96s)   kubelet            Started container ssm
  Normal   Pulled     54s                 kubelet            Successfully pulled image "048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/dockerhub/amazonlinux" in 73.068789ms
  Warning  BackOff    24s (x7 over 95s)   kubelet            Back-off restarting failed container
  Normal   Pulling    10s (x5 over 101s)  kubelet            Pulling image "048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/dockerhub/amazonlinux"
  Normal   Pulled     10s                 kubelet            Successfully pulled image "048912060910.dkr.ecr.cn-northwest-1.amazonaws.com.cn/dockerhub/amazonlinux" in 78.986516ms
```

## Architecture
[SSM-Agent-EKS](media/SSM-Agent-EKS.png)


# Option2：Introducing launch template and custom AMI support in Amazon EKS Managed Node Groups

Let’s consider the following script which installs and enables the Amazon SSM Agent as an example.
```bash
#!/bin/bash
yum install -y amazon-ssm-agent
systemctl enable amazon-ssm-agent && systemctl start amazon-ssm-agent
```
We can encode this in base64, create a new launch template or a new launch template version, and use that to create or update a managed node group which will install the Amazon SSM Agent and enable its service. Each instance which scales in as a Kubernetes node in that group will have the SSM Agent installed and enabled.

```bash
$ cat config_install_ssm.json
{ 
  "LaunchTemplateData": {
  "EbsOptimized": false,
    "InstanceType": "t3.small",
    "KeyName": "bastion",
    "UserData": "TUlNRS1WZXJzaW9uOiAxLjAKQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvbWl4ZWQ7IGJvdW5kYXJ5PSIvLyIKCi0tLy8KQ29udGVudC1UeXBlOiB0ZXh0L3gtc2hlbGxzY3JpcHQ7IGNoYXJzZXQ9InVzLWFzY2lpIgojIS9iaW4vYmFzaAoKeXVtIGluc3RhbGwgLXkgYW1hem9uLXNzbS1hZ2VudApzeXN0ZW1jdGwgZW5hYmxlIGFtYXpvbi1zc20tYWdlbnQgJiYgc3lzdGVtY3RsIHN0YXJ0IGFtYXpvbi1zc20tYWdlbnQKLS0vLy0tCg==",
    "SecurityGroupIds": [
      "sg-0e9b58499f42bcd4b",
      "sg-0275026e71e1e7c9c"
    ]
  }
}
```

```bash
aws ec2 create-launch-template \
        --launch-template-name hermione-mng-custom-ssm \
        --version-description "first version (ssh, ssm)" \
        --cli-input-json file://./config_install_ssm.json

aws eks create-nodegroup --cluster-name hermione \
        --nodegroup-name hermione-mng-custom-ssm \
        --subnets subnet-00e4fbabdbb93505c subnet-04831fd6485e95dd6 \
        --node-role 'arn:aws:iam::510431938379:role/node-instance-role' \
        --launch-template name=hermione-mng-custom-ssm
```

## Reference
[Offical guide](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/install-ssm-agent-on-amazon-eks-worker-nodes-by-using-kubernetes-daemonset.html)

[Introducing launch template and custom AMI support in Amazon EKS Managed Node Groups](https://aws.amazon.com/blogs/containers/introducing-launch-template-and-custom-ami-support-in-amazon-eks-managed-node-groups/)