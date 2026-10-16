# Cost Analysis: CUR & Cost Explorer

基于 Cost and Usage Report (CUR) 和 Cost Explorer 分析已经产生的 AWS 费用。

## Docs

- [analysis-cost-usage-report](analysis-cost-usage-report.md)：开启 CUR，`aws ce get-cost-and-usage` 按 USAGE_TYPE / SERVICE 查询，Glue Crawler 建表，以及 15 条常用 Athena 分析 SQL（Top 费用、EC2 OnDemand、RI 使用与闲置、按 Name 标签等）
- [cost-expoler-api](cost-expoler-api.md)：在 Cost Explorer 控制台查看数据传输出（Data Transfer Out）报表，用脚本调用 Cost Explorer API 导出 CSV，附 `get_tags` 示例输出和参考链接

## Scripts

- [scripts/aws-cost-and-usage-report.py](scripts/aws-cost-and-usage-report.py)：boto3 调用 Cost Explorer（cn-northwest-1），按 `--days` 统计中国区数据传输类 USAGE_TYPE 并按 Name 标签过滤，按账号/服务分组输出每日 UnblendedCost（制表符分隔）
