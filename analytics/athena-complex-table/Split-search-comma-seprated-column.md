# Split and search comma separated column

I have the following table my_table, where both the columns are strings

|     user_id|        code |
| ---------- | ----------- |
|      ABC123|  yyy,123,333|
|        John|  xxx,USA,555|
|      qwerty|  55A,AUS,666|
|      Thomas|  zzz,666,678|

I need to get all the user_id that have either of yyy or 666 in their code column value.

Code:
```sql
WITH dataset AS (
     SELECT 
       user_id,
       regexp_like(code, '(^|,)(666|yyy)(,|$)') AS code 
       FROM my_table
)
SELECT user_id from dataset where code=true
```

Result

|     user_id|
|------------|
|      ABC123|
|      qwerty|
|      Thomas|