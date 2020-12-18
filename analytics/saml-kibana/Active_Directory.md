# SAML Authentication for Kibana

When you authentication for Kibana, you can
1. Authenticating through Amazon Cognito
2. Authenticating through the Fine-grained access control [internal user database](https://docs.amazonaws.cn/en_us/elasticsearch-service/latest/developerguide/fgac.html#fgac-kibana)
3. **SAML authentication for Kibana lets you use your existing identity provider to offer single sign-on (SSO) for Kibana on domains running `Elasticsearch 6.7 or later`. To use this feature, you must enable `fine-grained access control`.**


## SAML Authentication for Kibana - Active Directory as the identity provider

Follow up the guide: [Amazon ElasticSearch SAML Authentication for Kibana](https://docs.amazonaws.cn/en_us/elasticsearch-service/latest/developerguide/saml.html)

The Kibana login flow can take one of two forms:

- Service provider (SP) initiated: You navigate to Kibana (for example, https://<es-domain>/_plugin/kibana), which redirects you to the login screen. After you log in, the identity provider redirects you to Kibana.

- Identity provider (IdP) initiated: You navigate to your identity provider, log in, and choose Kibana from an application directory.

Amazon ES provides two single sign-on URLs, `SP-initiated` and `IdP-initiated`, you can choice any of them

1. Enabling SAML Authentication
- `You domain`->`Actions`->`Modify authentication` -> `Check Enable SAML authentication`.
- Note the service provider entity ID and the two SSO URLs, you only need one of the SSO URLs
```bash
Service provider entity ID: https://<es-domain>

IdP-initiated SSO URL: https://<es-domain>/_plugin/kibana/_opendistro/_security/saml/acs/idpinitiated

SP-initiated SSO URL: https://<es-domain>/_plugin/kibana/_opendistro/_security/saml/acs 
```

2. Configure the Active Directory
- Go to the `ADFS Management` console and select `Relying Party Trusts`

    Right-click on it and select `Add Relying Party Trust`
    ![ad-add-trust](media/ad-add-trust.png)

- Select `Data Source` step

    Select the last option: `Enter data about the relying party manually`
    ![ad-manualy-replying-party](media/ad-manualy-replying-party.png)

- Enter a `Display name`
![ad-displayname](media/ad-displayname.png)

- Select `AD FS profile`
![ad-adprofile](media/ad-adprofile.png)

- Leave the default values for `Configure Certificate`
![ad-certificate](media/ad-certificate.png)

- `Configure URL`, select `Enable support for the SAML 2.0 WebSSO protocol.`

    Enter the value of `SP-initiated SSO URL` on Kibana console
    ![ad-sso-url](media/ad-sso-url.png)

- `Add Relying party trust identifier` 

    Enter the value of `Service provider entity ID` on Kibana console
    ![ad-providerId](media/ad-providerId.png)

- `Do not enable MFA`
![ad-nomfa](media/ad-nomfa.png)

- Next， Choose `Permit all users to access this relying party`
![ad-permission-all](media/ad-permission-all.png)

- Next, Leave the default values
![ad-add-trust-ready](media/ad-add-trust-ready.png)

- On the Final screen

    Select `Open the Edit Claim Rules dialog` and use the `Close` button to exit.
    ![ad-openclaimrule](media/ad-openclaimrule.png)

3. Creating Claims Rules

    ![ad-claimrules](media/ad-claimrules.png)

- Add the first rule as `Email`, Select `Send LDAP Attributes as Claims`
![ad-emailrule](media/ad-emailrule.png)

- Add the second rule as `NameId`, Select `Transform an Incoming Claim`
![ad-nameid](media/ad-nameid.png)

- Add the third rule as `Role`, Select `Send LDAP Attributes as Claims`
![ad-role](media/ad-role.png)

4. Restart Active Directory Federation Service
![configure-ADFS-Restart-ADFS](media/configure-ADFS-Restart-ADFS.png)

5. Create Active Directory
- Group `ESAdmin`
- User `esadminuser@tsp.example.com` belong to `ESAdmin`
- Group `ESRead`
- Login user `esreader@tsp.example.com` belong to `ESRead` 

6. After you configure your identity provider, it generates an IdP metadata file.

    Export SAML Metadata Document from https://adfs.tsp.example.com/FederationMetadata/2007-06/FederationMetadata.xml

- `Import from XML file` button to import `IdP metadata file`
- Copy and paste the `entityID` property from your metadata file into the `IDP entity ID`
- Provide a `SAML master username` (only that user receives full permissions) and/or a `SAML master backend role` (any user who belongs to the group receives full permissions).
![saml-ad-metadata](media/saml-ad-metadata.png)

- Leave the `Subject key` field `empty` to use the `NameID` element of the SAML assertion for the username, you can check the SAML preview to get correct `attribute name`
- Specify `http://schemas.microsoft.com/ws/2008/06/identity/claims/role` from the assertion in the `Role key` field, you can check the SAML preview to get correct `attribute name`
![saml-ad-role-key](media/saml-ad-role-key.png)

- Choose `Submit`. The domain enters a `processing` state for approximately one minute and change to `Active` state

4. Access to kibana via https://es-domain/_plugin/kibana, the Active Directory SAML login window will shown up
![ad-kibana-ad-login](media/ad-kibana-ad-login.png)

- Login user `esadminuser@tsp.example.com` belong to `ESAdmin`

- Tips: view a sample assertion during the process, and tools like [SAML-tracer](https://addons.mozilla.org/en-US/firefox/addon/saml-tracer/)

- A [sample of saml assertion](ad-saml.xml) get from [SAML-tracer](https://addons.mozilla.org/en-US/firefox/addon/saml-tracer/)

5. After Kibana loads, choose `Security` and `Roles`.
`Map` roles to allow other users to access Kibana with different permission

![kibana-role-mapping](media/kibana-role-mapping.png)

- Login user `esreader@tsp.example.com` belong to `ESRead` to verify the read only access to the Kibana

# Reference
[Steps to configure SAML 2.0 SSO with Microsoft Active Directory Federation Services](https://www.ispringsolutions.com/articles/ispring-learn-sso-with-microsoft-active-directory-federation-services)

[SAML Authentication for Kibana](https://docs.amazonaws.cn/en_us/elasticsearch-service/latest/developerguide/saml.html)

