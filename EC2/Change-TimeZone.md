# Change EC2 Time-Zone

## Linux
```bash
[ec2-user@ray-demo-tools ~]$ date
Wed Mar 31 07:55:43 UTC 2021

ls /usr/share/zoneinfo/Asia

sudo ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

sudo vi /etc/sysconfig/clock
# Update 
ZONE="Asia/Shanghai"

sudo reboot
[ec2-user@ray-demo-tools ~]$ date
Wed Mar 31 16:17:42 CST 2021
```