# AWS Backup Q&A

## Q: EFS中文件被删除了，EFS的backup中能否查到这几个被删除的具体文件？
A: 可以恢复整个文件系统，或做item-level恢复。做item-level恢复时，必须指定恢复文件的相对路径（相对于挂载点）。
如果文件系统挂载点为：/user/home/myname/efs，待恢复文件为user/home/myname/efs/file1，可以指定恢复/file1。请注意不支持wildcard。
https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-efs.html
 
## Q: AWS Backup如何对资源进行过滤？
A: 可以以tag或service为维度进行过滤。创建backup plan后，可以指定备份资源，里面可以选择包含所有资源类型则可以用tag进行过滤，不指定的话就是全备份。
还可以选择为指定服务的资源进行备份，这时候可以筛选resource ID.
建议如果是多数资源都需要备份只有一小部分不需要备份，则选择”Include specific resources type”后在”exclude”中进行勾选不需要备份的资源。
https://docs.aws.amazon.com/aws-backup/latest/devguide/assigning-resources.html
 
## Q: AWS Backup的backup rule中，如果选择默认的window，则所有的rule都是5am UTC吗？
A: 这个5am UTC开始的window只针对该backup rule起作用。其他rule可以单独设置时间。如果都是默认，则都是5am UTC开始，持续8小时。
另外，如果一个backup plan中对同一个资源包含多个backup rule，这些rule中所设置的window又有overlap时，AWS Backup会遵守retention period更长的rule。比如backup plan中包含两个rule
- Rule#1: 每小时备份，1小时开始窗口，保留1天。
- Rule#2: 每12小时备份，8小时开始窗口，保留1周。
24小时后，Rule#2会创建2个备份，Rule#1只会创建8个备份。因为Rule#2会在8小时开始，开始前Rule#1已经创建了8个备份，而Rule#2备份开始后会使Rule#1失效。
https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-backup-plan.html#plan-options-and-configuration
 
## Q: 如果在AWS Backup中选择的是RDS资源，设置为默认窗口，而RDS自己的自动备份也设置了备份窗口时间，最终会按照哪个执行？
A: 对RDS启用AWS Backup后，自动备份控制权会转移到AWS Backup服务而不是RDS，RDS以前做过的自动备份会被托管给AWS Backup，之后的计划会按照Backup的schedule进行。
 
## Q: 需要备份的资源需要在”Protected resources”那里创建吗？
A: On-demand的备份可以在这里创建，自动备份无需创建，备份开始后会自动被添加到”Protected resources”中。
 
## Q: Backup plan里面创建了Rule，但是备份job有些失败有些成功，成功的job会放到”Protected resources”中。
A: 可以在Backup job的日志界面查看job失败原因。
 
## Q: 通过AWS Backup创建的快照，如何给快照添加tag？比如给EC2做快照，EBS上面没有tag，备份出来的EBS快照也不会有EC2的tag。
A: 可以通过CloudWatch EventBridge触发快照动作时通过lambda打tag。
 
## Q: On-demand的backup可否设置特定的时间？
A: 建议设置为schedule的自动快照，可以在backup window中选择backup now或自定义窗口。如果仍然需要on-demand快照，则建议使用lambda cron定时调用backup now API。
 
## Q: Backup成功与否的status时间，有CloudWatch Event集成吗？
A: 有Eventbridge和SNS的集成可以参考。
https://docs.aws.amazon.com/aws-backup/latest/devguide/eventbridge.html
https://docs.aws.amazon.com/aws-backup/latest/devguide/sns-notifications.html
 
## Q: AWS Backup备份的job日志存储到了哪里？存储多少天？
A: Job没有日志，只有metrics，backup api的调用都保存在CloudTrail里，保存90天。
Job在页面和cli中的显示只有30天，超出30天的需求，需要借助CloudTrail。
https://docs.aws.amazon.com/aws-backup/latest/devguide/monitoring.html
多于90天的保存需求，可以将CloudTrail日志经过过滤后保存在S3存储中。
 
## Q: RDS备份任务出现错误”Backup job could not start because it is either inside or too close to the automated backup window configured in RDS instance”
A: RDS设置的自动快照，和AWS Backup设置的backup plan之间需要有至少4小时的时间差。
 
## Q: Backup job中的start by是什么意思？
A: 指该job必须在此时间点(UTC)启动，否则该job会被取消。该值为backup window时间和start in时间的总和。
 
## Q: AWS Backup有自动化API吗？
A: 有。https://docs.aws.amazon.com/aws-backup/latest/devguide/api-reference.html
 
