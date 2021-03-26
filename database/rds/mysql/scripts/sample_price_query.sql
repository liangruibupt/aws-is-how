SELECT maker_key, model_key, mileage, engine_power, registration_date, fuel, paint_color, car_type, feature_1, feature_2, feature_3, feature_4, feature_5, feature_6, feature_7, feature_8, price, sold_at, id
FROM demo2ebc.bmw_pricing_challenge;

Select paint_color, count(id) 
FROM demo2ebc.bmw_pricing_challenge 
group by paint_color;

Select MAX(mileage) as max_mile, car_type 
FROM demo2ebc.bmw_pricing_challenge 
group by car_type;


SELECT maker_key, model_key, mileage, engine_power, paint_color, car_type, price, sold_at, id
FROM demo2ebc.bmw_pricing_challenge
WHERE car_type IS NOT NULL AND engine_power IS NOT NULL
AND (maker_key = 'BMW')
AND (registration_date BETWEEN TIMESTAMP '2009-03-04 10:00:13.000' AND TIMESTAMP '2014-03-04 10:00:23.000')
ORDER BY registration_date


SELECT maker_key, model_key, mileage, engine_power, paint_color, car_type, price, sold_at, id
CASE car_type WHEN 'Citi Field' THEN 'go' WHEN 'Miller Park' THEN 'caution' WHEN 'Angel Stadium' THEN 'stop' ELSE 'retry' END as instructions 
        FROM sporting_event_info se
        WHERE (se.home_team = 'New York Mets')
        AND (se.away_team = 'Atlanta Braves')
        AND (se.event_date_time BETWEEN TIMESTAMP '2020-04-01 12:00:00.000' AND TIMESTAMP '2020-07-01 12:01:00.000')
        ORDER BY se.sport