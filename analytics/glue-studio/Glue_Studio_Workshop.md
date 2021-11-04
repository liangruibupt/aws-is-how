# Running AWS Glue Studio Workshop in China region

How to run the [AWS Glue Studio Workshop](https://glue-studio.workshop.aws/0_introduction.html) in China Beijing region

## Data Preparation
1. Obtaining Sample Data
```bash
# Covid dataset
aws s3api put-object --bucket $BUCKET_NAME --key gluestudio/raw/covid_csv/ --region cn-north-1 --profile china
aws s3 sync s3://covid19-lake/enigma-jhu-timeseries/csv/ . --region us-east-1 --profile global
aws s3 sync . s3://$BUCKET_NAME/gluestudio/raw/covid_csv/ --region cn-north-1 --profile china

# Bitcoin dataset
aws s3api put-object --bucket $BUCKET_NAME --key gluestudio/raw/btcusd_csv/ --region cn-north-1 --profile china
# Download Bitcoin 3 years raw data in CSV Format from https://www.blockchain.com/charts/market-price
aws s3 cp market-price s3://$BUCKET_NAME/gluestudio/raw/btcusd_csv/ --region cn-north-1 --profile china

# Final result bucket prefix
aws s3api put-object --bucket $BUCKET_NAME --key gluestudio/curated/ --region cn-north-1 --profile china
```

## AWS Glue Studio Workflow and Jobs
- clean our data: drop `fips` column of Covid dataset and remove time part from `Timestamp` column of Bitcoin dataset, e.g “2018-03-08 00:00:00” to “2018-03-08”
- convert our data into Apache Parquet format, the result of ETL also stored as Apache Parquet format.
- store our datasets separately in different sub-folders under our “curated” folder.
- join our Covid data with our Bitcoin data.
- store our joined data in our curated folder.
- create the Glue Data Catalog for result, it is enable query your resulting folders from Amazon Athena: Choose “Create Data Catalog” option on S3 data targets of AWS Glue Studio. It is similar for using Glue Crawler to create the table from result curated folder.

1. Using Glue Crawler to populate Data Catalog tables the covid_bitcoin
## Reference
[AWS Glue Studio Workshop](https://glue-studio.workshop.aws/0_introduction.html)