## Q: AWS Backup和AWS服务自带的备份功能相比，价格上面有差异吗？
A: 无差异。比如，AWS Backup为RDS创建备份，以及RDS服务自带自动备份对比如下：
https://www.amazonaws.cn/en/rds/pricing/
https://www.amazonaws.cn/en/backup/pricing/
北京区域的定价均为¥ 0.580 per GB-month。但使用AWS Backup作为统一Backup方案时，可以节省运维开销，尤其是多账号且各账号下各资源备份策略不同时。
 
## Q: AWS Backup会加密数据吗？
A: 会。in-transit和at-rest都会使用KMS进行独立加密。
https://docs.amazonaws.cn/en_us/aws-backup/latest/devguide/encryption.html
 
## Q: 备份可以保留多久？
A: RDS的PITR备份可以保留35天。其他类型备份可以保留最多100年。
建议为同一个backup plan做2个backup rule，一个是持续备份用来恢复近时数据，另一个用来长时保存。
 
## Q: AWS Backup做过的RDS备份可否跨region复制？
A: 可以创建backup时指定复制到另外一个region，并在另一个region进行恢复。
 
## Q: AWS Backup可否与Security Hub集成，备份任务失败时生成Security Hub finding？
A: 可以参考如下官方blog
https://aws.amazon.com/blogs/storage/automate-visibility-of-backup-findings-using-aws-backup-and-aws-security-hub/
但目前中国区AWS Backup的Audit Manager还不可用。
 
## Q: 已存在backup plan的情况下定义另一个backup plan，删除之前的backup plan，那么之前backup plan做过的backup是否会被删除？
A: 删除backup plan时，不会自动删除由这个backup plan创建的backup。
如需删除，有两种方式，一种方式是自动删除，一种方式是手动删除。
- 自动删除是指，修改backup plan中backup rule中的Lifecycle，定义backup失效时间，到失效时间后，backup会被自动删除。
- 手动删除是指，在backup vault中手动删除backup。
https://docs.aws.amazon.com/aws-backup/latest/devguide/deleting-a-backup-plan.html
https://docs.aws.amazon.com/aws-backup/latest/devguide/deleting-backups.html
https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-backup-plan.html
 
## Q:在AWS Backup服务中定义一个backup plan，之前RDS的自动备份还有吗？两者会结合？还是需要停用RDS自动快照？
A:如果在AWS Backup服务中对RDS进行自动备份，同时在RDS服务中进行自动备份，两者会结合，不会冲突。无需停用RDS自动快照。
实际上，RDS创建的自动备份，会被AWS Backup托管，backup的control权会被收到AWS Backup中（也可以将其控制权归还RDS）。
https://docs.aws.amazon.com/aws-backup/latest/devguide/point-in-time-recovery.html
You can't control the Amazon RDS automated backup window. This is because AWS Backup intelligently schedules it for you.
- RDS中，backup以continuous开头的为AWS Backup创建的持续快照用于PITR，以”snapshot-by-rds”为在RDS上创建的一次性手动快照，会被AWS Backup纳管。
- AWS Backup进行的RDS备份可以被看作调用RDS手动snapshot（但不会占用RDS snapshot的quota）。
- 如果在RDS上，初始的RDS的backup retention设置为7天。启用AWS Backup后，backup plan中设置retention为35天，则该实例backup retention会变为backup plan中设置的天数。
- 启用Backup托管RDS备份后，客户不能在RDS中禁用Automated Backup。比如，modify DB instance的retention为0 day（disable automated backup），会有报错。
 
## Q: 用了backup，不用RDS自动快照了，会不会有些feature就享受不了了？比如pitr
A: 目前没有已知的，由于使用了AWS Backup，导致RDS的feature无法使用的情况。包括PITR也可以由AWS Backup集成。
https://aws.amazon.com/blogs/storage/point-in-time-recovery-and-continuous-backup-for-amazon-rds-with-aws-backup/
关于这个问题，建议在测试环境中进行足够的测试，再在生产环境中投入使用。
如下列出一些AWS Backup的注意点：
- 使用AWS Backup备份或恢复资源时，需要有使用AWS Backup和响应资源的权限。比较方便的方式为当为Backup plan选择assignment时选择Default role。
- 使用AWS Backup备份或恢复某种资源发现抱错时，除了查看Job的日志、CloudTrail，还可以查询响应资源的文档，如RDS文档。
https://docs.aws.amazon.com/aws-backup/latest/devguide/working-with-supported-services.html
- 一般来说，RDS不允许maintenance window或automatic backup window前一小时内进行备份，但如果使用AWS Backup则无需担心，因为AWS Backup会智能安排备份窗口。