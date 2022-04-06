- [Which relational database engines does Amazon RDS support?](#which-relational-database-engines-does-amazon-rds-support)
- [What does Amazon RDS manage on my behalf?](#what-does-amazon-rds-manage-on-my-behalf)
- [How many databases or schemas can I run within a DB instance?](#how-many-databases-or-schemas-can-i-run-within-a-db-instance)
- [What should I do if my queries seem to be running slowly?](#what-should-i-do-if-my-queries-seem-to-be-running-slowly)
- [How do I scale the compute resources and/or storage capacity associated with my Amazon RDS Database Instance?](#how-do-i-scale-the-compute-resources-andor-storage-capacity-associated-with-my-amazon-rds-database-instance)
- [Backup and Restore](#backup-and-restore)
- [Security consideration](#security-consideration)
- [Audit](#audit)
- [High Availabity](#high-availabity)
- [How to stanardize Amazon RDS configuration?](#how-to-stanardize-amazon-rds-configuration)
  
## Which relational database engines does Amazon RDS support?

    Amazon RDS supports Amazon Aurora (PostgreSQL- and MySQL-compatible editions), MySQL, MariaDB, Oracle, SQL Server, and PostgreSQL database engines.

## What does Amazon RDS manage on my behalf?

    Amazon RDS manages the work involved in setting up a relational database from provisioning the infrastructure capacity, installing the database software. Once your database is up and running, Amazon RDS automates common administrative tasks, such as performing backups and patching the software. With Multi-AZ deployments, Amazon RDS also manages synchronous data replication across Availability Zones with automatic failover.

    You're still responsible for managing the database settings that are specific to your application. You'll need to build the relational schema that best fits your use case and are responsible for any performance tuning to optimize your database.

## How many databases or schemas can I run within a DB instance?

    - RDS for Amazon Aurora (PostgreSQL- and MySQL-compatible editions): No limit imposed by software
    - RDS for MySQL: No limit imposed by software
    - RDS for MariaDB: No limit imposed by software
    - RDS for Oracle: 1 database per instance; no limit on number of schemas per database imposed by software
    - RDS for SQL Server: Up to 100 databases per instance see here: Amazon RDS for SQL Server User Guide
    - RDS for PostgreSQL: No limit imposed by software

## What should I do if my queries seem to be running slowly?

    For production databases we encourage you to enable Enhanced Monitoring, which provides access to over 50 CPU, memory, file system, and disk I/O metrics.

    Each application team can acccess the slow query logs or aggregate to centeral log hub
    - If you are using RDS for MySQL or MariaDB, you can enable the slow query logs by setting Slow_query_log.
    - If you are using RDS for PostgreSQL, you can enable logging of slow queries by setting log_min_duration_statement
    - If you are using RDS for Oracle, you can use the Oracle trace file data to identify slow queries. 
    - If you're using RDS for SQL Server, you can use the client side SQL Server traces to identify slow queries.

    For Amazon Aurora (PostgreSQL- and MySQL-compatible editions), Amazon RDS for PostgreSQL, MySQL, MariaDB, SQL Server and Oracle. Performance Insights, which provides an easy-to-understand dashboard for detecting performance problems in terms of load.

## How do I scale the compute resources and/or storage capacity associated with my Amazon RDS Database Instance?
    - Storage support auto-scale
    - Write workload: Use a large instance type - Scale up; Change the storage type; Use AMazon Aurora; 
    - Read workload: Read replicas take advantage of supported engines' built-in replication functionality to elastically scale out for read-heavy database workloads.

## Backup and Restore
    - Amazon RDS provides two different methods for backing up and restoring your DB instance(s) automated backups and database snapshots (DB Snapshots).
    - The automated backup feature of Amazon RDS enables point-in-time recovery of your DB instance. The latest restorable time is typically within the last five minutes.
    - Amazon RDS retains backups of a DB Instance for a limited, user-specified period of time called the retention period, which by default is 7 days but can be set to up to 35 days.
    - DB Snapshots are user-initiated and enable you to back up your DB instance in a known state as frequently as you wish, and then restore to that specific state at any time. 
    - Amazon RDS DB snapshots and automated backups are stored in S3.

## Security consideration
    - You can create a public-facing subnet for your webservers that has access to the Internet, and place your backend Amazon RDS DB Instances in a private-facing subnet with no Internet access.
    - Controlling network access with security groups
    - Granted least privileges are to the users for your DB Instance
    - Enable encrypt connections between your application and your DB Instance using SSL/TLS
    - Enable encrypt data at rest on my Amazon RDS databases by  AWS Key Management Service (KMS). Amazon RDS for Oracle and SQL Server support those engines' Transparent Data Encryption (TDE) technologies. 
    - You can control the actions that your AWS IAM users and groups can take on Amazon RDS resources.

## Audit
   - If you wish to perform security analysis or operational troubleshooting on the Amazon RDS deployment. You can get a history of all Amazon RDS API calls made on your account via AWS CloudTrail
   - Configuring an audit log to capture database activities for Amazon RDS for MySQL and Amazon Aurora with MySQL compatibility; Configuring SQL Server Audit for RDS SQL Server; Use the pgaudit extension to audit Amazon RDS PostgreSQL; Configuring the audit files for Amazon RDS Oracle

## High Availabity
    - With Multi-AZ deployment, Amazon RDS automatically provisions and maintains a synchronous “standby” replica in a different Availability Zone.
    - During certain types of planned maintenance, or in the unlikely event of DB instance failure or Availability Zone failure, Amazon RDS will automatically failover to the standby so that you can resume database writes and reads as soon as the standby is promoted.
    - In a multi-master cluster, all DB instances can perform write operations. A multi-master cluster can help to avoid an outage when a writer instance becomes unavailable

## How to stanardize Amazon RDS configuration?
    - Using Infra as Code - Terraform / CloudFormation to deploy Amazon RDS instance with your company standards such as enable Multi-AZ deployment for production evironment; enable backup for production evironment; enable audit and encryption at rest / in-transit; enable performance insights and slow query logs etc
    - Build the self-service with GUI based portal for developer to provision Amazon RDS instance with your company standards