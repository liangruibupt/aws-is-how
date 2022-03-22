You can enable encryption for an Amazon RDS DB instance when you create it, but not after it's created.

However, you can add encryption to an unencrypted DB instance by creating a snapshot of your DB instance, and then creating an encrypted copy of that snapshot. You can then restore a DB instance from the encrypted snapshot to get an encrypted copy of your original DB instance.
[Encrypt RDS Snapshot](https://aws.amazon.com/premiumsupport/knowledge-center/encrypt-rds-snapshots/?nc1=h_ls)

The pattern uses AWS Database Migration Service (AWS DMS) to migrate data and AWS Key Management Service (AWS KMS) for encryption.
[Encrypt an existing Amazon RDS PostgreSQL DB instance, using DB snapshots, AWS DMS, and AWS KMS, with minimal downtime](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/encrypt-an-existing-amazon-rds-for-postgresql-db-instance.html)


