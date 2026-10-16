# Lambda Database Access: Oracle / PostgreSQL / DynamoDB

在 Lambda 中连接关系型数据库和 DynamoDB 的笔记与示例代码。

## Docs

- [lambda-connect-oracle](lambda-connect-oracle.md)：Lambda 连接 Oracle 的参考链接（oraclePyLambda 项目和一篇实践文章）
- [lambda-write-postgreSQL](lambda-write-postgreSQL.md)：简版笔记：psql 建库建表 `device_status`、运行 IoT 数据生成器、安装 psycopg2，以及 Lambda 连接 RDS 的 Knowledge Center 链接

## Subprojects

- [lambda-write-postgresql](lambda-write-postgresql/lambda-write-postgreSQL.md)：完整方案：设备模拟器发 MQTT 到 IoT Core，IoT Rule 触发 Lambda 写入 RDS PostgreSQL（含架构图、`iot_generator.py`、`lambda-postgresql.py`、`sample_query.ddl`、`requirements.txt`）

## Scripts

- [scripts/lambda-postgresql.py](scripts/lambda-postgresql.py)：psycopg2 写 PostgreSQL 的 Lambda 函数，连接信息来自环境变量，读取 DDL 模板拼接 INSERT（与子项目中的同名文件仅有空白差异）
- [scripts/sample_query_pg.ddl](scripts/sample_query_pg.ddl)：`device_status` 表的 INSERT 语句模板（内容与子项目 `sample_query.ddl` 相同）
- [scripts/lambda_ddb.py](scripts/lambda_ddb.py)：DynamoDB 示例：表 `Movies` 不存在则创建，按事件参数 put / get item
