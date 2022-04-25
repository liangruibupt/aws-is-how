# Athena saved query or named query invocation

## 通过AWS CLI使用named query
1. create-named-query
```bash
aws athena create-named-query \
    --name "demo" \
    --database dev \
    --query-string "select * from origin_table limit 5"
```
2. list named query
```bash
aws athena list-named-queries \
    --work-group primary
```

3. get-named-query based on named-query-id
```bash
aws athena get-named-query
--named-query-id <named-query-id>
```
4. Parse the QueryString from get-named-query response

5. Using QueryString in start-query-execution
```
aws athena start-query-execution \
    --query-string <QueryString> \
    --work-group "primary" \
    --query-execution-context Database=dev,Catalog=AwsDataCatalog
```

6. Based on the `QueryExecutionId` to get-query-results
```bash
get-query-results  --query-execution-id <value>
## OR
get-query-execution  --query-execution-id <value>
```
 
7. Enhancement, using Athena Prepared statement

You can use the Athena Prepared statement function to prepare a statement, and then use the previously prepared statement and variable parameters to pass in to execute the query. Prepared statements are subject to the same workgroup constraints as named queries

- Prepared statement：https://docs.aws.amazon.com/zh_cn/athena/latest/ug/querying-with-prepared-statements.html
- Sample
```sql
PREPARE my_select2 FROM
SELECT * FROM "my_database"."my_table" WHERE year = ?
 
EXECUTE my_select2 USING 2012
```