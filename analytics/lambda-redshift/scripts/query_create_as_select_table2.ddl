UNLOAD ('SELECT
 airport,
 to_char(SUM(passengers), \'999,999,999\') as passengers
FROM vegas_flights
GROUP BY airport
ORDER BY SUM(passengers) desc;')
to 's3://ray-redshift-training/results/redshift_etl_demo/vegas_flights_passengers_'
IAM_ROLE 'arn:aws-cn:iam::your-account-id:role/rayRedshiftRole'