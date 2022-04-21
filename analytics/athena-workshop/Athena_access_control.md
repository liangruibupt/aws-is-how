# Identity and Access Management in Athena

## Amazon Athena uses AWS IAM policies to restrict access to Athena operations.
[Identity and Access Management in Athena official doc](https://docs.aws.amazon.com/athena/latest/ug/security-iam-athena.html)

## The permissions required to run Athena queries include the following:
- You want only certain users to run queries from Athena. Use [AWS-managed IAM policies](https://docs.aws.amazon.com/athena/latest/ug/managed-policies.html) for Athena or custom IAM policies (recommanded)
  - The AmazonAthenaFullAccess allows the user to perform any action on Athena. 
  - The AWSQuicksightAthenaAccess should be assigned to IAM users who use Amazon Quicksight to access Athena.
  - Custom IAM policies 
- Amazon S3 locations where the underlying data to query is stored. 
- Metadata and resources that you store in the AWS Glue Data Catalog, such as databases and tables, including additional actions for encrypted metadata. 
- Athena API actions. 

## Using Workgroups to Control Query Access and Costs
### Overview
We recommend using workgroups to isolate queries for teams, applications, or different workloads. For example, separate workgroups for two different teams in your organization. 
Use workgroups to separate users, teams, applications, or workloads, to set limits on amount of data each query or the entire workgroup can process, and to track costs. You can use resource-level identity-based policies to control access to a specific workgroup. More details check [How Workgroups Work](https://docs.aws.amazon.com/athena/latest/ug/user-created-workgroups.html)
- [Benefits of Using Workgroups](https://docs.aws.amazon.com/athena/latest/ug/workgroups-benefits.html)
- Each workgroup that you create shows saved queries and query history only for queries that ran in it, and not for all queries in the account. 
- Disabling a workgroup prevents queries from running in it, until you enable it. 
- You can set up workgroup-wide settings (include query results S3 bucket) and enforce their usage by all queries that run in a workgroup.
- Limitation
  - You can create up to 1000 workgroups per Region in your account.
  - The primary workgroup cannot be deleted. But you can restrict user to use the primary workgroup 

### Setting up Workgroups
- Follow up the [Guide](https://docs.aws.amazon.com/athena/latest/ug/workgroups-procedure.html)
- Choice the right [Workgroup Policies](https://docs.aws.amazon.com/athena/latest/ug/example-policies-workgroup.html)
    - Example Policy for Full Access to All Workgroups
    - Example Policy for Full Access to a Specified Workgroup
    - Example Policy for Running Queries in a Specified Workgroup
    - Example Policy for Running Queries in the Primary Workgroup
    - Example Policy for Management Operations on a Specified Workgroup
    - Example Policy for Listing Workgroups
    - Example Policy for Running and Stopping Queries in a Specific Workgroup
    - Example Policy for Working with Named Queries in a Specific Workgroup
- [Workgroup Settings](https://docs.aws.amazon.com/athena/latest/ug/workgroups-settings.html)
  - Select the Override Client-Side Settings, if you force queries use the workgroup settings and ignore the client-side settings
- [Before you can run queries, you must specify to Athena which workgroup to use. You must have permissions to the workgroup](https://docs.aws.amazon.com/athena/latest/ug/workgroups-create-update-delete.html#specify-wkgroup-to-athena-in-which-to-run-queries)

