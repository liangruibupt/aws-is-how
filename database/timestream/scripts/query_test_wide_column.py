import boto3
from botocore.config import Config
import json
import time

session = boto3.Session(region_name='us-east-1')
query_client = session.client(
    'timestream-query', endpoint_url='https://query-cell2.timestream.us-east-1.amazonaws.com')
write_client = session.client('timestream-write',
                              endpoint_url='https://ingest-cell2.timestream.us-east-1.amazonaws.com',
                              config=Config(read_timeout=20, max_pool_connections=5000, retries={'max_attempts': 10}))

DATABASE_NAME = "kdaflink"
TABLE_NAME = "metrics200"
VIN = "vin-92175368190175"
RIGHT_TABLE_NAME = "kinesis600"
QUERY_REPEAT = 10

QUERY_COUNT = f"""
    SELECT count(*) FROM "{DATABASE_NAME}"."{TABLE_NAME}"
    """

QUERY_COUNT_VID = f"""
    SELECT count(*), vin FROM "{DATABASE_NAME}"."{TABLE_NAME}" group by vin limit 100
    """

SELECT_GROUP_BY = f"""
    SELECT AVG(vd.measure_value::double) as avg_sys, vd.vin
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        where vd.vin='{VIN}'
        GROUP BY vd.vin limit 100
    """

SELECT_MAX = f"""
    SELECT max(vd.measure_value::double) as max_sys, vd.vin
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        where vd.vin='{VIN}'
        Group by vd.vin limit 100
    """

SELECT_BIN = f"""
    SELECT BIN(vd.time, 1m) AS binned_timestamp, AVG(vd.measure_value::double) AS avg_value_1mins, vd.vin
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        where vd.vin='{VIN}'
        Group by vd.vin, BIN(vd.time, 1m) limit 100
"""

SELECT_TRUNC = f"""
    SELECT date_trunc('minute', vd.time) AS min_timestamp, AVG(vd.measure_value::double) AS avg_value_1min, vd.vin
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        where vd.vin='{VIN}'
        Group by 1, vd.vin limit 100 
"""

SELECT_ARBIT = f"""
    SELECT BIN(vd.time, 1m) AS binned_timestamp, arbitrary(vd.measure_value::double) AS random_value, vd.vin
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        where vd.vin='{VIN}'
        Group by vd.vin, BIN(vd.time, 1m) limit 100
"""

SELECT_NTH_VALUE = f"""
    SELECT BIN(vd.time, 1m) AS binned_timestamp, vd.vin, nth_value(vd.measure_value::double, 2) over(partition by vd.vin
        order by vd.time desc
        rows between unbounded preceding and unbounded following)
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        where vd.vin='{VIN}'
        limit 100
"""

