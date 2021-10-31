=== add new GSI to employees===
aws dynamodb update-table --table-name employees \
--attribute-definitions AttributeName=is_manager,AttributeType=S AttributeName=title,AttributeType=S \
--global-secondary-index-updates file://gsi_manager.json

[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb describe-table --table-name employees | grep IndexStatus
                "IndexStatus": "CREATING", 
                "IndexStatus": "ACTIVE", 
[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb wait table-exists --table-name employees
[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb describe-table --table-name employees | grep IndexStatus
                "IndexStatus": "ACTIVE", 
                "IndexStatus": "ACTIVE", 


query table: 
fe = "is_manager = :f"
eav = {":f": 1}
response = table.scan(
  FilterExpression=fe,
  ExpressionAttributeValues=eav,
  Limit=pageSize
)

[ec2-user@ip-172-31-37-202 workshop]$ python query_managers_table.py employees 100
Managers count: 84. # of records scanned: 4000. Execution time: 0.533272981644 seconds

query table with sparse index
response = table.scan(
Limit=pageSize,
IndexName=’gsi_manager’
)
[ec2-user@ip-172-31-37-202 workshop]$ python query_managers_gsi.py employees 100
Number of managers: 84. # of records scanned: 84. Execution time: 0.157690048218 seconds