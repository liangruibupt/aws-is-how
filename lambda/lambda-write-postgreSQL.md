```bash
psql --host=DB_instance_endpoint --port=port --username=master_user_name --password --dbname=postgres

postgres=> CREATE DATABASE iotdemo;
postgres=> \connect iotdemo;
postgres=> DROP TABLE IF EXISTS device_status;

postgres=> CREATE TABLE device_status (
    deviceid VARCHAR(255) PRIMARY KEY,
    critical integer,
    alertmessage VARCHAR(128),
    alertcount integer,
    eventtime TIMESTAMP
);

postgres=> INSERT INTO device_status (deviceid, critical, alertmessage, alertcount, eventtime) VALUES ('1626712066.457285_6', 3, 'Temperature exceeded INTC', 8, '2021-07-20 00:13:16');

postgres=> select * from device_status limit 5;
postgres=> \q
```

```bash
pip install AWSIoTPythonSDK
# Modify the IoT mqttc.configureEndpoint and mqttc.configureCredentials
python iot_generator.py
```

[How do I configure a Lambda function to connect to an RDS instance?](https://aws.amazon.com/premiumsupport/knowledge-center/connect-lambda-to-an-rds-instance/)