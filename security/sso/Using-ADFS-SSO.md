# Enabling Federation to AWS console using Windows Active Directory, ADFS, and SAML 2.0

## How Federation Between ADFS and AWS Works

![enablingfederation_wierer_diagram1](media/enablingfederation_wierer_diagram1.png)

1. The user Bob browses to the ADFS sample site (https://ADFS/adfs/ls/IdpInitiatedSignOn.aspx). When you install ADFS, you get a new virtual directory named `adfs` for your default website, which includes this page
2. The sign-on page authenticates Bob against AD. Bob be prompted for his AD username and password. After submission, ADFS will contact AD for user authentication
3. Bob’s browser receives a SAML assertion in the form of an authentication response from ADFS.
4. Bob’s browser posts the SAML assertion to the AWS sign-in endpoint for SAML (https://signin.aws.amazon.com/saml). Sign-in uses the AssumeRoleWithSAML API to request temporary security credentials and then constructs a sign-in URL for the AWS Management Console.
5. Bob’s browser receives the sign-in URL and is redirected to the console.

From Bob’s perspective, the process happens transparently. He starts at an internal web site and ends up at the AWS Management Console, without ever having to supply any AWS credentials.

## Configuring Active Directory

Use the [CloudFormation template](scripts/Windows_Single_Server_Active_Directory.template) to quickly launch an Amazon EC2 Windows instance as a Windows AD domain controller. 

![cloudfromation-slack](media/cloudfromation-slack.png)

For demonstration purposes, Bob who is a member of two AD groups (AWS-Production and AWS-Dev) and a service account (ADFSSVC) used by ADFS. 

**Note that the names of the AD groups both start with AWS-**. This is significant, because Bob’s permission to sign in to AWS will be based on a match of group names that start with `AWS-`.

### Login EC2 of DomainController

You can find the RDP connection and login info from the CloudFormation stack output.

### Perform the following in your domain:

1. Create two AD Groups named AWS-Production (Admin permission) and AWS-Dev (ReadOnly permission). These 2 groups will map the IAM Role created in AWS.
2. Create a user named Bob, give Bob an email address as bob@DomainControllerDNSName, here is bob@tsp.example.com.
3. Add Bob to the AWS-Production and AWS-Dev groups.
4. Create another user named ADFSSVC. This account will be used as the ADFS service account later on.

## Install and configure ADFS

### Installing ADFS

We can refer to the following documents to deploy ADFS services: https://technet.microsoft.com/en-us/library/dn486775.aspx

1. Open `Server Manager`. 
2. In the `Quick Start` tab of the Welcome tile on the `Dashboard` page, click `Add roles and features`. 
3. On the Select `installation type` page, click `Role-based or Feature-based installation`, and then click Next.
4. On the Select destination server page, click `Select a server from the server pool`, verify that the target computer is selected, and then click Next.
5. On the Select server roles page, click `Active Directory Federation Services`, and then click Next.
6. On the Select features page, click Next. The required prerequisites are preselected for you. You do not have to select any other features.
7. On the `Active Directory Federation Service (AD FS)` page, click Next.
8. After you verify the information on the Confirm installation selections page, click `Install`.
9. On the Installation progress page, verify that everything installed correctly, and then click Close.

### Configuring ADFS
1. Install the Web Server (IIS) Manager.
  - Open `Server Manager` and click `Manage > Add Roles and Features`. Click Next.
  - Select `Role-based or feature-based installation` and click Next.
  - Select the appropriate server. The local server is selected by default. Click Next.
  - Enable `Web Server (IIS)` and click Next.
  - No additional features are necessary to install the Web Adaptor, so click Next.
  - On the `Web Server Role (IIS)` dialog box, click Next.
  - On the Select `role services` dialog box, verify that the `Web Server` components listed below are enabled. Click Next.
  - Verify that your settings are correct and click `Install`.
  - When the installation completes, click `Close` to exit the wizard.

2. Create the SSL Certificate via IIS

  - Launch the IIS Manager

    https://support.sophos.com/support/s/article/KB-000038223?language=en_US
    
    https://aboutssl.org/how-to-create-self-signed-certificate-for-windows-server-2012-r2/

    ![IIS-SelfSign-Certificate](media/IIS-SelfSign-Certificate.png)

  - Create Self Signed Certificate

    ![Create-Certificate](media/Create-Certificate.png)

  - Bind the Self Signed Certificate
    ![bind-certificate](media/bind-certificate.png)

3. Configure a Federation Server

  - Configure the federation service on the server.
  
  The Active Directory Federation Service Configuration Wizard opens.

  - Select `Create the first federation server in a federation server farm`, and then click Next.

  ![configure-ADFS-Launch](media/configure-ADFS-Launch.png)

  - On the `Connect to AD DS` page, specify `an account by using domain administrator permissions for the Active Directory (AD) domain` to which this computer is joined, and then click Next.

  ![configure-ADFS-Connect-ADFS](media/configure-ADFS-Connect-ADFS.png)

  - `Specify Service Properties` page, select the `SSL certificate` created in above. 

  ![configure-ADFS-SSL-Properties](media/configure-ADFS-SSL-Properties.png)

  - On the `Specify Service Account` page, select the `ADFSSVC` user

  ![configure-ADFS-Service-Account](media/configure-ADFS-Service-Account.png)

  - On the `Specify Configuration Database` page, select `create a database on this computer by using Windows Internal Database (WID)`

  - Other page accept default setting and `Install`

  ![configure-ADFS-Result](media/configure-ADFS-Result.png)

  The error message turns out this is a known issue that can be fixed by running the following at the command line. (Make sure you run the command window as an administrator.)
  ```
  setspn -a host/localhost adfssvc
  ```
  Note that is the name of the service account `adfssvc`.

  ```
  Checking domain DC=tsp,DC=example,DC=com

  Registering ServicePrincipalNames for CN=ADFSSVC,CN=Users,DC=tsp,DC=example,DC=com
        host/localhost
  Updated object
  ```

4. Configure Corporate DNS for the Federation Service and DRS
  - On you domain controller, in `Server Manager`, on the `Tools` menu, click `DNS`
  - In the console tree, expand the `domain_controller_name` node, expand `Forward Lookup Zones`, right-click `tps.example.com`, and then click `New Host (A or AAAA)`.
  - Add the private IP of EC2 to map the `adfs.tps.example.com`

  ![configure-ADFS-DNS-NewHost](media/configure-ADFS-DNS-NewHost.png)

5. Verify That a Federation Server Is Operational

  - In the Windows EC2, open the https://adfs.tsp.example.com/adfs/fs/federationserverservice.asmx
  
    The expected output is a display of XML with the service description document. If this page appears, IIS on the federation server is operational and serving pages successfully.

  ![configure-ADFS-verify1](media/configure-ADFS-verify1.png)

  - On the `Start` screen, type `Event Viewer`. In the details pane, double-click `Applications and Services Logs`, double-click `AD FS Eventing`, and then click `Admin`.
   
    In the `Event ID` column, look for `event ID 100`. If the federation server is configured properly, you see

  ![configure-ADFS-Event-ID-100](media/configure-ADFS-Event-ID-100.png)



## Configuring AWS

1. Export SAML Metadata Document from https://adfs.tsp.example.com/FederationMetadata/2007-06/FederationMetadata.xml

2. Create the SAML providers on AWS IAM console

    The Metadata Document use the one at #1

![configure-ADFS-AWS-Identity-provider](media/configure-ADFS-AWS-Identity-provider.png)

3. Created two IAM roles 

    Created two IAM roles using the `Grant Web Single Sign-On (WebSSO) access to SAML providers role wizard` template and specified the `ADFS` SAML provider that just created. 

    The two roles `ADFS-Production` and `ADFS-Dev`, use **exactly the same names that AD groups created earlier**. During the SAML authentication process in AWS, these IAM roles will be matched by name to the AD groups (AWS-Production and AWS-Dev) via ADFS claim rules.

4. Record the ARNs for the SAML provider and IAM Role

    Find the ARNs for the SAML provider and for the roles that you created and record them. You’ll need the ARNs later when you configure claims in the IdP.

## Configuring AWS as a Trusted Relying Party
1. Add the Trusted Relying Party

    Add Relying Party Trust Wizard

![configure-ADFS-Trust-Relationship](media/configure-ADFS-Trust-Relationship.png)

2. Import data about the relying party published online or on a local network

    The valid value: https://signin.amazonaws.cn/static/saml-metadata.xml

![configure-ADFS-Trust-Relationship-Source-Data](media/configure-ADFS-Trust-Relationship-Source-Data.png)

3. Set the display name for the relying party as `AWS-CN`.

![configure-ADFS-Trust-Relationship-DisplayName](media/configure-ADFS-Trust-Relationship-DisplayName.png)

4. Do not enable the MFA

![configure-ADFS-Trust-Relationship-MFA](media/configure-ADFS-Trust-Relationship-MFA.png)

5. Choose your authorization rules. 

    `Permit all users to access this relying party`. When you’re done, click Next.

![configure-ADFS-Trust-Relationship-Authorization](media/configure-ADFS-Trust-Relationship-Authorization.png)

6. Review your settings and then click Next.

7. Check `Open the Edit Claim Rules dialog for this relying part trust when the wizard closes` and then click `Close`.

![configure-ADFS-Trust-Relationship-Finish](media/configure-ADFS-Trust-Relationship-Finish.png)

## Configuring Claim Rules for the AWS Relying Party

1. Edit `Claim Rules for AWS-CN` dialog box, click `Add Rule`.

![configure-ADFS-Claim-Rule-Create](media/configure-ADFS-Claim-Rule-Create.png)

2. Select `Transform an Incoming Claim` and then click Next.

![configure-ADFS-Claim-Transform-Claim](media/configure-ADFS-Claim-Transform-Claim.png)

3. Use the following settings:
- a.  Claim rule name: `NameId`
- b.  Incoming claim type: `Windows Account Name`
- c.  Outgoing claim type: `Name ID`
- d.  Outgoing name ID format: `Persistent Identifier`
- e.  Checked `Pass through all claim values`

![configure-ADFS-Claim-Rule-Define](media/configure-ADFS-Claim-Rule-Define.png)

4. Finish

5. Adding a `RoleSessionName`
- Click `Add Rule`
- In the  `Claim rule template` list, select `Send LDAP Attributes as Claims`.

![configure-ADFS-Claim-LDAP](media/configure-ADFS-Claim-LDAP.png)

6. Use the following settings:
- a. Claim rule name: `RoleSessionName`
- b. Attribute store: `Active Directory`
- c. LDAP Attribute: `E-Mail-Addresses`
- d. Outgoing Claim Type : `https://aws.amazon.com/SAML/Attributes/RoleSessionName`

![configure-ADFS-Claim-LDAP2](media/configure-ADFS-Claim-LDAP2.png)

7. Click Finish

8. Adding Role Attributes
- Click `Add Rule`.
- In the `Claim rule template` list, select `Send Claims Using a Custom Rule` and then click  Next.

![configure-ADFS-Claim-CustomRule](media/configure-ADFS-Claim-CustomRule.png)

9. For `Claim Rule Name`, set `Get AD Groups`, and then in `Custom rule`, enter the following:

这一步用来取出登录用户所在的AD用户组, 并将其传入到临时声明 http://temp/variable中)

```
c:[Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/windowsaccountname", Issuer == "AD AUTHORITY"] => add(store = "Active Directory", types = ("http://temp/variable"), query = ";tokenGroups;{0}", param = c.Value);
```

![configure-ADFS-Claim-CustomRule2](media/configure-ADFS-Claim-CustomRule2.png)

10. Click Finish

11. Adding Role Attributes
- Click `Add Rule`.
- In the `Claim rule template` list, select `Send Claims Using a Custom Rule` and then click  Next.

12. For `Claim Rule Name`, set `Roles`, and then in `Custom rule`, enter the following:

这部分主要是用来映射AD中的用户组 和 AWS中的角色之间的对应关系, 其中红色部分需要根据我们前面所建的AD用户组名称 和 身份提供商的ARN和角色的ARN调整

```
c:[Type == "http://temp/variable", Value =~ "(?i)^AWS-"] => issue(Type = "https://aws.amazon.com/SAML/Attributes/Role", Value = RegExReplace(c.Value, "AWS-", "arn:aws-cn:iam::account-id:saml-provider/ADFS,arn:aws-cn:iam::account-id:role/ADFS-"));
```

![configure-ADFS-Claim-CustomRule3](media/configure-ADFS-Claim-CustomRule3.png)

13. Click `Finish` and `OK`

## Active Directory Federation Service

![configure-ADFS-Restart-ADFS](media/configure-ADFS-Restart-ADFS.png)

## Testing 

1. Login page
Using Firefox Browser on EC2 and login to https://adfs.tsp.example.com/adfs/ls/IdpInitiatedSignOn.aspx

    If you login page can not show `login button`, try to set `Set-AdfsProperties -EnableIdPInitiatedSignonPage $true`

![configure-ADFS-login-page](media/configure-ADFS-login-page.png)

2. Input the `bob@tsp.example.com` and Password

3. Redirect to AWS console and allow you choice the Role

Select `ADFS-Dev` Role which has S3ReadOnlyAccess Permission

![configure-ADFS-login-page-aws](media/configure-ADFS-login-page-aws.png)

4. The AWS console are show up for Bob under `ADFS-Dev`

![configure-ADFS-Bob-login](media/configure-ADFS-Bob-login.png)

5. Navigate to EC2 console and try to launch a new instance, it should promote `no Auhorized to perform operation`

![configure-ADFS-Bob-EC2](media/configure-ADFS-Bob-EC2.png)

6. Navigate to S3 console, you can review the files under S3 bucket

![configure-ADFS-Bob-S3](media/configure-ADFS-Bob-S3.png)

## Troubleshotting:
1. After select the IAM Role on login page InvalidIdentityToken reported:
```
RoleSessionName is required in AuthnResponse (Service: AWSSecurityTokenService; Status Code: 400; Error Code: InvalidIdentityToken; Request ID: 0fcdf264-013b-4e23-abf8-82b56083b454; Proxy: null). Please try again.
```

Check the Email address has been set to login user in here Bob (bob@tsp.example.com)

![configure-ADFS-Bob-Email](media/configure-ADFS-Bob-Email.png)

More details please check [Troubleshooting SAML 2.0 federation with AWS](https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_saml.html)

# Reference
[为AWS北京区管理控制台集成ADFS访问](https://aws.amazon.com/cn/blogs/china/adfs-bjs/)