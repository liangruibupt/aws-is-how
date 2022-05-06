# How to disable the encryption of DB instance

1. You can't disable encryption on an encrypted DB instance.

2. You can't create an encrypted snapshot of an unencrypted DB instance.

3. **[Solution]** You can't unencrypt an encrypted DB instance. However, you can export data from an encrypted DB instance and import the data into an unencrypted DB instance.

## Reference
[Overview RDS Encryption](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html)