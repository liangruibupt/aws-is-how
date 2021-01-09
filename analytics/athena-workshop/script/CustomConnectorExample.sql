SELECT   year,
         month,
         day,
         account_id,
         transaction.id
         FROM "lambda:example".schema1.table1
WHERE year=2017
        AND month=11;
        
show tables in `lambda:example`.schema1;

describe `lambda:example`.schema1.table1;