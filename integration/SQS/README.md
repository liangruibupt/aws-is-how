# SQS quick Demo

## Send Receive Messages to SQS Standard Queue with SDK
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

## Working with JMS and Amazon SQS

The Amazon SQS Java Messaging Library is a JMS interface for Amazon SQS that lets you take advantage of Amazon SQS in applications that already use JMS.

The library supports sending and receiving messages to a queue (the JMS point-to-point model) according to the JMS 1.1 specification. 
The library supports sending text, byte, or object messages synchronously to Amazon SQS queues. 
The library also supports receiving objects synchronously or asynchronously. 

### Sender Terminal
```bash
cd quick_example_code
make
./run_example.sh TextMessageSender

Enter message to send (leave empty to exit): hello jms
Send message ID:22732c2d-d90e-437b-be97-3c6da615ca98
Enter message to send (leave empty to exit): close jms now
Send message ID:9a1df01b-20aa-4437-84f3-acb63e0b27ed
Enter message to send (leave empty to exit): 
Connection closed

```

### In Receiver terminal
```bash

./run_example.sh SyncMessageReceiver

Waiting for messages
Got message ID:22732c2d-d90e-437b-be97-3c6da615ca98
Content: 
        hello jms
Acknowledged message ID:22732c2d-d90e-437b-be97-3c6da615ca98
Waiting for messages
Got message ID:9a1df01b-20aa-4437-84f3-acb63e0b27ed
Content: 
        close jms now
Acknowledged message ID:9a1df01b-20aa-4437-84f3-acb63e0b27ed
Waiting for messages
Shutting down after 1 minute of silence
Connection closed
```