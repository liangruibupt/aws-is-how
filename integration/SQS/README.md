# SQS quick Demo

## SendReceiveMessages
```bash
cd quick_example_code
make
./run_example.sh SendReceiveMessages
```

Result:
```bash
## Running SendReceiveMessages...
## arguments ...
[INFO] Scanning for projects...
[INFO] 
[INFO] ------------------< aws.example.sqs:aws-sqs-examples >------------------
[INFO] Building Amazon SQS Examples 1.0
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] 
[INFO] --- exec-maven-plugin:3.0.0:java (default-cli) @ aws-sqs-examples ---
 queueUrl https://sqs.cn-north-1.amazonaws.com.cn/876820548815/MyQueue
 received message hello world 1597743858418
 received message Hello from message 1597743858463
 received message Hello from message 1597743858463
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  2.246 s
[INFO] Finished at: 2020-08-18T09:16:23Z
[INFO] ------------------------------------------------------------------------
```