    CREATE OR REPLACE STREAM cleaned_trips (
        pickup_latitude     DOUBLE,    
        pickup_longitude    DOUBLE,    
        dropoff_latitude    DOUBLE,    
        dropoff_longitude   DOUBLE,
        trip_id             BIGINT,
        trip_distance       REAL,
        passenger_count     INTEGER,
        pickup_datetime     TIMESTAMP,
        dropoff_datetime    TIMESTAMP,
        total_amount        REAL
    );
    
    CREATE OR REPLACE PUMP clean_pump AS 
        INSERT INTO cleaned_trips
            SELECT STREAM
                "pickup_latitude", 
                "pickup_longitude", 
                "dropoff_latitude", 
                "dropoff_longitude", 
                "trip_id", 
                "trip_distance", 
                "passenger_count", 
                "pickup_datetime",
                "dropoff_datetime",
                "total_amount"
            FROM source_sql_stream_001
            WHERE "type" LIKE 'trip' AND ("pickup_latitude" <> 0 AND "pickup_longitude" <> 0 AND "dropoff_latitude" <> 0 AND "dropoff_longitude" <> 0);
    
    
    CREATE OR REPLACE STREAM trip_statistics (
        trip_count          INTEGER,
        passenger_count     INTEGER,
        total_amount        REAL
    );
    
    CREATE OR REPLACE PUMP statistics_pump AS 
        INSERT INTO trip_statistics
            SELECT STREAM
                COUNT(1) as trip_count, 
                SUM(passenger_count) as passenger_count, 
                SUM(total_amount) as total_amount
            FROM cleaned_trips
            GROUP BY STEP(cleaned_trips.ROWTIME BY INTERVAL '2' SECOND)
            ORDER BY STEP(cleaned_trips.ROWTIME BY INTERVAL '2' SECOND);

    CREATE OR REPLACE STREAM trip_statistics_anomaly_tmp (
        trip_count          INTEGER,
        passenger_count     INTEGER,
        total_amount        REAL,
        anomaly_score       DOUBLE,
        anomaly_explanation VARCHAR(20480),
        resolution          VARCHAR(8)
    );
    
    CREATE OR REPLACE STREAM trip_statistics_anomaly (
        rowtime_ts          TIMESTAMP,
        trip_count          INTEGER,
        passenger_count     INTEGER,
        total_amount        REAL,
        anomaly_score       DOUBLE,
        anomaly_explanation VARCHAR(20480),
        resolution          VARCHAR(8)
    );
    
    
    CREATE OR REPLACE PUMP trip_statistics_anomaly_pump AS 
        INSERT INTO trip_statistics_anomaly
            SELECT STREAM FLOOR(trip_statistics_anomaly_tmp.ROWTIME TO SECOND) AS rowtime_ts, trip_count, passenger_count, total_amount, anomaly_score, anomaly_explanation, resolution
            FROM trip_statistics_anomaly_tmp
            ORDER BY FLOOR(trip_statistics_anomaly_tmp.ROWTIME TO SECOND), ANOMALY_SCORE DESC;
    
    CREATE OR REPLACE PUMP trip_statistics_anomaly_60min_pump AS 
        INSERT INTO trip_statistics_anomaly_tmp
            SELECT STREAM trip_count, passenger_count, total_amount, anomaly_score, anomaly_explanation, '60min'
            FROM TABLE(RANDOM_CUT_FOREST_WITH_EXPLANATION(
                CURSOR(SELECT STREAM trip_count, passenger_count, total_amount FROM trip_statistics),
                100, 256, 100000, 24, false));
