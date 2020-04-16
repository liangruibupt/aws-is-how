# Simplest way - Only used as proxy
## CentOS / Amazon Linux
# https://elatov.github.io/2019/01/using-squid-to-proxy-ssl-sites/

```bash
sudo yum info squid
sudo yum install -y squid

sudo mkdir -p /etc/squid/certs
openssl req -new -newkey rsa:2048 -sha256 -days 365 -nodes -x509 -extensions v3_ca -keyout squid-ca-key.pem -out squid-ca-cert.pem -subj "/C=CN/ST=PEK/L=squid/O=squid/CN=squid"
cat squid-ca-cert.pem squid-ca-key.pem >> squid-ca-cert-key.pem
sudo mv squid-ca-cert-key.pem /etc/squid/certs/.
sudo chown squid:squid -R /etc/squid/certs

sudo grep -vE '^$|^#' /etc/squid/squid.conf
acl localnet src 10.0.0.0/8 # RFC1918 possible internal network
acl localnet src 172.16.0.0/12  # RFC1918 possible internal network
acl localnet src 192.168.0.0/16 # RFC1918 possible internal network
acl localnet src fc00::/7       # RFC 4193 local private network range
acl localnet src fe80::/10      # RFC 4291 link-local (directly plugged) machines
acl SSL_ports port 443
acl Safe_ports port 80      # http
acl Safe_ports port 21      # ftp
acl Safe_ports port 443     # https
acl Safe_ports port 70      # gopher
acl Safe_ports port 210     # wais
acl Safe_ports port 1025-65535  # unregistered ports
acl Safe_ports port 280     # http-mgmt
acl Safe_ports port 488     # gss-http
acl Safe_ports port 591     # filemaker
acl Safe_ports port 777     # multiling http
acl CONNECT method CONNECT
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localhost manager
http_access deny manager
http_access allow localnet
http_access allow localhost
http_access deny all
http_port 3128
coredump_dir /var/spool/squid
refresh_pattern ^ftp:       1440    20% 10080
refresh_pattern ^gopher:    1440    0%  1440
refresh_pattern -i (/cgi-bin/|\?) 0 0%  0
refresh_pattern .       0   20% 4320

logfile_rotate 10
debug_options rotate=10

#Add below content
http_port 3128 ssl-bump \
  cert=/etc/squid/certs/squid-ca-cert-key.pem \
  generate-host-certificates=on dynamic_cert_mem_cache_size=16MB
https_port 3129 intercept ssl-bump \
  cert=/etc/squid/certs/squid-ca-cert-key.pem \
  generate-host-certificates=on dynamic_cert_mem_cache_size=16MB
sslcrtd_program /usr/lib64/squid/ssl_crtd -s /var/lib/ssl_db -M 16MB
acl step1 at_step SslBump1
ssl_bump peek step1
ssl_bump bump all
ssl_bump splice all

#Check configure
sudo squid -k parse

#Start squid
sudo systemctl start squid
sudo systemctl enable squid
sudo systemctl status squid.service

sudo systemctl stop squid

#create the SSL database and make sure the squid user can access it
sudo /usr/lib64/squid/ssl_crtd -c -s /var/lib/ssl_db
sudo chown squid:squid -R /var/lib/ssl_db


# Add inbound port 3128/3129 to the instance security group
```

## access.log
$ sudo tail -f /var/log/squid/access.log


# Testing:
## same VPC
```bash
$ curl -I -x http://10.0.2.149:3128 -L blog.hatena.ne.jp -k
$ curl https://www.bing.com/ -x http://10.0.2.149:3128 -k -vvv > /dev/null
$ curl -O https://releases.hashicorp.com/terraform/0.11.10/terraform_0.11.10_linux_amd64.zip -x http://10.0.2.149:3128 -k
$ wget -e "https_proxy = http://10.0.2.149:3128" https://github.com/Medium/phantomjs/releases/download/v2.1.1/phantomjs-2.1.1-linux-x86_64.tar.bz2 --no-check-certificate
$ wget -e "https_proxy = http://10.0.2.149:3128" https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-6.7.7.zip --no-check-certificate
# AWS CLI https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-proxy.html
export HTTP_PROXY=http://10.0.2.149:3128
export HTTPS_PROXY=http://10.0.2.149:3128
```

