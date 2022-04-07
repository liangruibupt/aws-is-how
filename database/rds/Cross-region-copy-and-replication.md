# DB Snapshot cross region copy and backup cross region replication 

## Backup cross region replication 
- When backup replication is configured for a DB instance, RDS initiates a cross-Region copy of all snapshots and transaction logs as soon as they are ready on the DB instance. Backup replication is available for RDS DB instances running the following database engines:
  * Oracle Database version 12.1.0.2.v10 and higher
  * PostgreSQL version 9.6 and higher
  * Microsoft SQL Server version 2012 and higher. Backup replication isn't supported for encrypted SQL Server DB instances.
- Guide: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html
 
## DB Snapshot cross region copy
- You can't copy a snapshot global region to or from the China (Beijing) or China (Ningxia) Regions. But you can copy between China (Beijing) and China (Ningxia) Regions.
- Guide: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html
- How to Copy
    - CLI – If you are copying the snapshot to a new AWS Region, run the command in the new AWS Region.
    ```bash
    # Copy
    aws rds copy-db-snapshot \
        --source-db-snapshot-identifier arn:aws-cn:rds:cn-north-1:876820548815:snapshot:bjs-mysql8-2022 \
        --target-db-snapshot-identifier mydbsnapshotcopy \
    --region cn-northwest-1 --profile china_ruiliang

    # Check
    aws rds describe-db-snapshots --db-snapshot-identifier mydbsnapshotcopy \
    --region cn-northwest-1 --profile china_ruiliang
    ```
    - Console: To copy the DB snapshot to a different AWS Region, for Destination Region, choose the new AWS Region.