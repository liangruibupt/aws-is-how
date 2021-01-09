USING FUNCTION detect_anomaly(b INT) RETURNS DOUBLE 
                            TYPE SAGEMAKER_INVOKE_ENDPOINT
                            WITH (sagemaker_endpoint = 'randomcutforest-2021-01-09-16-15-43-110')
                            SELECT o_orderdate,
                            count(*) as number,
                            detect_anomaly(cast(count(*) as int))
                            FROM "lambda:mysql".sales.orders
                            Group By o_orderdate
                            ORDER BY detect_anomaly(cast(count(*) as int)) DESC limit 10;