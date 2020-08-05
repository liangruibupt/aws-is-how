COPY aircraft
FROM 's3://ray-redshift-training/awsu-spl/spl17-redshift/static/data/lookup_aircraft.csv'
IAM_ROLE 'arn:aws-cn:iam::876820548815:role/rayRedshiftRole'
IGNOREHEADER 1
DELIMITER ','
REMOVEQUOTES
TRUNCATECOLUMNS
REGION 'cn-northwest-1';