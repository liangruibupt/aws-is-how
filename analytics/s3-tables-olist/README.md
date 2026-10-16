# 中国区 S3 Tables + Glue + Athena：Olist 电商订单 Iceberg 分析 Demo

在 `cn-north-1` 用 Amazon S3 表存储桶（Table Bucket）存储 Apache Iceberg 表，通过 Glue Data Catalog 联合目录 `s3tablescatalog` 集成，用 Athena 做 SQL 分析。参考文档：[S3 表类数据存储服务](https://docs.amazonaws.cn/AmazonS3/latest/userguide/s3-tables.html)、[与分析服务集成](https://docs.amazonaws.cn/AmazonS3/latest/userguide/s3-tables-integrating-aws.html)。

## 场景

公开数据集 [Olist Brazilian E-Commerce](https://github.com/olist/work-at-olist-data)：巴西电商平台 2016-09 ~ 2018-10 的约 10 万订单。

| Iceberg 表 | 来源 CSV | 行数 | 说明 |
|---|---|---|---|
| `orders` | olist_orders_dataset | 99,441 | 订单事实表，`PARTITIONED BY month(purchase_ts)`，分两批写入 |
| `order_items` | olist_order_items_dataset | 112,650 | 订单明细（价格、运费） |
| `customers` | olist_customers_dataset | 99,441 | 客户及所在州 |
| `order_payments` | olist_order_payments_dataset | 103,886 | 支付方式、分期 |

演示内容：CSV → Iceberg 转换（CTAS / INSERT）、增量追加与快照、时间旅行、分区裁剪、行级 UPDATE、业务分析 SQL。

```
GitHub CSV ─► S3 通用桶 olist-raw-…（Glue 库 olist_raw，CSV 外部表）
                   │ Athena CTAS / INSERT INTO
                   ▼
S3 表存储桶 olist-tablebucket / 命名空间 olist（Iceberg，S3 自动压缩与快照管理）
                   │ Glue 联合目录 s3tablescatalog
                   ▼
Athena：Catalog = s3tablescatalog/olist-tablebucket，Database = olist
```

## 1. 准备原始数据

```bash
export AWS_PROFILE=china_ruiliang AWS_REGION=cn-north-1
ACCOUNT=876820548815
RAW=olist-raw-$ACCOUNT-cn-north-1
for f in orders order_items customers order_payments; do
  curl -sfLO "https://raw.githubusercontent.com/olist/work-at-olist-data/master/datasets/olist_${f}_dataset.csv"
done
aws s3api create-bucket --bucket $RAW --create-bucket-configuration LocationConstraint=cn-north-1
for t in orders order_items customers order_payments; do
  aws s3 cp olist_${t}_dataset.csv s3://$RAW/olist/$t/
done
```

## 2. 创建表存储桶、命名空间并集成 Glue

```bash
aws s3tables create-table-bucket --name olist-tablebucket
aws s3tables create-namespace \
  --table-bucket-arn arn:aws-cn:s3tables:cn-north-1:$ACCOUNT:bucket/olist-tablebucket \
  --namespace olist
# 中国区 ARN 分区为 aws-cn，见 scripts/catalog.json
aws glue create-catalog --cli-input-json file://scripts/catalog.json
aws glue get-catalog --catalog-id s3tablescatalog
```

> 坑：如果账号启用了 Lake Formation，执行 `create-catalog` 的主体即使有 IAM `AdministratorAccess`，不是 **LF 数据湖管理员** 也会报
> `Insufficient Lake Formation permission(s): Required Create Catalog on Catalog`（目录不存在时，`get-catalog` 也会返回类似的 `Required Describe` 错误，不代表目录已存在）。
> 解决办法：用 LF 管理员执行，或者在 `put-data-lake-settings` 里把该主体**追加**到 `DataLakeAdmins`（先 `get-data-lake-settings` 备份，保留原有管理员）。

## 3. Athena 建表与写入

`scripts/athena.sh "<SQL>" [catalog] [database]`：提交查询、等待完成、打印结果和扫描字节数。

原始 CSV 外部表（默认 `AwsDataCatalog`）：

```sql
CREATE DATABASE IF NOT EXISTS olist_raw;
CREATE EXTERNAL TABLE olist_raw.orders (
  order_id string, customer_id string, order_status string,
  order_purchase_timestamp string, order_approved_at string,
  order_delivered_carrier_date string, order_delivered_customer_date string,
  order_estimated_delivery_date string)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
LOCATION 's3://olist-raw-876820548815-cn-north-1/olist/orders/'
TBLPROPERTIES ('skip.header.line.count'='1');
-- order_items / customers / order_payments 同理，全部用 string 列
```

以下 SQL 的执行上下文为 Catalog `s3tablescatalog/olist-tablebucket`、Database `olist`。跨目录读原始表时要写 `awsdatacatalog.olist_raw.xxx`。表名和列名必须**全部小写**，否则 Athena 读不到。

```sql
-- 分区 Iceberg 订单表
CREATE TABLE orders (
  order_id string, customer_id string, order_status string,
  purchase_ts timestamp, approved_ts timestamp, delivered_carrier_ts timestamp,
  delivered_customer_ts timestamp, estimated_delivery_ts timestamp)
PARTITIONED BY (month(purchase_ts))
TBLPROPERTIES ('table_type'='iceberg');

-- 第 1 批：2018-07 之前的历史订单（86,617 行）
INSERT INTO orders
SELECT order_id, customer_id, order_status,
       CAST(nullif(order_purchase_timestamp,'') AS timestamp),
       CAST(nullif(order_approved_at,'') AS timestamp),
       CAST(nullif(order_delivered_carrier_date,'') AS timestamp),
       CAST(nullif(order_delivered_customer_date,'') AS timestamp),
       CAST(nullif(order_estimated_delivery_date,'') AS timestamp)
FROM awsdatacatalog.olist_raw.orders
WHERE order_purchase_timestamp < '2018-07-01';

-- 其余表用 CTAS（S3 Tables 需要 is_external=false）
CREATE TABLE order_items WITH (table_type='ICEBERG', is_external=false) AS
SELECT order_id, CAST(order_item_id AS int) order_item_id, product_id, seller_id,
       CAST(shipping_limit_date AS timestamp) shipping_limit_ts,
       CAST(price AS decimal(10,2)) price, CAST(freight_value AS decimal(10,2)) freight_value
FROM awsdatacatalog.olist_raw.order_items;
-- customers / order_payments 同理
```

## 4. Iceberg 特性演示

```sql
-- 增量：第 2 批，2018-07 之后的新订单（12,824 行）
INSERT INTO orders SELECT ... WHERE order_purchase_timestamp >= '2018-07-01';

-- 快照历史
SELECT committed_at, snapshot_id, operation,
       summary['added-records'] added, summary['total-records'] total
FROM "orders$snapshots" ORDER BY committed_at;
```

| operation | added | total |
|---|---|---|
| append | 86617 | 86617 |
| append | 12824 | 99441 |

```sql
-- 时间旅行：回到第 1 批时的状态 → 86617 行，max = 2018-06-30
SELECT count(*), max(purchase_ts) FROM orders FOR VERSION AS OF <第一个 snapshot_id>;
-- 也可以按时间点：FOR TIMESTAMP AS OF TIMESTAMP '2026-10-16 08:51:00 UTC'

-- 分区裁剪：只查 2018-08 → 6512 行，扫描 0 字节（直接用 manifest 里的统计）
SELECT count(*) FROM orders
WHERE purchase_ts >= TIMESTAMP '2018-08-01' AND purchase_ts < TIMESTAMP '2018-09-01';

-- 分区元数据
SELECT partition, record_count, file_count FROM "orders$partitions" ORDER BY partition DESC;

-- 行级更新：把 2018 年前仍为 shipped 的订单标记为 lost（539 行）
UPDATE orders SET order_status = 'lost'
WHERE order_status = 'shipped' AND purchase_ts < TIMESTAMP '2018-01-01';
```

## 5. 业务分析查询

```sql
-- 2018 月度 GMV / 客单价
SELECT date_format(o.purchase_ts,'%Y-%m') ym, count(DISTINCT o.order_id) orders,
       sum(i.price) gmv, round(sum(i.price)/count(DISTINCT o.order_id),2) aov
FROM orders o JOIN order_items i ON o.order_id = i.order_id
WHERE o.purchase_ts >= TIMESTAMP '2018-01-01' AND o.order_status <> 'canceled'
GROUP BY 1 ORDER BY 1;
-- 2018-05: 6833 单, GMV 992,871.75, AOV 145.31

-- 各州 GMV Top 5：SP 5.20M > RJ 1.82M > MG 1.59M > RS 0.75M > PR 0.68M
SELECT c.customer_state, count(DISTINCT o.order_id) orders, sum(i.price) gmv
FROM orders o JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items i ON o.order_id = i.order_id
GROUP BY 1 ORDER BY gmv DESC LIMIT 5;

-- 支付方式占比：credit_card 73.9%（平均 3.5 期）, boleto 19.0%, voucher 5.6%, debit_card 1.5%
SELECT payment_type, count(*) cnt,
       round(100.0*count(*)/sum(count(*)) OVER (),1) pct,
       round(avg(payment_installments),1) avg_inst, sum(payment_value) amt
FROM order_payments GROUP BY 1 ORDER BY cnt DESC;

-- 配送延迟：延迟率最高的州 CE 15.3%（平均 20.8 天）, BA 14.0%, RJ 13.5%
SELECT c.customer_state, count(*) delivered,
       round(avg(date_diff('day', o.purchase_ts, o.delivered_customer_ts)),1) avg_days,
       round(100.0*count_if(o.delivered_customer_ts > o.estimated_delivery_ts)/count(*),1) late_pct
FROM orders o JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_status = 'delivered' AND o.delivered_customer_ts IS NOT NULL
GROUP BY 1 HAVING count(*) > 1000 ORDER BY late_pct DESC LIMIT 5;
```

## 清理

```bash
TB=arn:aws-cn:s3tables:cn-north-1:$ACCOUNT:bucket/olist-tablebucket
for t in orders order_items customers order_payments; do
  aws s3tables delete-table --table-bucket-arn $TB --namespace olist --name $t
done
aws s3tables delete-namespace --table-bucket-arn $TB --namespace olist
aws s3tables delete-table-bucket --table-bucket-arn $TB
aws athena start-query-execution --work-group primary --query-string "DROP DATABASE olist_raw CASCADE" \
  --result-configuration OutputLocation=s3://aws-athena-query-results-$ACCOUNT-cn-north-1/s3tables-demo/
aws s3 rb s3://olist-raw-$ACCOUNT-cn-north-1 --force
# 可选：aws glue delete-catalog --catalog-id s3tablescatalog（会影响该区域所有表存储桶的集成）
```
