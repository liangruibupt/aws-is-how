import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql.functions import col, unix_timestamp, to_date,from_unixtime
from datetime import datetime, timedelta

## @params: [JOB_NAME]
args = getResolvedOptions(sys.argv, ['JOB_NAME'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)
## @type: DataSource
## @args: [database = "test", table_name = "test_sc_cms_client_user", transformation_ctx = "datasource0"]
## @return: datasource0
## @inputs: []
datasource0 = glueContext.create_dynamic_frame.from_catalog(database = "test", table_name = "test_sc_cms_client_user", transformation_ctx = "datasource0")
## @type: ApplyMapping
## @args: [mapping = [("u_image", "string", "u_image", "string"), ("u_sex", "boolean", "u_sex", "boolean"), ("u_create_time", "int", "u_create_time", "int"), ("u_email", "string", "u_email", "string"), ("u_mobile", "string", "u_mobile", "string"), ("u_bind", "boolean", "u_bind", "boolean"), ("u_origin", "boolean", "u_origin", "boolean"), ("u_last_login_time", "int", "u_last_login_time", "int"), ("u_studio", "byte", "u_studio", "byte"), ("account_types", "byte", "account_types", "byte"), ("u_nickname", "string", "u_nickname", "string"), ("platform_type", "byte", "platform_type", "byte"), ("u_online", "boolean", "u_online", "boolean"), ("u_certified", "boolean", "u_certified", "boolean"), ("u_update_time", "int", "u_update_time", "int"), ("u_password", "string", "u_password", "string"), ("region_name", "string", "region_name", "string"), ("id", "int", "id", "int"), ("u_status", "boolean", "u_status", "boolean"), ("u_uuid", "string", "u_uuid", "string"), ("region_id", "byte", "region_id", "byte"), ("u_cid", "string", "u_cid", "string"), ("u_area_code", "string", "u_area_code", "string"), ("u_mbtype", "byte", "u_mbtype", "byte"), ("u_lang", "string", "u_lang", "string"), ("u_dvcid", "string", "u_dvcid", "string"), ("expand", "string", "expand", "string"), ("u_lgtype", "boolean", "u_lgtype", "boolean"), ("invite_code", "string", "invite_code", "string"), ("region_code", "string", "region_code", "string")], transformation_ctx = "applymapping1"]
## @return: applymapping1
## @inputs: [frame = datasource0]
applymapping1 = ApplyMapping.apply(frame = datasource0, mappings = [("u_image", "string", "u_image", "string"), ("u_sex", "boolean", "u_sex", "boolean"), ("u_create_time", "int", "u_create_time", "int"), ("u_email", "string", "u_email", "string"), ("u_mobile", "string", "u_mobile", "string"), ("u_bind", "boolean", "u_bind", "boolean"), ("u_origin", "boolean", "u_origin", "boolean"), ("u_last_login_time", "int", "u_last_login_time", "int"), ("u_studio", "byte", "u_studio", "byte"), ("account_types", "byte", "account_types", "byte"), ("u_nickname", "string", "u_nickname", "string"), ("platform_type", "byte", "platform_type", "byte"), ("u_online", "boolean", "u_online", "boolean"), ("u_certified", "boolean", "u_certified", "boolean"), ("u_update_time", "int", "u_update_time", "int"), ("u_password", "string", "u_password", "string"), ("region_name", "string", "region_name", "string"), ("id", "int", "id", "int"), ("u_status", "boolean", "u_status", "boolean"), ("u_uuid", "string", "u_uuid", "string"), ("region_id", "byte", "region_id", "byte"), ("u_cid", "string", "u_cid", "string"), ("u_area_code", "string", "u_area_code", "string"), ("u_mbtype", "byte", "u_mbtype", "byte"), ("u_lang", "string", "u_lang", "string"), ("u_dvcid", "string", "u_dvcid", "string"), ("expand", "string", "expand", "string"), ("u_lgtype", "boolean", "u_lgtype", "boolean"), ("invite_code", "string", "invite_code", "string"), ("region_code", "string", "region_code", "string")], transformation_ctx = "applymapping1")
## @type: ResolveChoice
## @args: [choice = "make_struct", transformation_ctx = "resolvechoice2"]
## @return: resolvechoice2
## @inputs: [frame = applymapping1]
resolvechoice2 = ResolveChoice.apply(frame = applymapping1, choice = "make_struct", transformation_ctx = "resolvechoice2")
## @type: DropNullFields
## @args: [transformation_ctx = "dropnullfields3"]
## @return: dropnullfields3
## @inputs: [frame = resolvechoice2]
dropnullfields3 = DropNullFields.apply(frame = resolvechoice2, transformation_ctx = "dropnullfields3")
# df = dropnullfields3.toDF()
# df = df.withColumn("create_time_cn", from_unixtime(col("u_create_time")-43200)).withColumn('pt', to_date('create_time_cn', 'yyyy-MM-dd'))
# datasource_transformed = DynamicFrame.fromDF(df, glueContext, "dropnullfields3") 
yesterday = datetime.now() - timedelta(1)
pt = datetime.strftime(yesterday, '%Y-%m-%d')
s3_path = "s3://smart-bigdata/mysql57_cms/{}/".format(pt)
## @type: DataSink
## @args: [connection_type = "s3", connection_options = {"path": "s3://smart-bigdata/mysql57_cms/"}, format = "parquet", transformation_ctx = "datasink4"]
## @return: datasink4
## @inputs: [frame = dropnullfields3]
#datasink4 = glueContext.write_dynamic_frame.from_options(frame=datasource_transformed, connection_type="s3", connection_options={"path": s3_path, "partitionKeys": ["pt"]}, format="parquet", transformation_ctx="datasink4")
datasink4 = glueContext.write_dynamic_frame.from_options(frame=dropnullfields3, connection_type="s3", connection_options={"path": s3_path}, format="parquet", transformation_ctx="datasink4")
job.commit()
