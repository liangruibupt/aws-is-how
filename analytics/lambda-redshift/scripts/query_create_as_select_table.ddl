UNLOAD ('SELECT airport, passengers FROM vegas_flights ORDER BY airport')
to 's3://ray-redshift-training/results/redshift_etl_demo/vegas_flights_'
IAM_ROLE 'arn:aws-cn:iam::your-account-id:role/rayRedshiftRole'
parallel off;