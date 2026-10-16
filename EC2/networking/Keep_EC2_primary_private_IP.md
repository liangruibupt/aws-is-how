# Keep EC2 primary private IP for a 'new' instance

I need create a 'new' instance, but I want keep the EC2 primary private IP no change

The 'new' instance can be
- new launched instance
- restore the instance to launch state

## Solutions
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
  
## Demo for Solution 2
1. Launch a new EC2 Amazon Linux2 instance c5.large and connect to Instance
2. Install nginx
```bash
sh-4.2$ which nginx
which: no nginx in (/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin)

sh-4.2$ sudo amazon-linux-extras list | grep nginx
 38  nginx1                   available    [ =stable ]

sh-4.2$ sudo amazon-linux-extras enable nginx1

sh-4.2$ sudo yum clean metadata
sh-4.2$ sudo yum install -y nginx

sh-4.2$ nginx -v
nginx version: nginx/1.20.0
```
3. Select the instance, then `Actions`, `Monitor and troubleshoot`, `Replace root volume`.
- To restore the instance's root volume to its initial launch state, choose Create replacement task without selecting a snapshot. **[This is for my testing]**
- To restore the instance's root volume to a specific snapshot, for Snapshot, select the snapshot to use, and then choose Create replacement task.

4. Check the status
- Console: In the Storage tab, expand `Recent root volume replacement tasks`.
- CLI
```bash
aws ec2 describe-replace-root-volume-tasks --replace-root-volume-task-ids replacevol-0b43efdc7bc9169bc --region cn-north-1

{
    "ReplaceRootVolumeTasks": [
        {
            "ReplaceRootVolumeTaskId": "replacevol-0b43efdc7bc9169bc",
            "InstanceId": "i-xxxxxxxxxx",
            "TaskState": "succeeded",
            "StartTime": "2022-05-11T05:25:11Z",
            "CompleteTime": "2022-05-11T05:25:37Z",
            "Tags": []
        }
    ]
}
```

5. Re-connect to EC2 instance, the nginx command should not found
```bash
sh-4.2$ nginx -v
sh: nginx: command not found
```
## Reference
[replace-root-volume](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-restoring-volume.html#replace-root)