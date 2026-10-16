```bash
docker build -t account-id.dkr.ecr.cn-north-1.amazonaws.com.cn/tomcat-webserver:latest .

docker run -d -p 8080:8080 account-id.dkr.ecr.cn-north-1.amazonaws.com.cn/tomcat-webserver:latest

curl http://localhost:8080/
curl http://localhost:8080/sample

aws ecr get-login-password --region cn-north-1 | docker login --username AWS --password-stdin account-id.dkr.ecr.cn-north-1.amazonaws.com.cn/tomcat-webserver
docker push account-id.dkr.ecr.cn-north-1.amazonaws.com.cn/tomcat-webserver:latest

# Create the AWS Fargate Cluster
curl http://ec2co-ecsel-4qxwndxl1aqc-646199264.cn-north-1.elb.amazonaws.com.cn:8080/
```