# Create SSL/TLS certificate with openssl

You can create an SSL/TLS certificate for your application with OpenSSL. OpenSSL is a standard, open source library that supports a wide range of cryptographic functions, including the creation and signing of certificates. For more information about OpenSSL, visit https://www.openssl.org/ 

1. Create an RSA private key to create your certificate signing request (CSR)
```bash
openssl genrsa 2048 > privatekey.pem
```

2. Create a CSR
```bash
openssl req -new -key privatekey.pem -out csr.pem
```

3. Sign the certificate

You can submit the signing request to a third party for signing, or sign it yourself for development and testing

```bash
openssl x509 -req -days 365 -in csr.pem -signkey privatekey.pem -out public.crt
```

4. Upload to IAM
```bash
aws iam upload-server-certificate --server-certificate-name keycloak-webdemo-certificate \
--certificate-body file://public.crt --private-key file://privatekey.pem \
--path /cloudfront/keycloak-webdemo/ --region cn-north-1
```

5. Retrieving a certificate
```bash
aws iam get-server-certificate --server-certificate-name keycloak-webdemo-certificate --region cn-north-1
```

6. Listing server certificates
```bash
aws iam list-server-certificates --region cn-north-1
```

5. Renaming a server certificate or updating its path
```bash
aws iam update-server-certificate --server-certificate-name keycloak-webdemo-certificate \
   --new-server-certificate-name CloudFrontCertificate \
   --new-path /cloudfront/newpath --region cn-north-1
```

5. Deleting a certificate
```bash
aws iam delete-server-certificate --server-certificate-name keycloak-webdemo-certificate
```

**Note**: If you upload a server certificate to be used with Amazon CloudFront, you must specify a path using --path. The path must begin with /cloudfront and the path must include a trailing slash, for example, /cloudfront/test/

## Reference
[Upload and import an SSL certificate to AWS Identity and Access Management (IAM)](https://aws.amazon.com/cn/premiumsupport/knowledge-center/import-ssl-certificate-to-iam/)

[Troubleshoot issues with using a custom SSL certificate for my CloudFront distribution](https://aws.amazon.com/premiumsupport/knowledge-center/custom-ssl-certificate-cloudfront/)

[Managing server certificates in IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html)