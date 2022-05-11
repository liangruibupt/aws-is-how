# Keep EC2 primary private IP for a 'new' instance

I need create a 'new' instance, but I want keep the EC2 primary private IP no change

The 'new' instance can be
- new launched instance
- restore the instance to launch state

1. 方案1：customer primary private IP
- 记录原EC2 primary private IP
- Terminate 原EC2
- 在创建新EC2的时候，将原IP指定为primary private IP.
Guide: https://aws.amazon.com/premiumsupport/knowledge-center/custom-private-primary-address-ec2/ 
**Note**: 请先在测试环境进行测试之后在应用到生产环境

2. 方案2：替换root volume
- Replace the root volume for an instance, a new volume is restored to the original volume's launch state, or using a specific snapshot. 
- Guide: https://aws.amazon.com/about-aws/whats-new/2021/04/ec2-enables-replacing-root-volumes-for-quick-restoration-and-troubleshooting/
**Note**: 请先在测试环境进行测试之后在应用到生产环境