SELECT_WIDE_COLUMN = f"""
SELECT vin, time, trip_id,
    AVG(CASE WHEN measure_name ='systolic' THEN measure_value::double ELSE NULL END) AS avg_systolic,
    AVG(CASE WHEN measure_name ='diastolic' THEN measure_value::double ELSE NULL END) AS avg_diastolic,
    AVG(CASE WHEN measure_name ='temp' THEN measure_value::double ELSE NULL END) AS avg_temp,
    AVG(CASE WHEN measure_name ='bms_soc2' THEN measure_value::double ELSE NULL END) AS avg_bms_soc2,
    AVG(CASE WHEN measure_name ='speed' THEN measure_value::double ELSE NULL END) AS avg_speed,
    AVG(CASE WHEN measure_name ='odo' THEN measure_value::double ELSE NULL END) AS avg_odo,
    AVG(CASE WHEN measure_name ='gear' THEN measure_value::double ELSE NULL END) AS avg_gear,
    AVG(CASE WHEN measure_name ='engine_rpm' THEN measure_value::double ELSE NULL END) AS avg_engine_rpm,
    AVG(CASE WHEN measure_name ='ignition_state_1' THEN measure_value::double ELSE NULL END) AS ignition_state_1,
    AVG(CASE WHEN measure_name ='ignition_state_2' THEN measure_value::double ELSE NULL END) AS ignition_state_2,
    AVG(CASE WHEN measure_name ='ignition_state_3' THEN measure_value::double ELSE NULL END) AS ignition_state_3,
    AVG(CASE WHEN measure_name ='ignition_state_4' THEN measure_value::double ELSE NULL END) AS ignition_state_4,
    AVG(CASE WHEN measure_name ='ignition_state_5' THEN measure_value::double ELSE NULL END) AS ignition_state_5,
    AVG(CASE WHEN measure_name ='ignition_state_6' THEN measure_value::double ELSE NULL END) AS ignition_state_6,
    AVG(CASE WHEN measure_name ='ignition_state_7' THEN measure_value::double ELSE NULL END) AS ignition_state_7,
    AVG(CASE WHEN measure_name ='ignition_state_8' THEN measure_value::double ELSE NULL END) AS ignition_state_8,
    AVG(CASE WHEN measure_name ='ignition_state_9' THEN measure_value::double ELSE NULL END) AS ignition_state_9,
    AVG(CASE WHEN measure_name ='ignition_state_10' THEN measure_value::double ELSE NULL END) AS ignition_state_10,
    AVG(CASE WHEN measure_name ='ignition_state_11' THEN measure_value::double ELSE NULL END) AS ignition_state_11,
    AVG(CASE WHEN measure_name ='ignition_state_12' THEN measure_value::double ELSE NULL END) AS ignition_state_12,
    AVG(CASE WHEN measure_name ='ignition_state_13' THEN measure_value::double ELSE NULL END) AS ignition_state_13,
    AVG(CASE WHEN measure_name ='ignition_state_14' THEN measure_value::double ELSE NULL END) AS ignition_state_14,
    AVG(CASE WHEN measure_name ='ignition_state_15' THEN measure_value::double ELSE NULL END) AS ignition_state_15,
    AVG(CASE WHEN measure_name ='ignition_state_16' THEN measure_value::double ELSE NULL END) AS ignition_state_16,
    AVG(CASE WHEN measure_name ='ignition_state_17' THEN measure_value::double ELSE NULL END) AS ignition_state_17,
    AVG(CASE WHEN measure_name ='ignition_state_18' THEN measure_value::double ELSE NULL END) AS ignition_state_18,
    AVG(CASE WHEN measure_name ='ignition_state_19' THEN measure_value::double ELSE NULL END) AS ignition_state_19,
    AVG(CASE WHEN measure_name ='ignition_state_20' THEN measure_value::double ELSE NULL END) AS ignition_state_20,
    AVG(CASE WHEN measure_name ='ignition_state_21' THEN measure_value::double ELSE NULL END) AS ignition_state_21,
    AVG(CASE WHEN measure_name ='ignition_state_22' THEN measure_value::double ELSE NULL END) AS ignition_state_22,
    AVG(CASE WHEN measure_name ='ignition_state_23' THEN measure_value::double ELSE NULL END) AS ignition_state_23,
    AVG(CASE WHEN measure_name ='ignition_state_24' THEN measure_value::double ELSE NULL END) AS ignition_state_24,
    AVG(CASE WHEN measure_name ='ignition_state_25' THEN measure_value::double ELSE NULL END) AS ignition_state_25,
    AVG(CASE WHEN measure_name ='ignition_state_26' THEN measure_value::double ELSE NULL END) AS ignition_state_26,
    AVG(CASE WHEN measure_name ='ignition_state_27' THEN measure_value::double ELSE NULL END) AS ignition_state_27,
    AVG(CASE WHEN measure_name ='ignition_state_28' THEN measure_value::double ELSE NULL END) AS ignition_state_28,
    AVG(CASE WHEN measure_name ='ignition_state_29' THEN measure_value::double ELSE NULL END) AS ignition_state_29,
    AVG(CASE WHEN measure_name ='ignition_state_30' THEN measure_value::double ELSE NULL END) AS ignition_state_30,
    AVG(CASE WHEN measure_name ='ignition_state_31' THEN measure_value::double ELSE NULL END) AS ignition_state_31,
    AVG(CASE WHEN measure_name ='ignition_state_32' THEN measure_value::double ELSE NULL END) AS ignition_state_32,
    AVG(CASE WHEN measure_name ='ignition_state_33' THEN measure_value::double ELSE NULL END) AS ignition_state_33,
    AVG(CASE WHEN measure_name ='ignition_state_34' THEN measure_value::double ELSE NULL END) AS ignition_state_34,
    AVG(CASE WHEN measure_name ='ignition_state_35' THEN measure_value::double ELSE NULL END) AS ignition_state_35,
    AVG(CASE WHEN measure_name ='ignition_state_36' THEN measure_value::double ELSE NULL END) AS ignition_state_36,
    AVG(CASE WHEN measure_name ='ignition_state_37' THEN measure_value::double ELSE NULL END) AS ignition_state_37,
    AVG(CASE WHEN measure_name ='ignition_state_38' THEN measure_value::double ELSE NULL END) AS ignition_state_38,
    AVG(CASE WHEN measure_name ='ignition_state_39' THEN measure_value::double ELSE NULL END) AS ignition_state_39,
    AVG(CASE WHEN measure_name ='ignition_state_40' THEN measure_value::double ELSE NULL END) AS ignition_state_40,
    AVG(CASE WHEN measure_name ='ignition_state_41' THEN measure_value::double ELSE NULL END) AS ignition_state_41,
    AVG(CASE WHEN measure_name ='ignition_state_42' THEN measure_value::double ELSE NULL END) AS ignition_state_42,
    AVG(CASE WHEN measure_name ='ignition_state_43' THEN measure_value::double ELSE NULL END) AS ignition_state_43,
    AVG(CASE WHEN measure_name ='ignition_state_44' THEN measure_value::double ELSE NULL END) AS ignition_state_44,
    AVG(CASE WHEN measure_name ='ignition_state_45' THEN measure_value::double ELSE NULL END) AS ignition_state_45,
    AVG(CASE WHEN measure_name ='ignition_state_46' THEN measure_value::double ELSE NULL END) AS ignition_state_46,
    AVG(CASE WHEN measure_name ='ignition_state_47' THEN measure_value::double ELSE NULL END) AS ignition_state_47,
    AVG(CASE WHEN measure_name ='ignition_state_48' THEN measure_value::double ELSE NULL END) AS ignition_state_48,
    AVG(CASE WHEN measure_name ='ignition_state_49' THEN measure_value::double ELSE NULL END) AS ignition_state_49,
    AVG(CASE WHEN measure_name ='ignition_state_50' THEN measure_value::double ELSE NULL END) AS ignition_state_50,
    AVG(CASE WHEN measure_name ='ignition_state_51' THEN measure_value::double ELSE NULL END) AS ignition_state_51,
    AVG(CASE WHEN measure_name ='ignition_state_52' THEN measure_value::double ELSE NULL END) AS ignition_state_52,
    AVG(CASE WHEN measure_name ='ignition_state_53' THEN measure_value::double ELSE NULL END) AS ignition_state_53,
    AVG(CASE WHEN measure_name ='ignition_state_54' THEN measure_value::double ELSE NULL END) AS ignition_state_54,
    AVG(CASE WHEN measure_name ='ignition_state_55' THEN measure_value::double ELSE NULL END) AS ignition_state_55,
    AVG(CASE WHEN measure_name ='ignition_state_56' THEN measure_value::double ELSE NULL END) AS ignition_state_56,
    AVG(CASE WHEN measure_name ='ignition_state_57' THEN measure_value::double ELSE NULL END) AS ignition_state_57,
    AVG(CASE WHEN measure_name ='ignition_state_58' THEN measure_value::double ELSE NULL END) AS ignition_state_58,
    AVG(CASE WHEN measure_name ='ignition_state_59' THEN measure_value::double ELSE NULL END) AS ignition_state_59,
    AVG(CASE WHEN measure_name ='ignition_state_60' THEN measure_value::double ELSE NULL END) AS ignition_state_60,
    AVG(CASE WHEN measure_name ='ignition_state_61' THEN measure_value::double ELSE NULL END) AS ignition_state_61,
    AVG(CASE WHEN measure_name ='ignition_state_62' THEN measure_value::double ELSE NULL END) AS ignition_state_62,
    AVG(CASE WHEN measure_name ='ignition_state_63' THEN measure_value::double ELSE NULL END) AS ignition_state_63,
    AVG(CASE WHEN measure_name ='ignition_state_64' THEN measure_value::double ELSE NULL END) AS ignition_state_64,
    AVG(CASE WHEN measure_name ='ignition_state_65' THEN measure_value::double ELSE NULL END) AS ignition_state_65,
    AVG(CASE WHEN measure_name ='ignition_state_66' THEN measure_value::double ELSE NULL END) AS ignition_state_66,
    AVG(CASE WHEN measure_name ='ignition_state_67' THEN measure_value::double ELSE NULL END) AS ignition_state_67,
    AVG(CASE WHEN measure_name ='ignition_state_68' THEN measure_value::double ELSE NULL END) AS ignition_state_68,
    AVG(CASE WHEN measure_name ='ignition_state_69' THEN measure_value::double ELSE NULL END) AS ignition_state_69,
    AVG(CASE WHEN measure_name ='ignition_state_70' THEN measure_value::double ELSE NULL END) AS ignition_state_70,
    AVG(CASE WHEN measure_name ='ignition_state_71' THEN measure_value::double ELSE NULL END) AS ignition_state_71,
    AVG(CASE WHEN measure_name ='ignition_state_72' THEN measure_value::double ELSE NULL END) AS ignition_state_72,
    AVG(CASE WHEN measure_name ='ignition_state_73' THEN measure_value::double ELSE NULL END) AS ignition_state_73,
    AVG(CASE WHEN measure_name ='ignition_state_74' THEN measure_value::double ELSE NULL END) AS ignition_state_74,
    AVG(CASE WHEN measure_name ='ignition_state_75' THEN measure_value::double ELSE NULL END) AS ignition_state_75,
    AVG(CASE WHEN measure_name ='ignition_state_76' THEN measure_value::double ELSE NULL END) AS ignition_state_76,
    AVG(CASE WHEN measure_name ='ignition_state_77' THEN measure_value::double ELSE NULL END) AS ignition_state_77,
    AVG(CASE WHEN measure_name ='ignition_state_78' THEN measure_value::double ELSE NULL END) AS ignition_state_78,
    AVG(CASE WHEN measure_name ='ignition_state_79' THEN measure_value::double ELSE NULL END) AS ignition_state_79,
    AVG(CASE WHEN measure_name ='ignition_state_80' THEN measure_value::double ELSE NULL END) AS ignition_state_80,
    AVG(CASE WHEN measure_name ='ignition_state_81' THEN measure_value::double ELSE NULL END) AS ignition_state_81,
    AVG(CASE WHEN measure_name ='ignition_state_82' THEN measure_value::double ELSE NULL END) AS ignition_state_82,
    AVG(CASE WHEN measure_name ='ignition_state_83' THEN measure_value::double ELSE NULL END) AS ignition_state_83,
    AVG(CASE WHEN measure_name ='ignition_state_84' THEN measure_value::double ELSE NULL END) AS ignition_state_84,
    AVG(CASE WHEN measure_name ='ignition_state_85' THEN measure_value::double ELSE NULL END) AS ignition_state_85,
    AVG(CASE WHEN measure_name ='ignition_state_86' THEN measure_value::double ELSE NULL END) AS ignition_state_86,
    AVG(CASE WHEN measure_name ='ignition_state_87' THEN measure_value::double ELSE NULL END) AS ignition_state_87,
    AVG(CASE WHEN measure_name ='ignition_state_88' THEN measure_value::double ELSE NULL END) AS ignition_state_88,
    AVG(CASE WHEN measure_name ='ignition_state_89' THEN measure_value::double ELSE NULL END) AS ignition_state_89,
    AVG(CASE WHEN measure_name ='ignition_state_90' THEN measure_value::double ELSE NULL END) AS ignition_state_90,
    AVG(CASE WHEN measure_name ='ignition_state_91' THEN measure_value::double ELSE NULL END) AS ignition_state_91,
    AVG(CASE WHEN measure_name ='ignition_state_92' THEN measure_value::double ELSE NULL END) AS ignition_state_92,
    AVG(CASE WHEN measure_name ='ignition_state_93' THEN measure_value::double ELSE NULL END) AS ignition_state_93,
    AVG(CASE WHEN measure_name ='ignition_state_94' THEN measure_value::double ELSE NULL END) AS ignition_state_94,
    AVG(CASE WHEN measure_name ='ignition_state_95' THEN measure_value::double ELSE NULL END) AS ignition_state_95,
    AVG(CASE WHEN measure_name ='ignition_state_96' THEN measure_value::double ELSE NULL END) AS ignition_state_96,
    AVG(CASE WHEN measure_name ='ignition_state_97' THEN measure_value::double ELSE NULL END) AS ignition_state_97,
    AVG(CASE WHEN measure_name ='ignition_state_98' THEN measure_value::double ELSE NULL END) AS ignition_state_98,
    AVG(CASE WHEN measure_name ='ignition_state_99' THEN measure_value::double ELSE NULL END) AS ignition_state_99,
    AVG(CASE WHEN measure_name ='ignition_state_100' THEN measure_value::double ELSE NULL END) AS ignition_state_100,
    AVG(CASE WHEN measure_name ='powertrain_state_1' THEN measure_value::double ELSE NULL END) AS powertrain_state_1,
    AVG(CASE WHEN measure_name ='powertrain_state_2' THEN measure_value::double ELSE NULL END) AS powertrain_state_2,
    AVG(CASE WHEN measure_name ='powertrain_state_3' THEN measure_value::double ELSE NULL END) AS powertrain_state_3,
    AVG(CASE WHEN measure_name ='powertrain_state_4' THEN measure_value::double ELSE NULL END) AS powertrain_state_4,
    AVG(CASE WHEN measure_name ='powertrain_state_5' THEN measure_value::double ELSE NULL END) AS powertrain_state_5,
    AVG(CASE WHEN measure_name ='powertrain_state_6' THEN measure_value::double ELSE NULL END) AS powertrain_state_6,
    AVG(CASE WHEN measure_name ='powertrain_state_7' THEN measure_value::double ELSE NULL END) AS powertrain_state_7,
    AVG(CASE WHEN measure_name ='powertrain_state_8' THEN measure_value::double ELSE NULL END) AS powertrain_state_8,
    AVG(CASE WHEN measure_name ='powertrain_state_9' THEN measure_value::double ELSE NULL END) AS powertrain_state_9,
    AVG(CASE WHEN measure_name ='powertrain_state_10' THEN measure_value::double ELSE NULL END) AS powertrain_state_10,
    AVG(CASE WHEN measure_name ='powertrain_state_11' THEN measure_value::double ELSE NULL END) AS powertrain_state_11,
    AVG(CASE WHEN measure_name ='powertrain_state_12' THEN measure_value::double ELSE NULL END) AS powertrain_state_12,
    AVG(CASE WHEN measure_name ='powertrain_state_13' THEN measure_value::double ELSE NULL END) AS powertrain_state_13,
    AVG(CASE WHEN measure_name ='powertrain_state_14' THEN measure_value::double ELSE NULL END) AS powertrain_state_14,
    AVG(CASE WHEN measure_name ='powertrain_state_15' THEN measure_value::double ELSE NULL END) AS powertrain_state_15,
    AVG(CASE WHEN measure_name ='powertrain_state_16' THEN measure_value::double ELSE NULL END) AS powertrain_state_16,
    AVG(CASE WHEN measure_name ='powertrain_state_17' THEN measure_value::double ELSE NULL END) AS powertrain_state_17,
    AVG(CASE WHEN measure_name ='powertrain_state_18' THEN measure_value::double ELSE NULL END) AS powertrain_state_18,
    AVG(CASE WHEN measure_name ='powertrain_state_19' THEN measure_value::double ELSE NULL END) AS powertrain_state_19,
    AVG(CASE WHEN measure_name ='powertrain_state_20' THEN measure_value::double ELSE NULL END) AS powertrain_state_20,
    AVG(CASE WHEN measure_name ='powertrain_state_21' THEN measure_value::double ELSE NULL END) AS powertrain_state_21,
    AVG(CASE WHEN measure_name ='powertrain_state_22' THEN measure_value::double ELSE NULL END) AS powertrain_state_22,
    AVG(CASE WHEN measure_name ='powertrain_state_23' THEN measure_value::double ELSE NULL END) AS powertrain_state_23,
    AVG(CASE WHEN measure_name ='powertrain_state_24' THEN measure_value::double ELSE NULL END) AS powertrain_state_24,
    AVG(CASE WHEN measure_name ='powertrain_state_25' THEN measure_value::double ELSE NULL END) AS powertrain_state_25,
    AVG(CASE WHEN measure_name ='powertrain_state_26' THEN measure_value::double ELSE NULL END) AS powertrain_state_26,
    AVG(CASE WHEN measure_name ='powertrain_state_27' THEN measure_value::double ELSE NULL END) AS powertrain_state_27,
    AVG(CASE WHEN measure_name ='powertrain_state_28' THEN measure_value::double ELSE NULL END) AS powertrain_state_28,
    AVG(CASE WHEN measure_name ='powertrain_state_29' THEN measure_value::double ELSE NULL END) AS powertrain_state_29,
    AVG(CASE WHEN measure_name ='powertrain_state_30' THEN measure_value::double ELSE NULL END) AS powertrain_state_30,
    AVG(CASE WHEN measure_name ='powertrain_state_31' THEN measure_value::double ELSE NULL END) AS powertrain_state_31,
    AVG(CASE WHEN measure_name ='powertrain_state_32' THEN measure_value::double ELSE NULL END) AS powertrain_state_32,
    AVG(CASE WHEN measure_name ='powertrain_state_33' THEN measure_value::double ELSE NULL END) AS powertrain_state_33,
    AVG(CASE WHEN measure_name ='powertrain_state_34' THEN measure_value::double ELSE NULL END) AS powertrain_state_34,
    AVG(CASE WHEN measure_name ='powertrain_state_35' THEN measure_value::double ELSE NULL END) AS powertrain_state_35,
    AVG(CASE WHEN measure_name ='powertrain_state_36' THEN measure_value::double ELSE NULL END) AS powertrain_state_36,
    AVG(CASE WHEN measure_name ='powertrain_state_37' THEN measure_value::double ELSE NULL END) AS powertrain_state_37,
    AVG(CASE WHEN measure_name ='powertrain_state_38' THEN measure_value::double ELSE NULL END) AS powertrain_state_38,
    AVG(CASE WHEN measure_name ='powertrain_state_39' THEN measure_value::double ELSE NULL END) AS powertrain_state_39,
    AVG(CASE WHEN measure_name ='powertrain_state_40' THEN measure_value::double ELSE NULL END) AS powertrain_state_40,
    AVG(CASE WHEN measure_name ='powertrain_state_41' THEN measure_value::double ELSE NULL END) AS powertrain_state_41,
    AVG(CASE WHEN measure_name ='powertrain_state_42' THEN measure_value::double ELSE NULL END) AS powertrain_state_42,
    AVG(CASE WHEN measure_name ='powertrain_state_43' THEN measure_value::double ELSE NULL END) AS powertrain_state_43,
    AVG(CASE WHEN measure_name ='powertrain_state_44' THEN measure_value::double ELSE NULL END) AS powertrain_state_44,
    AVG(CASE WHEN measure_name ='powertrain_state_45' THEN measure_value::double ELSE NULL END) AS powertrain_state_45,
    AVG(CASE WHEN measure_name ='powertrain_state_46' THEN measure_value::double ELSE NULL END) AS powertrain_state_46,
    AVG(CASE WHEN measure_name ='powertrain_state_47' THEN measure_value::double ELSE NULL END) AS powertrain_state_47,
    AVG(CASE WHEN measure_name ='powertrain_state_48' THEN measure_value::double ELSE NULL END) AS powertrain_state_48,
    AVG(CASE WHEN measure_name ='powertrain_state_49' THEN measure_value::double ELSE NULL END) AS powertrain_state_49,
    AVG(CASE WHEN measure_name ='powertrain_state_50' THEN measure_value::double ELSE NULL END) AS powertrain_state_50,
    AVG(CASE WHEN measure_name ='powertrain_state_51' THEN measure_value::double ELSE NULL END) AS powertrain_state_51,
    AVG(CASE WHEN measure_name ='powertrain_state_52' THEN measure_value::double ELSE NULL END) AS powertrain_state_52,
    AVG(CASE WHEN measure_name ='powertrain_state_53' THEN measure_value::double ELSE NULL END) AS powertrain_state_53,
    AVG(CASE WHEN measure_name ='powertrain_state_54' THEN measure_value::double ELSE NULL END) AS powertrain_state_54,
    AVG(CASE WHEN measure_name ='powertrain_state_55' THEN measure_value::double ELSE NULL END) AS powertrain_state_55,
    AVG(CASE WHEN measure_name ='powertrain_state_56' THEN measure_value::double ELSE NULL END) AS powertrain_state_56,
    AVG(CASE WHEN measure_name ='powertrain_state_57' THEN measure_value::double ELSE NULL END) AS powertrain_state_57,
    AVG(CASE WHEN measure_name ='powertrain_state_58' THEN measure_value::double ELSE NULL END) AS powertrain_state_58,
    AVG(CASE WHEN measure_name ='powertrain_state_59' THEN measure_value::double ELSE NULL END) AS powertrain_state_59,
    AVG(CASE WHEN measure_name ='powertrain_state_60' THEN measure_value::double ELSE NULL END) AS powertrain_state_60,
    AVG(CASE WHEN measure_name ='powertrain_state_61' THEN measure_value::double ELSE NULL END) AS powertrain_state_61,
    AVG(CASE WHEN measure_name ='powertrain_state_62' THEN measure_value::double ELSE NULL END) AS powertrain_state_62,
    AVG(CASE WHEN measure_name ='powertrain_state_63' THEN measure_value::double ELSE NULL END) AS powertrain_state_63,
    AVG(CASE WHEN measure_name ='powertrain_state_64' THEN measure_value::double ELSE NULL END) AS powertrain_state_64,
    AVG(CASE WHEN measure_name ='powertrain_state_65' THEN measure_value::double ELSE NULL END) AS powertrain_state_65,
    AVG(CASE WHEN measure_name ='powertrain_state_66' THEN measure_value::double ELSE NULL END) AS powertrain_state_66,
    AVG(CASE WHEN measure_name ='powertrain_state_67' THEN measure_value::double ELSE NULL END) AS powertrain_state_67,
    AVG(CASE WHEN measure_name ='powertrain_state_68' THEN measure_value::double ELSE NULL END) AS powertrain_state_68,
    AVG(CASE WHEN measure_name ='powertrain_state_69' THEN measure_value::double ELSE NULL END) AS powertrain_state_69,
    AVG(CASE WHEN measure_name ='powertrain_state_70' THEN measure_value::double ELSE NULL END) AS powertrain_state_70,
    AVG(CASE WHEN measure_name ='powertrain_state_71' THEN measure_value::double ELSE NULL END) AS powertrain_state_71,
    AVG(CASE WHEN measure_name ='powertrain_state_72' THEN measure_value::double ELSE NULL END) AS powertrain_state_72,
    AVG(CASE WHEN measure_name ='powertrain_state_73' THEN measure_value::double ELSE NULL END) AS powertrain_state_73,
    AVG(CASE WHEN measure_name ='powertrain_state_74' THEN measure_value::double ELSE NULL END) AS powertrain_state_74,
    AVG(CASE WHEN measure_name ='powertrain_state_75' THEN measure_value::double ELSE NULL END) AS powertrain_state_75,
    AVG(CASE WHEN measure_name ='powertrain_state_76' THEN measure_value::double ELSE NULL END) AS powertrain_state_76,
    AVG(CASE WHEN measure_name ='powertrain_state_77' THEN measure_value::double ELSE NULL END) AS powertrain_state_77,
    AVG(CASE WHEN measure_name ='powertrain_state_78' THEN measure_value::double ELSE NULL END) AS powertrain_state_78,
    AVG(CASE WHEN measure_name ='powertrain_state_79' THEN measure_value::double ELSE NULL END) AS powertrain_state_79,
    AVG(CASE WHEN measure_name ='powertrain_state_80' THEN measure_value::double ELSE NULL END) AS powertrain_state_80,
    AVG(CASE WHEN measure_name ='powertrain_state_81' THEN measure_value::double ELSE NULL END) AS powertrain_state_81,
    AVG(CASE WHEN measure_name ='powertrain_state_82' THEN measure_value::double ELSE NULL END) AS powertrain_state_82,
    AVG(CASE WHEN measure_name ='powertrain_state_83' THEN measure_value::double ELSE NULL END) AS powertrain_state_83,
    AVG(CASE WHEN measure_name ='powertrain_state_84' THEN measure_value::double ELSE NULL END) AS powertrain_state_84,
    AVG(CASE WHEN measure_name ='powertrain_state_85' THEN measure_value::double ELSE NULL END) AS powertrain_state_85,
    AVG(CASE WHEN measure_name ='powertrain_state_86' THEN measure_value::double ELSE NULL END) AS powertrain_state_86,
    AVG(CASE WHEN measure_name ='powertrain_state_87' THEN measure_value::double ELSE NULL END) AS powertrain_state_87,
    AVG(CASE WHEN measure_name ='powertrain_state_88' THEN measure_value::double ELSE NULL END) AS powertrain_state_88,
    AVG(CASE WHEN measure_name ='powertrain_state_89' THEN measure_value::double ELSE NULL END) AS powertrain_state_89,
    AVG(CASE WHEN measure_name ='powertrain_state_90' THEN measure_value::double ELSE NULL END) AS powertrain_state_90,
    AVG(CASE WHEN measure_name ='powertrain_state_91' THEN measure_value::double ELSE NULL END) AS powertrain_state_91,
    AVG(CASE WHEN measure_name ='powertrain_state_92' THEN measure_value::double ELSE NULL END) AS powertrain_state_92,
    AVG(CASE WHEN measure_name ='powertrain_state_93' THEN measure_value::double ELSE NULL END) AS powertrain_state_93,
    AVG(CASE WHEN measure_name ='powertrain_state_94' THEN measure_value::double ELSE NULL END) AS powertrain_state_94,
    AVG(CASE WHEN measure_name ='powertrain_state_95' THEN measure_value::double ELSE NULL END) AS powertrain_state_95,
    AVG(CASE WHEN measure_name ='powertrain_state_96' THEN measure_value::double ELSE NULL END) AS powertrain_state_96,
    AVG(CASE WHEN measure_name ='powertrain_state_97' THEN measure_value::double ELSE NULL END) AS powertrain_state_97,
    AVG(CASE WHEN measure_name ='powertrain_state_98' THEN measure_value::double ELSE NULL END) AS powertrain_state_98,
    AVG(CASE WHEN measure_name ='powertrain_state_99' THEN measure_value::double ELSE NULL END) AS powertrain_state_99,
    AVG(CASE WHEN measure_name ='powertrain_state_100' THEN measure_value::double ELSE NULL END) AS powertrain_state_100
FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
where vd.vin='{VIN}'
GROUP BY vd.vin , vd.time, vd.trip_id
"""

