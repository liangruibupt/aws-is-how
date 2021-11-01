# Advanced Design Patterns

- DynamoDB Capacity Units and Partitioning: Learn about provisioned capacity.
- Sequential and Parallel Table Scans: Learn the difference between sequential and parallel scans.
- Global Secondary Index Write Sharding: Query a sharded global secondary index to quickly read sorted data by status code and date.
- Global Secondary Index Key Overloading: Explore how to maintain the ability to query on many attributes when you have a multi-entity table.
- Sparse Global Secondary Indexes: Learn how to cut down the resources required for your searches on uncommon attributes.
- Composite Keys: Learn how to combine two attributes into one to take advantage of the DynamoDB sort key.
- Adjacency Lists: Learn how to store multiple entity types in one DynamoDB table.
- DynamoDB Streams and AWS Lambda: Learn how to process DynamoDB items with AWS Lambda for endless triggers.

1. Launch the Lab environment with [CloudFormation](scripts/lab.yaml) and Using System Manager to login the EC2

2. [DynamoDB Capacity Units and Partitioning](Capacity_Partition.md)

3. [Sequential and Parallel Table Scans](Table-Scan.md)

4. [Global Secondary Index](Global-Secondary-Index.md)

5. [Composite keys](Composite_keys.md)

6. [Adjacency Lists](Adjacency_Lists.md)

7. [DDB Stream Lambda](DDB-Stream-Lambda.md)

8. Cleanup
- delete the dynamoDB tables: `InvoiceAndBills`, `employees`, `logfile`, `logfile_gsi_low`, `logfile_replica`, `logfile_scan`
- delete the lambda function: `ddbreplica_lambda`
- delete the CloudFormation stack ``