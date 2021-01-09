select
                            s_name, count(*) as numwait
                            from
                                "lambda:mysql".sales.supplier,
                                "lambda:hbase".default.lineitem l1,
                                "lambda:mysql".sales.orders
                            where
                                s_suppkey = "line:l_suppkey"
                                and o_orderkey = "line:l_orderkey"
                                and o_orderstatus = 'F'
                                and "line:l_receiptdate" > "line:l_commitdate"
                                and exists (
                                    select * from
                                        "lambda:hbase".default.lineitem
                                    where
                                        "line:l_orderkey" = "line:l_orderkey"
                                )
                            group by s_name
                            order by numwait desc,
                            s_name;