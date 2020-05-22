# Connect to Your Existing AD Infrastructure

## AWS Managed Microsoft AD
[Connect to Your Existing AD Infrastructure for Managed Microsoft AD](https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_connect_existing_infrastructure.html)

You can configure one and two-way external and forest trust relationships between your AWS Directory Service for Microsoft Active Directory and on-premises directories, as well as between multiple AWS Managed Microsoft AD directories in the AWS cloud. AWS Managed Microsoft AD supports all three trust relationship directions: Incoming, Outgoing and Two-way (Bi-directional). 

## Active Directory Connector

[Active Directory Connector guide](https://docs.aws.amazon.com/directoryservice/latest/admin-guide/directory_ad_connector.html)

AD Connector is a directory gateway (acting as a proxy) with which you can redirect directory requests to your on-premises Microsoft Active Directory without caching any information in the cloud. When connected to your existing directory, all of your directory data remains on your domain controllers. AWS Directory Service does not replicate any of your directory data. 

When the AWS service must look up a user or group in Active Directory, AD Connector proxies the request to the directory. When a user logs in to the AWS service, AD Connector proxies the authentication request to the directory. There are no third-party applications that work with AD Connector. 

For example:

- Your end users and IT administrators can use their existing corporate credentials to log on to AWS applications such as Amazon WorkSpaces, Amazon WorkDocs, or Amazon WorkMail.

- You can use AD Connector to authenticate AWS Management Console users with their Active Directory credentials without setting up SAML infrastructure. 
[Enable Access to the AWS Management Console with AD Credentials](https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_management_console_access.html)

- You can use AD Connector to enable multi-factor authentication MFA

You can spread application loads across multiple AD Connectors to scale to your performance needs. There are no enforced user or connection limits. 


