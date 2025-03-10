# Retail Cart Scenario
An online retail store website serves customers and the products they view, save, and purchase. The website traffic is currently low, but they want to be able to serve millions of concurrent customers.

- Customers interact with products that can be ACTIVE, SAVED, or PURCHASED. Once they are PURCHASED they will be assigned an OrderId.
- Products have the following attributes: AccountID, Status (ACTIVE, SAVED, or PURCHASED), CreateTimestamp, and ItemSKU (Total item size is <= 1 KB).
- When a customer opens the retail store’s application, they view the active products in their cart, which are organized by most recently added.
- Users can view products that they have saved for later, which are organized by most recently saved.
- Users can view products that they have purchased, which are organized by most recently purchased.
- Product teams have the ability to regularly query across all customers to identify the people who have a specific product in their account that is either ACTIVE, SAVED, or PURCHASED.
- The Business Intelligence team needs to run a number of complex ad hoc queries against the dataset to create weekly and monthly reports.

Access patterns:
- Insert and update items placed in a cart by users.
- Return items related to a user (AccountID), sorted by CreateTimestamp, and scoped to a specific Status.
- Return items across user by ItemSKU, sorted by CreateTimestamp, and scoped to a specific Status.
- Offline ad hoc queries for Business Intelligence team.

Design:
- PK: AccountID, 
- SK: CreateTimestamp
- Sparse SK: Status

