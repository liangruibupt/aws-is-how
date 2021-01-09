USING FUNCTION redact(col1 VARCHAR) RETURNS VARCHAR TYPE LAMBDA_INVOKE
                WITH (lambda_name = 'customudf')
                SELECT c_name,
                        redact(c_name) AS redact_name ,
                        c_phone,
                        redact(c_phone) AS redact_phone ,
                        c_address,
                        redact(c_address) AS redact_address
                FROM "lambda:redis".redis.active_orders ao
                LEFT JOIN "lambda:mysql".sales.orders o
                    ON ao.orderkey = o_orderkey
                LEFT JOIN "lambda:mysql".sales.customer c
                    ON o_custkey = c_custkey
                WHERE c_address != '' ;