COPY flights
FROM 's3://ray-redshift-training/awsu-spl/spl17-redshift/static/data/flights-usa'
IAM_ROLE 'arn:aws-cn:iam::your-account-id:role/rayRedshiftRole'
GZIP
DELIMITER ','
REMOVEQUOTES
REGION 'cn-northwest-1';