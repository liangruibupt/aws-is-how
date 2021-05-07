# Setup the Nginx proxy sever for S3

User want to leverage the Direct Connect or VPN to connect the S3. To avoid setup the private VIF and leverage the S3 PrivateLink endpoint. You can setup the Nginx proxy sever.

## Set up the S3 PrivateLink endpoint

Please refer below document:

https://aws.amazon.com/cn/blogs/china/use-vpc-endpoint-access-from-vpc-or-idc-s3/

https://aws.amazon.com/cn/blogs/china/how-to-realize-cross-region-private-access-through-s3-privatelink-s3/


## Nginx configuration
```json
server {
     listen                         8000;
     resolver 10.82.0.25;

     # forward proxy for CONNECT request
     proxy_connect;
     proxy_ssl_server_name          on;
     proxy_connect_allow            443 563;
     proxy_connect_connect_timeout  10s;
     proxy_connect_read_timeout     10s;
     proxy_connect_send_timeout     10s;

     # forward proxy for non-CONNECT request
     location / {
         proxy_pass $scheme://$host$URI;
         proxy_set_header Host $host;
     }
}
```

## Usage
- Windows
```bash 
set http_proxy=http://s3-proxy.poc.cn-north-1.aws.cloud:8000
set https_proxy=http://s3-proxy.poc.cn-north-1.aws.cloud:8000

aws s3 ls --profile cn-north-1 --region cn-north-1
aws s3 cp test.zip s3://private-link-s3-test/ --profile cn-north-1 --region cn-north-1
```

# Reference
[How to use Nginx to proxy your S3 files](https://thucnc.medium.com/how-to-use-nginx-to-proxy-your-s3-files-760acc869e8)

[nginx-s3-proxy](https://github.com/coopernurse/nginx-s3-proxy)