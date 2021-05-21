# Testing the wide Column measure

## Setup the interface VPC endpoint

You can establish a private connection between your VPC and Amazon Timestream by creating an interface VPC endpoint. Interface endpoints are powered by AWS PrivateLink, a technology that enables the instances in your VPC to privately access Timestream APIs without public IP addresses. Traffic between your VPC and Timestream does not leave the Amazon network. 

1. Creating an interface VPC endpoint for Timestream 
- Constructing a VPC endpoint service name using your Timestream cell
```bash
aws timestream-query describe-endpoints --profile timestream-test --region us-east-1
{
    "Endpoints": [
        {
            "Address": "query-cell2.timestream.us-east-1.amazonaws.com",
            "CachePeriodInMinutes": 1440
        }
    ]
}
com.amazonaws.us-east-1.timestream.query-cell2

aws timestream-write describe-endpoints --profile timestream-test --region us-east-1
{
    "Endpoints": [
        {
            "Address": "ingest-cell2.timestream.us-east-1.amazonaws.com",
            "CachePeriodInMinutes": 1440
        }
    ]
}
com.amazonaws.us-east-1.timestream.ingest-cell2
```

## Create the sample database
1. On Timestream Console and create a database named `kdaflink`

2. Under the `kdaflink` database, create a table named `metrics200`

## Ingest data generator
1. Create the worker lambda function `TimestreamIngest` with [TimestreamIngest_lambda.py](scripts/TimestreamIngest_lambda.py). 
- The function will create a message contain 209 measures for 2 dimensions
- The function will sent out the multiple messages for each invocation. The number of message controlled by environment variable ``thread_number`, default is 50
- The thinking time is controlled by environment variable `sleep_time`, default is 0.1s
- The scale factor for the dimensions of each request, which is controlled by environment variable `scale_rate`, default is 1

2. Create the Main lambda function `TimestreamLoadTest` with the [TimestreamLoadTest](scripts/TimestreamLoadTest.py) to current invoke 50 the worker lambda function `TimestreamLoadTest`.

3. Setup the event bridge trigger interval as every 1 minute to invoke the Main lambda function `TimestreamLoadTest`

4. Monitoring

- You can monitor the ingested performance from Timestream Monitoring such as `Ingestion requests latency p95`
- You can monitor the lambda failure SQS destination `rtm-sim-failure`, make sure there is no failure
- You can monitor the lambda `TimestreamIngest` current execution


## Query the Data
1. Start EC2 inside the subnet which Timestream VPC endpoint located

2. Run the script

Using the script [query_test_wide_column.py](scripts/query_test_wide_column.py) to do query. Each SQL will running 5 times and calculate the average response time

```bash
python query_test.py

Running query [1] : [SELECT_WIDE_COLUMN]
### SELECT_WIDE_COLUMN
|Seq|spent time          |
|1  |6.656954            |
|2  |4.426230            |
|3  |4.763187            |
|4  |3.827052            |
|5  |3.867687            |
|6  |3.348620            |
|7  |3.591616            |
|8  |3.406810            |
|9  |3.370868            |
|10 |3.280112            |
Query id : AEBQEAM4MXDIHBQCE3YN4JEYATVO32J5MZ3BNPEYBA33W4XTRYC6T4HQIT34W6I
Average data scan for SELECT_WIDE_COLUMN is: 9.710487 MB
Average time for SELECT_WIDE_COLUMN is: 4.053914 s


Running query [2] : [SELECT_GROUP_BY]
### SELECT_GROUP_BY
|Seq|spent time          |
|1  |0.804737            |
|2  |0.863747            |
|3  |0.846262            |
|4  |0.864348            |
|5  |0.798277            |
|6  |0.853296            |
|7  |0.874680            |
|8  |0.822597            |
|9  |0.872790            |
|10 |0.828577            |
Query id : AEBQEAM4MXDPJIFPJ7BNC6R5OSDNCSOITQS2FE67UX6PBAO3AZMV2WZMO3L7BXA
Average data scan for SELECT_GROUP_BY is: 9.710487 MB
Average time for SELECT_GROUP_BY is: 0.842931 s


Running query [3] : [SELECT_MAX]
### SELECT_MAX
|Seq|spent time          |
|1  |0.832700            |
|2  |0.792626            |
|3  |0.861645            |
|4  |0.772641            |
|5  |0.772227            |
|6  |0.813336            |
|7  |0.874268            |
|8  |0.863120            |
|9  |0.780735            |
|10 |0.792251            |
Query id : AEBQEAM4MXDLL44OK7MEPDQ73K6JQGE5P5K3GJFAK6OBGE24ZMW7HTL2GJ75OLY
Average data scan for SELECT_MAX is: 9.710487 MB
Average time for SELECT_MAX is: 0.815555 s


Running query [4] : [SELECT_BIN]
### SELECT_BIN
|Seq|spent time          |
|1  |0.883157            |
|2  |0.883101            |
|3  |0.813321            |
|4  |0.863444            |
|5  |0.853474            |
|6  |0.813225            |
|7  |0.812874            |
|8  |0.933439            |
|9  |0.802577            |
|10 |0.812333            |
Query id : AEBQEAM4MXDCKNEEH5BK225WFHILPUVY3EFQGKTGUTYF2YGCE2XQPCUKNOBD7VQ
Average data scan for SELECT_BIN is: 9.710487 MB
Average time for SELECT_BIN is: 0.847095 s


Running query [5] : [SELECT_TRUNC]
### SELECT_TRUNC
|Seq|spent time          |
|1  |0.853089            |
|2  |0.923117            |
|3  |0.873090            |
|4  |0.812865            |
|5  |0.913034            |
|6  |0.883076            |
|7  |0.892560            |
|8  |0.923470            |
|9  |0.831866            |
|10 |0.791650            |
Query id : AEBQEAM4MXDPFPFU2UVMI6G3WN6C4FXXWVVYZCQQEVE5VCKNUKPKMT55TZPRP4A
Average data scan for SELECT_TRUNC is: 9.710487 MB
Average time for SELECT_TRUNC is: 0.869782 s


Running query [6] : [SELECT_ARBIT]
### SELECT_ARBIT
|Seq|spent time          |
|1  |0.922777            |
|2  |0.863871            |
|3  |0.853169            |
|4  |0.903164            |
|5  |0.802628            |
|6  |0.802306            |
|7  |0.861973            |
|8  |0.822852            |
|9  |0.812008            |
|10 |0.863497            |
Query id : AEBQEAM4MXDH3T3RT6K2CWOWTVAGG2OFYBOTZ3OPV7RLD6WNT4NOPWJUJAPEWCI
Average data scan for SELECT_ARBIT is: 9.710487 MB
Average time for SELECT_ARBIT is: 0.850824 s


Running query [7] : [SELECT_NTH_VALUE]
### SELECT_NTH_VALUE
|Seq|spent time          |
|1  |0.966268            |
|2  |0.937574            |
|3  |0.916716            |
|4  |0.856213            |
|5  |0.977119            |
|6  |0.937678            |
|7  |0.926496            |
|8  |0.926370            |
|9  |0.946950            |
|10 |0.870588            |
Query id : AEBQEAM4MXDSMFYT5ZAGF5KHZ7WMNAH72WRQI5NKFODED6NJHFUN34XCSYXIJXI
Average data scan for SELECT_NTH_VALUE is: 9.710487 MB
Average time for SELECT_NTH_VALUE is: 0.926197 s
```


