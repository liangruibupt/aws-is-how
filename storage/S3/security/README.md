# S3 Security and Data Protection

## Docs

- [S3-Disable-TLS1.1-Access](S3-Disable-TLS1.1-Access.md)：用 `s3:TlsVersion` 桶策略禁止 TLS 1.0/1.1，强制 TLS 1.2+
- [S3_protection](S3_protection.md)：GuardDuty S3 Protection、Malware Protection for S3，以及中国区用 Lambda + ClamAV 做病毒扫描
- [check-integrity-of-s3-object](check-integrity-of-s3-object.md)：上传时用 Content-MD5 校验对象完整性，不一致时发 SNS 告警

## Scripts

- [scripts/check-s3-object-integrity.py](scripts/check-s3-object-integrity.py)：计算 MD5、上传对象、校验，失败时发 SNS 通知
