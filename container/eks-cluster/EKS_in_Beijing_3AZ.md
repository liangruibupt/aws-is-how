1. Create EKS cluster without subnets in the new AZ (cn-north-1d)
```bash
$ cat <<EOF | eksctl create cluster -f -

    ---

    apiVersion: eksctl.io/v1alpha5

    kind: ClusterConfig

  

    metadata:

      name: bjs-eks

      region: cn-north-1

  

    vpc:

      id: vpc-04178f2a6ce02cdf2

      cidr: "192.168.0.0/16"

      subnets:

        public:

          public-one:

            id: subnet-003cdfea4148b676a

          public-two:

            id: subnet-038ad38f7c35bd5b6

        private:

          private-one:

            id: subnet-0542e77ad4711b2a2

          private-two:

            id: subnet-0f6fa869050e75083

    EOF
```
   

2. Create EKS node groups with subnets across 3 AZs
```bash
    $ cat <<EOF | eksctl create ng -f -

    ---

    apiVersion: eksctl.io/v1alpha5

    kind: ClusterConfig

  

    metadata:

      name: bjs-eks

      region: cn-north-1

  

    vpc:

      id: vpc-04178f2a6ce02cdf2

      cidr: "192.168.0.0/16"

      subnets:

        public:

          public-one:

            id: subnet-003cdfea4148b676a

          public-two:

            id: subnet-038ad38f7c35bd5b6

          public-three:

            id: subnet-09d1fbe297d6accba

        private:

          private-one:

            id: subnet-0542e77ad4711b2a2

          private-two:

            id: subnet-0f6fa869050e75083

          private-three:

            id: subnet-0847c6bec60c4ba48

  

    nodeGroups:

      - name: ng-1

        instanceType: m5.large

        ssh:

          enableSsm: true

        desiredCapacity: 3

        privateNetworking: true

        subnets:

          - private-one

          - private-two

          - private-three

  

    managedNodeGroups:

      - name: ng-2

        instanceType: m5.large

        ssh:

          enableSsm: true

        desiredCapacity: 3

        privateNetworking: true

        subnets:

          - private-one

          - private-two

          - private-three

    EOF
```

## Reference
[Exclude cn-north-1d AZ when creating EKS cluster in China Beijing region](https://github.com/weaveworks/eksctl/issues/3916)