import boto3

BUCKET_NAME = "glueworkshop-ray-us-east-2"
client = boto3.client('glue')
CRAWLER_NAME = "glueworkshop-python-lab1"

# Create database 
try:
    response = client.create_database(
        DatabaseInput={
            'Name': 'python-glueworkshop',
            'Description': 'This database is created using Python boto3',
        }
    )
    print("Successfully created database")
except:
    print("error in creating database")


# Create Glue Crawler 
try:
    response = client.create_crawler(
        Name=CRAWLER_NAME,
        Role='AWSGlueServiceRole-glueworkshop',
        DatabaseName='python-glueworkshop',
        Targets={
            'S3Targets': [
                {
                    'Path': 's3://{BUCKET_NAME}/input/lab1/csv'.format(BUCKET_NAME = BUCKET_NAME),
                },
                {
                    'Path': 's3://{BUCKET_NAME}/input/lab5/json'.format(BUCKET_NAME = BUCKET_NAME),
                }
            ]
        },
        TablePrefix='python_glueworkshop_'
    )
    print("Successfully created crawler")
except:
    print("error in creating crawler")

# This is the command to start the Crawler
try:
    response = client.start_crawler(
        Name=CRAWLER_NAME
    )
    print("Successfully started crawler")
except:
    print("error in starting crawler")
