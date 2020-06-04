# Automate the Athena query

## Use single lambda file
1. Build the lambda function deployment package
```bash
mkdir package && cd package
pip install retrying -t ./
pip install boto3 -t ./
chmod -R 755 .
zip -r9 ../function.zip .

cd .. && zip -g function.zip basic-athena-query-lambda.py
```

2. Create lambda function
```bash
aws lambda create-function --function-name  BasicAthenaQuery --runtime python3.7 \
--zip-file fileb://function.zip --handler basic-athena-query-lambda.lambda_handler \
--role arn:aws-cn:iam::$account_id:role/lambda_basic_execution \
--timeout 300 --memory-size 256

aws lambda invoke --function-name BasicAthenaQuery \
--payload '{ "database": "sampledb", "table": "user_email", "s3_location": "s3://ray-datalake-lab/sample/user_email" }' \
out --log-type Tail --query 'LogResult' --output text |  base64 -d

cat out 
#[{"name": "user1", "email": "user1@example.com"}, {"name": "user2", "email": "user2@example.com"}, {"name": "user3", "email": "user3@example.com"}, {"name": "user4", "email": "user4@example.com"}, {"name": "user5", "email": "user5@example.com"}, {"name": "user6", "email": "user6@example.com"}]

zip -g function.zip basic-athena-query-lambda.py
aws lambda update-function-code --function-name BasicAthenaQuery \
--zip-file fileb://function.zip
```

3. cleanup
```bash
# lambda
aws lambda delete-function --function-name BasicAthenaQuery
```

Every 2 hour, I need execute the 
1. Create external Table CSV
2. Get Payload
3. Create Target table JSON
4. Insert Payload


https://pypi.org/project/pythena/