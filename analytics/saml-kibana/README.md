# SAML Authentication for Kibana

When you authentication for Kibana, you can
1. Authenticating through Amazon Cognito
2. Authenticating through the Fine-grained access control [internal user database](https://docs.amazonaws.cn/en_us/elasticsearch-service/latest/developerguide/fgac.html#fgac-kibana)
3. SAML authentication for Kibana lets you use your existing identity provider to offer single sign-on (SSO) for Kibana on domains running `Elasticsearch 6.7 or later`. To use this feature, you must enable `fine-grained access control`.

## Authenticate through internal user database
[Create a Elastic Search domain and authenticate through internal user database](InternalUser.md)

## SAML Authentication for Kibana

- [Okta as Identity Provider](Okta.md)
- [Active_Directory as Identity Provider](Active_Directory.md)