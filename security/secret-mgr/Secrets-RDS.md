# Secret for AWS RDS / AWS Redshift
1. Create new Secrets from AWS Secrets Manager Console

Select the RDS connection

![rds1](media/rds1.png)

Select the RDS instance

![rds2](media/rds2.png)

2. Run the [rds-secret-mgr-demo.py](scripts/rds-secret-mgr-demo.py) on EC2 or Lambda