# TimeStream QuickStart

## Step1 - Create Database and Table
1. Database：`DevTestDB` and standard database. Leave the other options as default
2. Table: `DevTestTable`
3. Data retention: 1 days for `Memory store retention` and 1 months for `Magnetic store retention`

## Step 2 - Configure AWS IoT Core Rule
Create the AWS IoT Rule to write data into the database automatically when the device publish message to IoT
1. Rule Name: `DevTestRule`
2. Query statement: `SELECT * FROM 'prefix/+/data'`
3. Add new actions: `Write a message into a Timestream table`
- dimension name: `deviceId`; dimension value: `${topic(2)}`
- dimension name: `deviceType`; dimension value: `TemperatureAndSpeedSensor`
- Timestamp: `${timestamp()}`; Unit: MILLISECONDS
- Role: `iot-rule-to-timestream-role`
4. Create Rule

## Step 3 - Generate Data
1. Edit the [ingest-timestream.js](scripts/ingest-timestream.js)
- the Root CA certificate should be called: `AmazonRootCA1.pem`
- Your certificate should be called: `certificate.pem.crt`
- Your private key should be called: `private.pem.key`

2. Run the script
```bash
npm i aws-iot-device-sdk
node ingest-timestream.js
```

It will generate 150 events with 2 different deviceid for `speed` and `temperature` to measures

## Step 4 - Explore Data
1. On Amazon Timestream -> Query Editor, run the SQL
```sql
-- Get the 20 most recently added data points
SELECT * FROM "DevTestDB"."DevTestTable" ORDER BY time DESC LIMIT 20
```

2. Down Sampling: Aggregates measures by 1 minute timeframe with `bin(time, 1m)`
```sql
SELECT deviceType,
    bin(time, 1m) as binned_time,
    AVG(measure_value::double) as averageTemperature,
    MAX(measure_value::double) as maxTemperature,
    MIN(measure_value::double) as minTemperature
FROM "DevTestDB"."DevTestTable"
WHERE time >= ago(1d)
AND measure_name IN ('temperature')
GROUP BY deviceType, bin(time, 1m)
ORDER BY binned_time DESC
```

3. Down Sampling: Aggregated values for the defined timeframe (1 minute) for each measure (temperature and speed)
```sql
SELECT deviceType,
    bin(time, 1m) as binned_time,
    measure_name,
    AVG(measure_value::double) as average,
    MAX(measure_value::double) as max,
    MIN(measure_value::double) as min
FROM "DevTestDB"."DevTestTable"
WHERE time >= ago(1d)
GROUP BY deviceType, measure_name, bin(time, 1m)
ORDER BY binned_time DESC
```

4. Use case conditions to extract the aggregated values for each measure
```sql
SELECT deviceType,
    bin(time, 1m) as binned_time,
    AVG(
        CASE WHEN measure_name = 'temperature' THEN measure_value::double ELSE NULL END
    ) AS avgTemperature,
    MAX(
        CASE WHEN measure_name = 'speed' THEN measure_value::double ELSE NULL END
    ) AS maxSpeed
FROM "DevTestDB"."DevTestTable"
WHERE time >= ago(1d)
AND measure_name IN ('temperature', 'speed')
GROUP BY deviceType, bin(time, 1m)
ORDER BY binned_time DESC


SELECT deviceId,
    bin(time, 1m) as binned_time,
    AVG(
        CASE WHEN measure_name = 'temperature' THEN measure_value::double ELSE NULL END
    ) AS avgTemperature,
    MAX(
        CASE WHEN measure_name = 'speed' THEN measure_value::double ELSE NULL END
    ) AS maxSpeed
FROM "DevTestDB"."DevTestTable"
WHERE time >= ago(1d)
AND measure_name IN ('temperature', 'speed')
AND deviceId = '1234'
GROUP BY deviceId, bin(time, 1m)
ORDER BY binned_time DESC
```