## Inter-region VPC peering 
You need enable the Inter-region peering.

### Public Subnet in Beijing
```bash
[ec2-user@ip-192-168-40-157 ~]$ curl http://169.254.169.254/latest/meta-data/hostname
ip-192-168-40-157.cn-north-1.compute.internal

[ec2-user@ip-192-168-40-157 ~]$ curl -I -x http://10.0.2.149:3128 -L blog.hatena.ne.jp -k
.....
HTTP/1.1 200 Connection established

HTTP/1.1 200 OK
Date: Tue, 03 Mar 2020 03:32:13 GMT
Content-Type: text/html; charset=utf-8
Content-Length: 8999
Server: nginx
Vary: Accept-Encoding
Cache-Control: no-cache
Pragma: no-cache
Vary: Accept-Language
X-Frame-Options: SAMEORIGIN
X-Framework: Ridge/0.11 Plack/1.0039
X-Ridge-Dispatch: Hatena::WWW::Engine::Login#default
X-Runtime: 8ms
X-View-Runtime: 5ms
X-Cache: MISS from ip-10-0-2-149.cn-northwest-1.compute.internal
X-Cache-Lookup: MISS from ip-10-0-2-149.cn-northwest-1.compute.internal:3128
Via: 1.1 ip-10-0-2-149.cn-northwest-1.compute.internal (squid/3.5.20)
Connection: keep-alive


[ec2-user@ip-192-168-129-85 ~]$ curl -O https://releases.hashicorp.com/terraform/0.11.10/terraform_0.11.10_linux_amd64.zip -x http://10.0.2.149:3128 -k
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 19.9M  100 19.9M    0     0  3859k      0  0:00:05  0:00:05 --:--:-- 5021k


[ec2-user@ip-192-168-40-157 ~]$ wget -e "https_proxy = http://10.0.2.149:3128" https://github.com/Medium/phantomjs/releases/download/v2.1.1/phantomjs-2.1.1-linux-x86_64.tar.bz2 --no-check-certificate
--2020-03-03 03:34:16--  https://github.com/Medium/phantomjs/releases/download/v2.1.1/phantomjs-2.1.1-linux-x86_64.tar.bz2
Connecting to 10.0.2.149:3128... connected.
WARNING: cannot verify github.com's certificate, issued by ‘/C=XX/ST=XX/L=squid/O=squid/CN=squid’:
  Self-signed certificate encountered.
Proxy request sent, awaiting response... 302 Found
Location: https://github-production-release-asset-2e65be.s3.amazonaws.com/5755891/d55faeca-f27c-11e5-84be-6e92fb868e05?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIWNJYAX4CSVEH53A%2F20200303%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20200303T033417Z&X-Amz-Expires=300&X-Amz-Signature=71bafd66c86db71ec941e8341b03dc5f0ecd73d92680b739a883e315bf0aee8b&X-Amz-SignedHeaders=host&actor_id=0&response-content-disposition=attachment%3B%20filename%3Dphantomjs-2.1.1-linux-x86_64.tar.bz2&response-content-type=application%2Foctet-stream [following]
--2020-03-03 03:34:18--  https://github-production-release-asset-2e65be.s3.amazonaws.com/5755891/d55faeca-f27c-11e5-84be-6e92fb868e05?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIWNJYAX4CSVEH53A%2F20200303%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20200303T033417Z&X-Amz-Expires=300&X-Amz-Signature=71bafd66c86db71ec941e8341b03dc5f0ecd73d92680b739a883e315bf0aee8b&X-Amz-SignedHeaders=host&actor_id=0&response-content-disposition=attachment%3B%20filename%3Dphantomjs-2.1.1-linux-x86_64.tar.bz2&response-content-type=application%2Foctet-stream
Connecting to 10.0.2.149:3128... connected.
WARNING: cannot verify github-production-release-asset-2e65be.s3.amazonaws.com's certificate, issued by ‘/C=XX/ST=XX/L=squid/O=squid/CN=squid’:
  Self-signed certificate encountered.
Proxy request sent, awaiting response... 200 OK
Length: 23415665 (22M) [application/octet-stream]
Saving to: ‘phantomjs-2.1.1-linux-x86_64.tar.bz2’

100%[==============================================================================================================================================>] 23,415,665  4.78MB/s   in 4.7s

2020-03-03 03:34:23 (4.78 MB/s) - ‘phantomjs-2.1.1-linux-x86_64.tar.bz2’ saved [23415665/23415665]
```

