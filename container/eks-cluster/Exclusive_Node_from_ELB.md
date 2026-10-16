# 怎么将EC2 Node 不被ELB的Target group 纳管，或者不被ELB将流量路由到
目前 private subnet 没有打 kubernetes.io/role/internal-elb 但是里面的EC2 node 还是被CLB 放到targate group里面了
客户的诉求是这些subnent里面的EC2不想被放到TG里面

这里面有两个含义： 
- 1 是哪些subnet放clb节点，2是clb节点会把哪些ec2节点纳入target group；
上面那个kubernetes.io/role/internal-elb tag决定的是1，这个标签只决定elb的节点放在哪几个subnet，不决定后面target到底选择哪些。 参考 https://aws.amazon.com/premiumsupport/knowledge-center/eks-vpc-subnet-discovery/

- 2 的默认的行为是所以kubernetes集群的节点，都会被纳入target group。 这个解决的就是，在指定的subnet放置pod，那么只有这些有pod运行的instance，才会接受elb的流量。 换句话说只在elb上挂载对应subnet上有pod运行的instance。  https://kubernetes.io/zh/docs/tasks/access-application-cluster/create-external-load-balancer/#%E4%BF%9D%E7%95%99%E5%AE%A2%E6%88%B7%E7%AB%AF%E6%BA%90-ip，在clb的service yaml文件写  `externalTrafficPolicy: Local`