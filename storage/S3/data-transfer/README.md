# S3 Data Transfer: Cross Region / Cross Cloud

在 Global 区域和中国区之间，或者从其他云的对象存储，把数据同步到 S3。

## Docs

- [Sync-Global-S3bucket-2-China](Sync-Global-S3bucket-2-China.md)：方案总览和选型（DTH / CLI / resumable-upload）
- [aws-data-replication-hub](aws-data-replication-hub.md)：Data Transfer Hub 部署 Portal 并创建任务，双向同步，含 SSE-KMS 测试（**推荐**）
- [s3_split_combine_DTH](s3_split_combine_DTH.md)：超大文件（50GB / 100GB）先拆分、经 DTH 传输、再合并，并校验 MD5 / ETag
- [Directly-copy-using-aws-S3-CLI](Directly-copy-using-aws-S3-CLI.md)：用 `aws s3 cp` 管道跨分区直接拷贝
- [amazon-s3-resumable-upload](amazon-s3-resumable-upload.md)：amazon-s3-resumable-upload 工具包（已被 DTH 取代）
- [RClone-Quick-Start](RClone-Quick-Start.md)：RClone copy / sync、SFTP 远端配置、crontab 定时同步

## Scripts

- [scripts/crr-s3-download-upload.py](scripts/crr-s3-download-upload.py)：boto3 跨区域下载再上传
- `scripts/s3_linux`：Linux x86-64 二进制，提供 `partinfo` / `split` / `combine`，配合 [s3_split_combine_DTH](s3_split_combine_DTH.md) 使用
