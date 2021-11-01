# DynamoDB labs

1. [DynamoDB get start](ddb-getstart.md)
- Create Table
- Load Sample Data
- Explore DynamoDB with the CLI: Query, Scan, update, Delete, secondary index
- Backup
2. [Advanced Design Patterns](Advanced-Pattern.md)
- DynamoDB Capacity Units and Partitioning: Learn about provisioned capacity.
- Sequential and Parallel Table Scans: Learn the difference between sequential and parallel scans.
- Global Secondary Index Write Sharding: Query a sharded global secondary index to quickly read sorted data by status code and date.
- Global Secondary Index Key Overloading: Explore how to maintain the ability to query on many attributes when you have a multi-entity table.
- Sparse Global Secondary Indexes: Learn how to cut down the resources required for your searches on uncommon attributes.
- Composite Keys: Learn how to combine two attributes into one to take advantage of the DynamoDB sort key.
- Adjacency Lists: Learn how to store multiple entity types in one DynamoDB table.
- DynamoDB Streams and AWS Lambda: Learn how to process DynamoDB items with AWS Lambda for endless triggers.
3. [Modeling Game Player Data - ](Game-Player-Modeling.md)
- A single-table design that combines multiple entity types in one table.
- A composite primary key that allows for many-to-many relationships.
- A sparse global secondary index (GSI) to filter on one of the fields.
- DynamoDB transactions to handle complex write patterns across multiple entities.
- An inverted index (GSI) to allow reverse lookups on the many-to-many entity.
4. [Retajil Cart Design](Retail-Cart.md)
5. [Bank Payment Design](Bank-Payment.md)
6. [NoSQL Workbench for DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html)

# Refernece
[amazon-dynamodb-labs](https://amazon-dynamodb-labs.com/)

[NoSQL Design: Reference Materials](https://amazon-dynamodb-labs.com/reference-materials.html)

[Amazon DynamoDB deep dive: Advanced design patterns (DAT403-R1)](https://www.youtube.com/watch?v=6yqfmXiZTlM)
