# Amazon Redshift - Creating Read Only Users

1. First, create a group that will be used for read only access:
SQL
```sql
create group ro_group;
```

2. Revoke default create rights in the public schema:
```sql
revoke create on schema public from group ro_group;
```

3. Grant usage access in the public schema:
```sql
grant usage on schema public to group ro_group;
```

4. Grant access to current tables in the public schema:
```SQL
grant select on all tables in schema public to group ro_group;
```

5. Grant access to future tables in the public schema:
```SQL
alter default privileges in schema public grant select on tables to group ro_group;
```

6. Create a user:
```SQL
create user ro_user with password '<password>';
```

7. Associate the new user and group:
```SQL
alter group ro_group add user ro_user;
```

8. To create additional read only users, repeat steps 6 and 7.

# Reference
[GRANT](https://docs.aws.amazon.com/redshift/latest/dg/r_GRANT.html)

[Other SQL](https://docs.aws.amazon.com/redshift/latest/dg/c_SQL_commands.html)