# Bank Scheduled Payments Scenario 

Items in the table(s) represent payments that are scheduled between accounts. As items are inserted, they are scheduled on a specific date to have the payment processed. Each day, items are regularly sent to a transactional system for processing, at which time their status changes to PENDING. Upon a successful transaction, an item’s status is set to PROCESSED and updated with a new transaction ID.

Scenarios:
- Accounts can have multiple payments scheduled for any day in the future.
- Payments have the following data fields: AccountID, ScheduledDate, Status (SCHEDULED, PENDING or PROCESSED), DataBlob (total item size is <= 8 KB)
- One million automated scheduled payments are added every day at 1:00 AM for that day, which need to complete in 30 minutes.
- One million payments are added every day with the SCHEDULED state, mostly in the hours of 6 AM to 6 PM.
- During the day, a batch job runs regularly to query for today’s SCHEDULED payments. This service sends the SCHEDULED items to the transaction service. Upon sending the items to the transaction service, the payment status is changed to PENDING.
- When the transaction service completes, the status of an item is changed to PROCESSED and a new transaction ID is added to the item.
- Items need to be returned for a specific account that are scheduled for payment in the next 90 days.
- The transactional service has to retrieve all items for a specific date (for example, today) across all accounts. It has to be able to retrieve items that are specifically SCHEDULED or PENDING.
- At the end of each day, all of the items that were PROCESSED need to be moved to a long term table (due to compliance the data needs to be in a separate table). Design a second data model that fulfills that same access requirements as above, and add another requirement to return a specific item associated with a transaction ID.

Access Pattern
- Insert scheduled payments.
- Return scheduled payments by user for the next 90 days.
- Return payments across users for specific date by status (SCHEDULED or PENDING).

Design:
- PK:  AccountID, 
- SK: ScheduledDate
- Sparse SK: Status

