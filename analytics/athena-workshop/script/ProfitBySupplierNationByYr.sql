SELECT nation,
                            o_year,
                            sum(amount) AS sum_profit
                    FROM 
                        (SELECT n_name AS nation,
                            year(cast(o_orderdate AS date)) AS o_year,
                            "line:l_extendedprice" * (1 - "line:l_discount") - cast(ps_supplycost AS double) * "line:l_quantity" AS amount
                        FROM "lambda:dynamo".default.part, "lambda:mysql".sales.supplier, "lambda:hbase".default.lineitem, "lambda:dynamo".default.partsupp, "lambda:mysql".sales.orders, "lambda:redis".redis.nation
                        WHERE s_suppkey = "line:l_suppkey"
                                AND ps_suppkey = "line:l_suppkey"
                                AND ps_partkey = "line:l_partkey"
                                AND p_partkey = "line:l_partkey"
                                AND o_orderkey = "line:l_orderkey"
                                AND s_nationkey = cast(Regexp_extract(_key_, '.*-(.*)', 1) AS int)
                                AND p_name LIKE '%green%' ) AS profit
                    GROUP BY  nation, o_year
                    ORDER BY  nation, o_year desc;