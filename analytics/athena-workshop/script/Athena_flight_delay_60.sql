SELECT origin, dest, count(*) as delays
FROM flight_delay_parquet
WHERE depdelayminutes > 60
GROUP BY origin, dest
ORDER BY 3 DESC
LIMIT 10;