# funclist = [QUERY_COUNT, SELECT_LIMIT_20, SELECT_BETWEEN_AND, SELECT_GROUP_BY,
#             SELECT_CASE, SELECT_JOIN, SELECT_MAX]
# joblist = ['QUERY_COUNT', 'SELECT_LIMIT_20','SELECT_BETWEEN_AND', 'SELECT_GROUP_BY',
#            'SELECT_CASE', 'SELECT_JOIN', 'SELECT_MAX']
funclist = [SELECT_WIDE_COLUMN, SELECT_GROUP_BY, SELECT_MAX,
            SELECT_BIN, SELECT_TRUNC, SELECT_ARBIT, SELECT_NTH_VALUE]
joblist = ['SELECT_WIDE_COLUMN', 'SELECT_GROUP_BY', 'SELECT_MAX',
           'SELECT_BIN', 'SELECT_TRUNC', 'SELECT_ARBIT', 'SELECT_NTH_VALUE']


class WriterExample:
    def __init__(self, client):
        self.client = client

    def describe_table(self):
        print("Describing table [%s]" % (TABLE_NAME))
        try:
            result = self.client.describe_table(
                DatabaseName=DATABASE_NAME, TableName=TABLE_NAME)
            print(result)
            #print(json.loads(result['Table']))
        except self.client.exceptions.ResourceNotFoundException:
            print("Table doesn't exist")
        except Exception as err:
            print("Describe table failed:", err)


