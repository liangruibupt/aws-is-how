# Sequential and Parallel Table Scans

Even though DynamoDB distributes items across multiple physical partitions, a Scan operation can only read one partition at a time. So the throughput of a Scan is constrained by the maximum throughput of a single partition.

- Sequential Scan
By default, the Scan operation processes data sequentially. Amazon DynamoDB returns data to the application in 1 MB increments, and an application performs additional Scan operations to retrieve the next 1 MB of data. 

- Parallel Scan
In order to maximize the utilization of table-level provisioning, use a parallel Scan to logically divide a table (or secondary index) into multiple logical segments, and use multiple application workers to scan these logical segments in parallel. Each application worker can be a thread in programming languages or an operating system process.

To perform a parallel scan, each worker issues its own Scan request with the following parameters:
  - Segment — A segment to be scanned by a particular worker. Each worker should use a different value for Segment.
  - TotalSegments — The total number of segments for the parallel scan. This value must be the same as the number of workers that your application will use.

## Prepare
- create table scan table and preload 1 million items 
```bash
aws dynamodb create-table --table-name logfile_scan \
--attribute-definitions AttributeName=PK,AttributeType=S AttributeName=GSI_1_PK,AttributeType=S AttributeName=GSI_1_SK,AttributeType=S \
--key-schema AttributeName=PK,KeyType=HASH \
--provisioned-throughput ReadCapacityUnits=5000,WriteCapacityUnits=5000 \
--tags Key=workshop-design-patterns,Value=targeted-for-cleanup \
--global-secondary-indexes "IndexName=GSI_1,\
KeySchema=[{AttributeName=GSI_1_PK,KeyType=HASH},{AttributeName=GSI_1_SK,KeyType=RANGE}],\
Projection={ProjectionType=KEYS_ONLY},\
ProvisionedThroughput={ReadCapacityUnits=3000,WriteCapacityUnits=5000}"

nohup python load_logfile_parallel.py logfile_scan &

aws dynamodb scan --table-name logfile_scan --index-name GSI_1 --select "COUNT"
{
    "Count": 998000,
    "ScannedCount": 998000,
    "ConsumedCapacity": null
}
```

## Sequential Scan
- first scan
```python
    fe = "responsecode <> :f"
    eav = {":f": 200}

    response = table.scan(
        FilterExpression=fe,
        ExpressionAttributeValues=eav,
        Limit=pageSize,
        ProjectionExpression='bytessent')
```
- Continue next scan with `LastEvaluatedKey`
```python
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            FilterExpression=fe,
            ExpressionAttributeValues=eav,
            Limit=pageSize,
            ExclusiveStartKey=response['LastEvaluatedKey'],
            ProjectionExpression='bytessent')
        for i in response['Items']:
            totalbytessent += i['bytessent']
    return totalbytessent
```

```bash
python scan_logfile_simple.py logfile_scan

Scanning 1 million rows of table logfile_scan to get the total of bytes sent
Total bytessent 6045921 in 18.758141040802002 seconds
```

## Parallel scan
- First scan
```python
    fe = "responsecode <> :f"
    eav = {":f": 200}

    response = table.scan(
        FilterExpression=fe,
        ExpressionAttributeValues=eav,
        Limit=pageSize,
        TotalSegments=totalsegments,
        Segment=threadsegment,
        ProjectionExpression='bytessent'
        )
```
-  continue scanning the table until LastEvaluatedKey equals null
```python
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            FilterExpression=fe,
            ExpressionAttributeValues=eav,
            Limit=pageSize,
            TotalSegments=totalsegments,
            Segment=threadsegment,
            ExclusiveStartKey=response['LastEvaluatedKey'],
            ProjectionExpression='bytessent')
        for i in response['Items']:
            totalbytessent += i['bytessent']
```

- Execution multi-thread
```python
    thread_list = []
    for i in range(total_segments):
        thread = threading.Thread(target=parallel_scan, args=(tablename, total_segments, i))
        thread.start()
        thread_list.append(thread)
        time.sleep(.1)
```
```bash
python scan_logfile_parallel.py logfile_scan 5
Scanning 1 million rows of table logfile_scan to get the total of bytes sent
Total bytessent 6045921 in 4.314122915267944 seconds

python scan_logfile_parallel.py logfile_scan 2
Scanning 1 million rows of table logfile_scan to get the total of bytes sent
Total bytessent 6045921 in 8.197628736495972 seconds
```

## Reference
[HowItWorks Partitions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html)

[ParallelScan](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html#Scan.ParallelScan)

[Best Practices for Querying and Scanning Data](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html)