### Private Subnet in Beijing
```bash
[ec2-user@ip-192-168-129-85 ~]$ curl http://169.254.169.254/latest/meta-data/hostname
ip-192-168-129-85.cn-north-1.compute.internal

[ec2-user@ip-192-168-129-85 ~]$ curl -I -x http://10.0.2.149:3128 -L blog.hatena.ne.jp -k
HTTP/1.1 200 OK
Date: Tue, 03 Mar 2020 03:39:47 GMT
Content-Type: text/html; charset=utf-8
Content-Length: 8999
Server: nginx
Vary: Accept-Encoding
Cache-Control: no-cache
Pragma: no-cache
Vary: Accept-Language
X-Frame-Options: SAMEORIGIN
X-Framework: Ridge/0.11 Plack/1.0039
X-Ridge-Dispatch: Hatena::WWW::Engine::Login#default
X-Runtime: 8ms
X-View-Runtime: 5ms
X-Cache: MISS from ip-10-0-2-149.cn-northwest-1.compute.internal
X-Cache-Lookup: MISS from ip-10-0-2-149.cn-northwest-1.compute.internal:3128
Via: 1.1 ip-10-0-2-149.cn-northwest-1.compute.internal (squid/3.5.20)
Connection: keep-alive


[ec2-user@ip-192-168-129-85 ~]$ wget -e "https_proxy = http://10.0.2.149:3128" https://github.com/Medium/phantomjs/releases/download/v2.1.1/phantomjs-2.1.1-linux-x86_64.tar.bz2 --no-check-certificate
--2020-03-03 03:42:00--  https://github.com/Medium/phantomjs/releases/download/v2.1.1/phantomjs-2.1.1-linux-x86_64.tar.bz2
Connecting to 10.0.2.149:3128... connected.
WARNING: cannot verify github.com's certificate, issued by ‘/C=XX/ST=XX/L=squid/O=squid/CN=squid’:
  Self-signed certificate encountered.
Proxy request sent, awaiting response... 302 Found
Location: https://github-production-release-asset-2e65be.s3.amazonaws.com/5755891/d55faeca-f27c-11e5-84be-6e92fb868e05?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIWNJYAX4CSVEH53A%2F20200303%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20200303T034201Z&X-Amz-Expires=300&X-Amz-Signature=09080b9e2e14c6c9b8193aa2c1a4d64e4f4a5134ebfbed87e2a371a82956ba18&X-Amz-SignedHeaders=host&actor_id=0&response-content-disposition=attachment%3B%20filename%3Dphantomjs-2.1.1-linux-x86_64.tar.bz2&response-content-type=application%2Foctet-stream [following]
--2020-03-03 03:42:01--  https://github-production-release-asset-2e65be.s3.amazonaws.com/5755891/d55faeca-f27c-11e5-84be-6e92fb868e05?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIWNJYAX4CSVEH53A%2F20200303%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20200303T034201Z&X-Amz-Expires=300&X-Amz-Signature=09080b9e2e14c6c9b8193aa2c1a4d64e4f4a5134ebfbed87e2a371a82956ba18&X-Amz-SignedHeaders=host&actor_id=0&response-content-disposition=attachment%3B%20filename%3Dphantomjs-2.1.1-linux-x86_64.tar.bz2&response-content-type=application%2Foctet-stream
Connecting to 10.0.2.149:3128... connected.
WARNING: cannot verify github-production-release-asset-2e65be.s3.amazonaws.com's certificate, issued by ‘/C=XX/ST=XX/L=squid/O=squid/CN=squid’:
  Self-signed certificate encountered.
Proxy request sent, awaiting response... 200 OK
Length: 23415665 (22M) [application/octet-stream]
Saving to: ‘phantomjs-2.1.1-linux-x86_64.tar.bz2’

100%[==============================================================================================================================================>] 23,415,665  5.14MB/s   in 5.7s

2020-03-03 03:42:08 (3.93 MB/s) - ‘phantomjs-2.1.1-linux-x86_64.tar.bz2’ saved [23415665/23415665]

```

