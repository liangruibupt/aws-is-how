# Install and Configure ParallelCluster

1. Install AWS ParallelCluster version 2.10.2
```bash
pip3 install aws-parallelcluster==2.10.2 --user

pcluster version
2.10.2

pcluster configure

Allowed values for AWS Region ID:
1. cn-north-1
2. cn-northwest-1
AWS Region ID [cn-north-1]: 2

Allowed values for EC2 Key Pair Name:
1. customer-temp-usage
2. sample-cn-northwest1
3. sample-windows-cn-northwest1
4. workspaces-key-pair
EC2 Key Pair Name [customer-temp-usage]: 2

Allowed values for Scheduler:
1. sge
2. torque
3. slurm
4. awsbatch
Scheduler [slurm]:

Allowed values for Operating System:
1. alinux
2. alinux2
3. centos7
4. centos8
5. ubuntu1604
6. ubuntu1804
Operating System [alinux2]:

Minimum cluster size (instances) [0]:
Maximum cluster size (instances) [10]:

Head node instance type [t2.micro]: c5.large
Compute instance type [t2.micro]: c5.18xlarge

Automate VPC creation? (y/n) [n]: n
Allowed values for VPC ID:
  #  id                     name                              number_of_subnets
---  ---------------------  ------------------------------  -------------------
  1  vpc-xxxxxx1  sample-vpc                                        6
  2  vpc-xxxxxx2  eksctl-eksworkshop-cluster/VPC                    6
  3  vpc-xxxxxx3  sample-demo-vpc                                  10

Automate Subnet creation? (y/n) [y]: y
Allowed values for Network Configuration:
1. Head node in a public subnet and compute fleet in a private subnet
2. Head node and compute fleet in the same public subnet
Network Configuration [Head node in a public subnet and compute fleet in a private subnet]: 1
Creating CloudFormation stack...
Do not leave the terminal until the process has finished
Stack Name: parallelclusternetworking-pubpriv-20210315162238
Status: RouteAssociationPublic - CREATE_COMPLETE
Status: parallelclusternetworking-pubpriv-20210315162238 - CREATE_COMPLETE
The stack has been created
Configuration file written to /Users/ruiliang/.parallelcluster/config
You can edit your configuration file or simply run 'pcluster create -c /Users/ruiliang/.parallelcluster/config cluster-name' to create your cluster
```