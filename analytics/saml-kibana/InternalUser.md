# SAML Authentication for Kibana

When you authentication for Kibana, you can
1. Authenticating through Amazon Cognito
**2. Authenticating through the Fine-grained access control [internal user database](https://docs.amazonaws.cn/en_us/elasticsearch-service/latest/developerguide/fgac.html#fgac-kibana)**
3. SAML authentication for Kibana lets you use your existing identity provider to offer single sign-on (SSO) for Kibana on domains running `Elasticsearch 6.7 or later`. To use this feature, you must enable `fine-grained access control`.

## Create a domain and authenticate through internal user database
1. Create a domain with the following settings:
- Elasticsearch 7.8
- Private access
- Fine-grained access control with a master user in the internal user database (TheMasterUser for the rest of this tutorial)
- Amazon Cognito authentication for Kibana disabled
- access policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "*"
        ]
      },
      "Action": [
        "es:*"
      ],
      "Resource": "arn:aws-cn:es:cn-north-1:account:domain/domain-name/*"
    }
  ]
}
```
- HTTPS required for all traffic to the domain
- Node-to-node encryption
- Encryption of data at rest

2. Sign in Kibana using `TheMasterUser` and `Try our sample data` for `Sample flight data`

3. Assign different permission for internal user or role
- `Security`->`Internal User Database`->`Create internal user` with name `new-user`
- `Security`->`Role`->`Create role` with name `new-flight-role` 
  - `Index Permissions` specify the `kibana_sample_data_fli*` as index pattern 
  - `action group` as `read`
  - `Document Level Security Query` with 
  ```json
  {
    "match": {
        "FlightDelay": true
    }
   }
  ```
  - `Exclude fields` with `FlightNum`
  - ` Anonymize fields` with `Dest`
- `Security`->`Role Mappings`
  - Map `new-user` with `new-flight-role`
  - Map `new-user` with `kibana_user`

4. open a new private browser window and sign in Kibana with `new-user`
- run query
    ```json
    GET _search
    {
        "query": {
            "match_all": {}
        }
    }
    ```

    Failed with error `no permissions for [indices:data/read/search] and User [name=new-user, backend_roles=[], requestedTenant=__user__]`

- run query against `kibana_sample_data_flights`
    ```json
    GET kibana_sample_data_flights/_search
    {
        "query": {
            "match_all": {}
        }
    }
    ```

    Return the index documents

5. Run above queries with `TheMasterUser`, all queries can Return the index documents


**Limitations for internal user database authentication**

Users in the internal user database can't change their own passwords. Master users (or users with equivalent permissions) must change their passwords for them.