class QueryExample:
    def __init__(self, client):
        self.client = client
        self.paginator = client.get_paginator('query')

    def run_query(self, query_string):
        try:
            t1 = time.time()
            page_iterator = self.paginator.paginate(QueryString=query_string)
            for page in page_iterator:
                response = self._parse_query_result(page)
                bytes_scanned = response[0]
                query_exec_id = response[1]
            t2 = time.time()
            return [t1, t2, bytes_scanned, query_exec_id, ]
        except Exception as err:
            print("Exception while running query:", err)

    def _parse_query_result(self, query_result):

        query_status = query_result["QueryStatus"]

        progress_percentage = query_status["ProgressPercentage"]
        #print(f"Query progress so far: {progress_percentage}%")

        bytes_scanned = float(
            query_status["CumulativeBytesScanned"])/1024/1024
        #print('Data scanned so far is: %.6f MB' % (bytes_scanned))

        bytes_metered = float(
            query_status["CumulativeBytesMetered"])/1024/1024
        #print('Data metered so far is: %.6f MB' % (bytes_metered))

        column_info = query_result['ColumnInfo']
        #print("Metadata: %s" % column_info)
        query_id = query_result["QueryId"]
        #print(f"Query id : {query_id}%")

        for row in query_result['Rows']:
            query_output = self._parse_row(column_info, row)
            #print(query_output)
        return [bytes_scanned, query_id]

    def _parse_row(self, column_info, row):
        data = row['Data']
        row_output = []
        for j in range(len(data)):
            info = column_info[j]
            datum = data[j]
            row_output.append(self._parse_datum(info, datum))

        return "{%s}" % str(row_output)

    def _parse_datum(self, info, datum):
        if datum.get('NullValue', False):
            return "%s=NULL" % info['Name'],

        column_type = info['Type']

        # If the column is of TimeSeries Type
        if 'TimeSeriesMeasureValueColumnInfo' in column_type:
            return self._parse_time_series(info, datum)

        # If the column is of Array Type
        elif 'ArrayColumnInfo' in column_type:
            array_values = datum['ArrayValue']
            return "%s=%s" % (info['Name'], self._parse_array(info['Type']['ArrayColumnInfo'], array_values))

        # If the column is of Row Type
        elif 'RowColumnInfo' in column_type:
            row_column_info = info['Type']['RowColumnInfo']
            row_values = datum['RowValue']
            return self._parse_row(row_column_info, row_values)

        # If the column is of Scalar Type
        else:
            return self._parse_column_name(info) + datum['ScalarValue']

    def _parse_time_series(self, info, datum):
        time_series_output = []
        for data_point in datum['TimeSeriesValue']:
            time_series_output.append("{time=%s, value=%s}"
                                      % (data_point['Time'],
                                         self._parse_datum(info['Type']['TimeSeriesMeasureValueColumnInfo'],
                                                           data_point['Value'])))
        return "[%s]" % str(time_series_output)

    def _parse_array(self, array_column_info, array_values):
        array_output = []
        for datum in array_values:
            array_output.append(self._parse_datum(array_column_info, datum))

        return "[%s]" % str(array_output)

    @staticmethod
    def _parse_column_name(info):
        if 'Name' in info:
            return info['Name'] + "="
        else:
            return ""

    def run_all_queries(self):
        for query_id in range(len(funclist)):
            jobname = joblist[query_id]
            print("\nRunning query [%d] : [%s]" %
                  (query_id + 1, jobname))
            l1 = []
            for i in range(QUERY_REPEAT):
                t = self.run_query(funclist[query_id])
                l1.append(t)

            r = []
            totaltime = 0
            totalscan = 0
            print('###', jobname)
            print('|Seq|%-20s|' % 'spent time')
            count = 1
            for i in l1:
                spenttime = i[1]-i[0]
                print('|%-3d|%-20.6f|' % (count, spenttime))
                totaltime += spenttime
                scan_data = i[2]
                query_exec_id = i[3]
                totalscan += scan_data
                count = count + 1

            print(f"Query id : {query_exec_id}%")
            print('Average data scan for %s is: %.6f MB' %
                  (jobname, totalscan/QUERY_REPEAT))
            print('Average time for %s is: %.6f s\n' %
                  (jobname, totaltime/QUERY_REPEAT))


write_exmaple = WriterExample(write_client)
#write_exmaple.describe_table()

query_example = QueryExample(query_client)
#query_example.run_query(QUERY_COUNT)
query_example.run_all_queries()
