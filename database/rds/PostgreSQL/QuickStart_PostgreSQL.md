## Create the RDS PostgreSQL database and table
```bash
# On Baston machine
aws rds create-db-instance \
    --db-instance-identifier database-1 --db-instance-class db.m5.xlarge \
    --engine postgres \
    --multi-az \
    --engine-version 13.4 \
    --db-subnet-group-name default-vpc-086f9e6ad85f4649f \
    --vpc-security-group-ids sg-02205c5739ad8feec \
    --allocated-storage 20 \
    --master-username postgres \
    --master-user-password <Your_password>

aws rds describe-db-instances --db-instance-identifier database-1 | jq .DBInstances[0].DBInstanceStatus

sudo amazon-linux-extras install postgresql13

aws rds describe-db-instances --db-instance-identifier database-1 | jq .DBInstances[0].Endpoint

psql --host=DB_instance_endpoint --port=port --username=postgres --dbname=postgres --password

```

```sql
CREATE DATABASE mydb;
\connect mydb

create table dummy_table(name varchar(20),address text,age int);

insert into dummy_table values('XYZ','location-A',25);
insert into dummy_table values('ABC','location-B',35);
insert into dummy_table values('DEF','location-C',40);
insert into dummy_table values('PQR','location-D',54);

update dummy_table set age=50 where name='PQR';
update dummy_table set name='GHI',age=54 where address='location-D';

select * from dummy_table;

\q
```

## To migrate an RDS for PostgreSQL DB snapshot to an Aurora PostgreSQL DB cluster
```bash
aws rds create-db-snapshot --db-instance-identifier database-1 --db-snapshot-identifier postgre1304-snapshot

# Get the snapshot-identifier
aws rds describe-db-snapshots --db-instance-identifier database-1 | jq .DBSnapshots[0].Status
aws rds describe-db-snapshots --db-instance-identifier database-1 | jq .DBSnapshots[0].DBSnapshotArn


# Use the restore-db-cluster-from-snapshot command to start the migration. 
aws rds restore-db-cluster-from-snapshot \
    --db-cluster-identifier mypg-aurora1304 \
    --snapshot-identifier arn:aws-cn:rds:cn-north-1:111122223333:snapshot:rds:database-1-2022-07-07-08-12 \
    --engine aurora-postgresql \
    --engine-version 13.4 \
    --db-subnet-group-name default-vpc-086f9e6ad85f4649f \
    --vpc-security-group-ids sg-02205c5739ad8feec

# Check status
aws rds describe-db-clusters --db-cluster-identifier mypg-aurora1304 | jq .DBClusters[0].Status

# When the DB cluster becomes "available", you use create-db-instance command to populate the Aurora PostgreSQL DB cluster with the DB instance based on your Amazon RDS DB snapshot.
aws rds create-db-instance \
    --db-cluster-identifier mypg-aurora1304 \
    --db-instance-identifier mypg-aurora --db-instance-class db.r5.xlarge \
    --engine aurora-postgresql

aws rds describe-db-instances --db-instance-identifier mypg-aurora | jq .DBInstances[0].DBInstanceStatus
aws rds describe-db-instances --db-instance-identifier database-1 | jq .DBInstances[0].Endpoint
```

## Validation
```sql
aws rds describe-db-instances --db-instance-identifier mypg-aurora | jq .DBInstances[0].Endpoint

psql --host=DB_instance_endpoint --port=port --username=postgres --dbname=postgres --password

\l
\dt

select * from dummy_table;

\q
```

## Cleanup
```bash
aws rds delete-db-instance --db-instance-identifier mypg-aurora --skip-final-snapshot \
--delete-automated-backups

aws rds delete-db-instance --db-instance-identifier database-1 --skip-final-snapshot \
--delete-automated-backups

aws rds delete-db-cluster --db-cluster-identifier mypg-aurora1304 --skip-final-snapshot
```