# Pricing: Price List API & Cost Estimation

查询 AWS 公开价格，以及按业务场景估算成本。

## Docs

- [price-list-api](price-list-api.md)：Price List API 参考链接（中国区可用公告、API endpoint、使用文档）
- [WebRTC成本计算](WebRTC成本计算.md)：车联网场景（1 万台车、8 路摄像头）下 KVS WebRTC 成本测算，拆分 Signaling Channel、Signaling Messages、TURN Relay 三部分，给出单车月度及全量月度/年度费用（CNY）

## Scripts

- [scripts/pricelist-api.py](scripts/pricelist-api.py)：boto3 `pricing` 客户端示例：列出所有服务及属性、EC2 各属性取值，并按条件（Windows、64 vCPU、256 GiB、SQL Ent、东京）查询 EC2 产品价格
