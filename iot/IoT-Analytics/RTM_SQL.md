1. TIMESTAMP `BETWEEN AND`
```sql
SELECT
            vd.heartrate, 
            vd.userid AS user_name, 
            vd.ratetype, 
            vd.datetime
        FROM "quicksightdb"."heartrate_iot_data" vd
        WHERE vd.userid IS NOT NULL AND vd.ratetype IS NOT NULL
        AND (vd.userid = 'Bonny')
        AND (vd.datetime BETWEEN TIMESTAMP '2021-03-04 10:00:13.000' AND TIMESTAMP '2021-03-04 10:00:23.000')
        ORDER BY vd.datetime
```

2. TIMESTAMP `BETWEEN AND` + Integer greater than
```sql
SELECT vd.datetime, vd.userid, vd.ratetype, vd.heartrate
        FROM "quicksightdb"."heartrate_iot_data" vd
        where (vd.userid = 'Bailey') 
            AND  (vd.datetime BETWEEN TIMESTAMP '2021-03-04 10:00:13.000' AND TIMESTAMP '2021-03-05 10:00:23.000') 
            AND vd.heartrate > 75
        ORDER BY vd.datetime
        Limit 100
```

3. GROUP BY
```sql
SELECT
        se.sport_type_name as sport, COUNT(DISTINCT se.id) AS total
        FROM "quicksightdb"."sporting_event" se
        WHERE (se.home_team_id = 1)
        AND (se.location_id = 5)
        AND (se.start_date_time BETWEEN TIMESTAMP '2020-04-01 12:00:00.000' AND TIMESTAMP '2020-05-1 12:01:00.000')
        GROUP BY se.sport_type_name
```

4. Create view
```sql
CREATE OR REPLACE VIEW sporting_event_info AS 
SELECT
  e.id event_id
, e.sport_type_name sport
, e.start_date_time event_date_time
, h.name home_team
, a.name away_team
, l.name location
, l.city
FROM
  sporting_event e
, sport_team h
, sport_team a
, sport_location l
WHERE (((e.home_team_id = h.id) AND (e.away_team_id = a.id)) AND (e.location_id = l.id))
```

5. Query from View
```
SELECT
        se.sport, COUNT(DISTINCT se.event_id) AS total
        FROM sporting_event_info se
        WHERE (se.home_team = 'New York Mets')
        AND (se.away_team = 'Atlanta Braves')
        AND (se.location = 'Citi Field')
        AND (se.event_date_time BETWEEN TIMESTAMP '2020-04-01 12:00:00.000' AND TIMESTAMP '2020-07-01 12:01:00.000')
        GROUP BY se.sport

SELECT
        se.location, count(se.event_id) as total
        FROM sporting_event_info se
        AND (se.event_date_time BETWEEN TIMESTAMP '2020-04-01 12:00:00.000' AND TIMESTAMP '2020-07-01 12:01:00.000')
        GROUP BY se.location
```

6. CASE
```sql
SELECT
        se.sport, se.event_id, se.home_team,
        CASE se.location WHEN 'Citi Field' THEN 'go' WHEN 'Miller Park' THEN 'caution' WHEN 'Angel Stadium' THEN 'stop' ELSE 'retry' END as instructions 
        FROM sporting_event_info se
        WHERE (se.home_team = 'New York Mets')
        AND (se.away_team = 'Atlanta Braves')
        AND (se.event_date_time BETWEEN TIMESTAMP '2020-04-01 12:00:00.000' AND TIMESTAMP '2020-07-01 12:01:00.000')
        ORDER BY se.sport
```

7. Join and Left Join
```sql
SELECT
  e.id event_id, 
  e.sport_type_name sport, 
  e.start_date_time event_date_time, 
  h.name home_team, 
  l.name location, 
  l.city city,
CASE l.name
    WHEN 'Citi Field' THEN 'go' WHEN 'Miller Park' THEN 'caution' WHEN 'Angel Stadium' THEN 'stop' ELSE 'retry' 
END as instructions
FROM
  sporting_event e
JOIN sport_team h ON e.home_team_id = h.id
LEFT JOIN sport_location l ON e.location_id = l.id
WHERE (h.name = 'New York Mets') 
  AND (e.start_date_time BETWEEN TIMESTAMP '2020-04-01 12:00:00.000' AND TIMESTAMP '2020-07-01 12:01:00.000')
```

8. MAX
```sql
SELECT
  max(t.ticket_price) AS max_price, 
  e.sport_type_name sport, 
  h.name home_team, 
  l.name location,
CASE l.name
    WHEN 'Citi Field' THEN 'go' WHEN 'Miller Park' THEN 'caution' WHEN 'Angel Stadium' THEN 'stop' ELSE 'retry' 
END as instructions
FROM
  sporting_event e
JOIN sporting_event_ticket t ON t.sporting_event_id = e.id
JOIN sport_team h ON e.home_team_id = h.id
LEFT JOIN sport_location l ON e.location_id = l.id
WHERE (h.name = 'New York Mets') 
  AND (e.start_date_time BETWEEN TIMESTAMP '2020-04-01 12:00:00.000' AND TIMESTAMP '2020-07-01 12:01:00.000')
Group by e.sport_type_name, h.name, l.name


SELECT
  e.event_id event_id, 
  e.sport sport, 
  e.event_date_time event_date_time, 
  h.name home_team, 
  l.name location, 
  l.city city,
CASE l.name
    WHEN 'Citi Field' THEN 'go' WHEN 'Miller Park' THEN 'caution' WHEN 'Angel Stadium' THEN 'stop' ELSE 'retry' 
END as instructions
FROM
  sporting_event_ticket_info e
JOIN sport_team h ON e.home_team = h.name
LEFT JOIN sport_location l ON e.location = l.name
WHERE (h.name = 'New York Mets') 
  AND e.ticket_price = (( SELECT max(t.ticket_price) AS max
           FROM sporting_event_ticket t
           WHERE t.sporting_event_id = e.event_id))
  AND (e.event_date_time BETWEEN TIMESTAMP '2020-04-01 12:00:00.000' AND TIMESTAMP '2020-07-01 12:01:00.000')
```