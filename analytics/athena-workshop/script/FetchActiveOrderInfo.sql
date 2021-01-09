SELECT *
                    FROM "lambda:redis".redis.active_orders ao
                    LEFT JOIN "lambda:mysql".sales.orders o
                        ON ao.orderkey = o_orderkey
                    LEFT JOIN "lambda:mysql".sales.customer c
                        ON o_custkey = c_custkey
                    LEFT JOIN "lambda:hbase".default.lineitem l
                        ON "line:l_orderkey" = o_orderkey
                    LEFT JOIN "lambda:dynamo".default.part p
                        ON "line:l_partkey" = p.p_partkey
                    LEFT JOIN "lambda:dynamo".default.partsupp ps
                        ON p.p_partkey = ps.ps_partkey
                    LEFT JOIN "lambda:mysql".sales.supplier s
                        ON ps_suppkey = s_suppkey;