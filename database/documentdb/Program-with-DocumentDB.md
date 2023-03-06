# Program with DocumentDB

## Connecting Programmatically to Amazon DocumentDB
1. Determining the Value of Your tls Parameter
    ```bash
    aws docdb describe-db-clusters \
    --db-cluster-identifier docdb-2023-03-01-09 \
    --query 'DBClusters[*].[DBClusterIdentifier,DBClusterParameterGroup]'

    aws docdb describe-db-cluster-parameters \
    --db-cluster-parameter-group-name default.docdb4.0 --output json
    ```

2. Connecting with TLS Enabled. Using the [connect_db.py](connect_db.py) to connect the database
    ```bash
    # To encrypt data in transit, download the public key for Amazon DocumentDB
    # Global region
    wget https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem
    # China region
    wget https://s3.cn-north-1.amazonaws.com.cn/rds-downloads/rds-combined-ca-cn-bundle.pem

    pip3 install pymongo

    python3 connect_db.py
    ```

3. Using Change Streams with Amazon DocumentDB. Using the [change_stream.py](change_stream.py) to test
    ```bash
    mongo --ssl --host docdb-2023-03-01-09.cluster-ckghkggpkoby.docdb.cn-north-1.amazonaws.com.cn:27017 --sslCAFile rds-combined-ca-cn-bundle.pem --username dbadmin --password <insertYourPassword>

    //Enable change streams for the collection "foo" in database "bar"
    db.adminCommand({modifyChangeStreams: 1,
        database: "test",
        collection: "foo", 
        enable: true});

    //Enable change streams for all collections in database "bar"
    db.adminCommand({modifyChangeStreams: 1,
        database: "bar",
        collection: "", 
        enable: true});
    
    //List all databases and collections with change streams enabled
    cursor = new DBCommandCursor(db,
        db.runCommand(
            {aggregate: 1,
            pipeline: [{$listChangeStreams: 1}], 
            cursor:{}}));
    
    //Determine if the database “bar” or collection “bar.foo” have change streams enabled
    cursor = new DBCommandCursor(db,
        db.runCommand(
            {aggregate: 1,
            pipeline: [{$listChangeStreams: 1},
                        {$match: {$or: [{database: "test", collection: "foo"},
                                        {database: "bar", collection: ""},
                                        {database: "", collection: ""}]}}
                        ],
            cursor:{}})); 
    
    ```