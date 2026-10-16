# How to bootstrap sensitive data in EC2 User Data

## Question:

A company uses user data scripts that contain sensitive information to bootstrap Amazon EC2 instances. A Security Engineer discovers that this sensitive information is viewable by people who should not have access to it.

What is the MOST secure way to protect the sensitive information used to bootstrap the instances?

## Solution:

Store the sensitive data in AWS Systems Manager Parameter Store using the encrypted string parameter and assign the Systems Manager GetParameters and KMS Decryption permission to the EC2 instance role.

## Demo EC2 user data:

```bash
#!/bin/bash
sudo yum -y install httpd
sudo mkdir -p /var/www/html/
hostname=$(curl http://169.254.169.254/latest/meta-data/hostname)
ssm_demo=$(aws ssm get-parameters --names "bootstrap_demo" "lambda_env_var_demo" --with-decryption --region cn-northwest-1)
sudo sh -c "echo '<html><h1>Hello From Your Web Server on ${hostname} for secure String ${ssm_demo} </h1></html>' > /var/www/html/index.html"
sudo chkconfig httpd on
sudo systemctl start httpd
```