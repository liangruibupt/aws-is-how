SELECT "line:l_orderkey",
                    sum("line:l_extendedprice"*(1-"line:l_discount")) AS revenue,
                    o_orderdate,
                    o_shippriority
                    FROM "lambda:mysql".sales.customer c, "lambda:mysql".sales.orders o, "lambda:hbase".default.lineitem l
                    WHERE c_mktsegment = 'AUTOMOBILE'
                    AND c_custkey = o_custkey
                    AND "line:l_orderkey" = o_orderkey
                    GROUP BY  "line:l_orderkey", o_orderdate, o_shippriority
                    ORDER BY  revenue desc, o_orderdate
                    limit 10;