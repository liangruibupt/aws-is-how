# MySQL validate_password plugin

I have an Amazon Relational Database Service (Amazon RDS) DB instance running MySQL. I want to test my passwords and improve the security of my DB instance using the validate_password plugin. How can I do this?

## Configuration Guide
[Improve the security of my Amazon RDS MySQL DB instance using the validate_password plugin](https://aws.amazon.com/cn/premiumsupport/knowledge-center/rds-mysql-validate-password-plugin/)

1. 管理员用户登录后, 用下面命令, 对user111尝试3次密码失败后进行锁定
```sql
ALTER USER user111 FAILED_LOGIN_ATTEMPTS 3 PASSWORD_LOCK_TIME UNBOUNDED;
```

2. Testing
```bash
[root@jump01 ~]# mysql -uuser111 -p'!QAZ2ws'  -h wenjigua-mysql8.c6slmrzd0jdl.rds.cn-north-1.amazonaws.com.cn
ERROR 1045 (28000): Access denied for user 'user111'@'ec2-52-80-137-213.cn-north-1.compute.amazonaws.com.cn' (using password: YES)
[root@jump01 ~]# mysql -uuser111 -p'!QAZ2ws'  -h wenjigua-mysql8.c6slmrzd0jdl.rds.cn-north-1.amazonaws.com.cn
ERROR 1045 (28000): Access denied for user 'user111'@'ec2-52-80-137-213.cn-north-1.compute.amazonaws.com.cn' (using password: YES)
[root@jump01 ~]# mysql -uuser111 -p'!QAZ2ws'  -h wenjigua-mysql8.c6slmrzd0jdl.rds.cn-north-1.amazonaws.com.cn
ERROR 3955 (HY000): Access denied for user 'user111'@'ec2-52-80-137-213.cn-north-1.compute.amazonaws.com.cn'. Account is blocked for unlimited day(s) (unlimited day(s) remaining) due to 3 consecutive failed logins.
```