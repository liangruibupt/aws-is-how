DROP TABLE if exists flights;

CREATE TABLE flights (
  year           smallint,
  month          smallint,
  day            smallint,
  carrier        varchar(80) DISTKEY,
  origin         char(3),
  dest           char(3),
  aircraft_code  char(3),
  miles          int,
  departures     int,
  minutes        int,
  seats          int,
  passengers     int,
  freight_pounds int
);

COPY flights
FROM 's3://ray-redshift-training/awsu-spl/spl17-redshift/static/data/flights-usa'
IAM_ROLE 'arn:aws-cn:iam::876820548815:role/rayRedshiftRole'
GZIP
DELIMITER ','
REMOVEQUOTES
REGION 'cn-northwest-1';
