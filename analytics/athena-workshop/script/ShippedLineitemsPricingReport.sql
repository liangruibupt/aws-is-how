SELECT "line:l_returnflag","line:l_linestats",
                            sum(cast("line:l_quantity" AS double)) AS sum_qty,
                            sum(cast("line:l_extendedprice" AS double)) AS sum_base_price,
                            sum(cast("line:l_extendedprice" AS double)*(1-cast("line:l_discount" AS double))) AS sum_disc_price,
                            sum(cast("line:l_extendedprice" AS double)*(1-cast("line:l_discount" AS double))*(1+cast("line:l_tax" AS double))) AS sum_charge,
                            avg(cast("line:l_quantity" AS double)) AS avg_qty,
                            avg(cast("line:l_extendedprice" AS double)) AS avg_price,
                            avg(cast("line:l_discount" AS double)) AS avg_disc,
                            count(*) AS count_order
                            FROM "lambda:hbase".default.lineitem 
                            GROUP BY  "line:l_returnflag", "line:l_linestats"
                            ORDER BY  "line:l_returnflag", "line:l_linestats";