# S3 Object Access and Web Integration

## Docs

- [S3-Presign-URL](S3-Presign-URL.md)：用 `aws s3 presign` 生成 GET / PUT 预签名 URL，临时分享或上传私有对象
- [s3explorer](s3explorer/README.md)：静态 S3 Web Explorer，用于在浏览器中浏览 Bucket，包含中国区 IAM / CORS 配置

## Scripts

- [scripts/s3_image_display.html](scripts/s3_image_display.html)：在 HTML 中同时嵌入公开对象 URL 和预签名 URL 图片的示例
- [scripts/s3uri_parse_utility.py](scripts/s3uri_parse_utility.py)：把 `s3://bucket/prefix` 解析为 bucket 和 prefix，包含桶名校验
