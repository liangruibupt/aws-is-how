# How to get results from Athena for the past 7 days?

## Some tips
1. current_date
```sql
SELECT current_date AS today_in_iso;
```

2. Yesterday
```sql
SELECT current_date - interval '1' day AS yesterday_in_iso;
```

3. Last 7 days or Last 7 days time step
```sql
SELECT to_iso8601(current_date - interval '7' day);
SELECT to_iso8601(current_timestamp - interval '7' day);
```

## Usage
1. VPC flow logs
```sql
SELECT pkt_srcaddr, srcaddr, pkt_dstaddr, dstaddr, sum(bytes) as bytes, day
FROM athenatable
WHERE dstaddr NOT LIKE '10.%' AND from_iso8601_date(replace(day, '/', '-')) > current_date - interval '7' day
GROUP BY pkt_srcaddr, srcaddr, pkt_dstaddr, dstaddr, day order by bytes desc
```

More tips [Analyze the Amazon VPC flow logs using Amazon Athena](https://aws.amazon.com/premiumsupport/knowledge-center/athena-analyze-vpc-flow-logs/)

2. CloudTrail logs
```sql
WITH events AS (
  SELECT
    event.eventVersion,
    event.eventID,
    event.eventTime,
    event.eventName,
    event.eventType,
    event.eventSource,
    event.awsRegion,
    event.sourceIPAddress,
    event.userAgent,  
    event.userIdentity.type AS userType,
    event.userIdentity.arn AS userArn,
    event.userIdentity.principalId as userPrincipalId,
    event.userIdentity.accountId as userAccountId,
    event.userIdentity.userName as userName
  FROM cloudtrail.events
  CROSS JOIN UNNEST (Records) AS r (event)
)
SELECT userName,sourceIPAddress,eventName,eventTime FROM events WHERE eventName='ConsoleLogin'
and eventTime > to_iso8601(current_timestamp - interval '7' day);
```

More tips for [Athena to search AWS CloudTrail logs](https://aws.amazon.com/premiumsupport/knowledge-center/athena-tables-search-cloudtrail-logs/)