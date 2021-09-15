import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
##Use Pandas library to execute Pivot function, popular Python libraries have already been integrated by default. Please check https://docs.amazonaws.cn/en_us/glue/latest/dg/aws-glue-programming-python-libraries.html
import pandas as pd
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.dynamicframe import DynamicFrame
from awsglue.job import Job

args = getResolvedOptions(sys.argv, ['Target'])
glueContext = GlueContext(SparkContext.getOrCreate())
sc = glueContext.spark_session

job = Job(glueContext)
job.init(args['Target'], args)

#Read the table from preset database in Glue data source, change the value of database and table_name accordingly
datasource0 = glueContext.create_dynamic_frame.from_catalog(database = "default", table_name = "jsonpivottest_json", transformation_ctx = "datasource0")
datasource0.printSchema()

applymapping1 = ApplyMapping.apply(frame = datasource0, mappings = [("dimensions", "array", "dimensions", "array"), ("measurename", "string", "measurename", "string"), ("measurevalue", "string", "measurevalue", "string"), ("time", "string", "time", "string"), ("timeunit", "string", "timeunit", "string")], transformation_ctx = "applymapping1")
#Select the columns that will be handled
selectfields2 = SelectFields.apply(frame = applymapping1, paths = ["dimensions", "measurename", "measurevalue", "time", "timeunit"], transformation_ctx = "selectfields2")
#Convert DynamicFrame to Spark DataFrame to check the table content 
selectfields2.toDF().show()

#convert the format of 'dimensions' column to string for futher processing
cleandata_convert = selectfields2.resolveChoice(specs = [('dimensions','cast:string')])
cleandata_convert.toDF().show()

#Convert the DynamicFrame to Spark DataFrame and then convert to Pandas DataFrame
cleandata_df = cleandata_convert.toDF()
cleandata_pandas = cleandata_df.toPandas() 
#Need to use reset_index() after pivot().otherwise the index column will be lost in the result
table = cleandata_pandas.pivot(index='dimensions',columns='measurename',values='measurevalue').reset_index()
#Since the last step will only keep the relative columns include 'dimensions','measurename' and 'measurevalue', need to merge the rest of the columns
lookup = cleandata_pandas.drop_duplicates('dimensions')[['dimensions', 'time','timeunit']]
lookup.set_index(['dimensions'], inplace=True)
#Merge pivot table and the new table with index 'dimensions'
result = table.join(lookup, on='dimensions')
#Create Spark DataFrame for the new merged table
table_tf = sc.createDataFrame(result)

#By default, the result will be partitioned to 4 parts, here I use coalesce(1) to limit the partition to 1 which means the output will be a single file. However, it's still recommended to partition for large output
resolvechoice4 = DynamicFrame.fromDF(table_tf, glueContext, "resolvechoice4").coalesce(1)
#Write the result to a S3 bucket
#Needs to add a parameter with key '--Target' and value 'YOUR S3 URI' before run the script
datasink4 = glueContext.write_dynamic_frame.from_options(frame = resolvechoice4, connection_type = "s3", connection_options = {"path": args['Target']}, format = "csv")

#Check the final schema and data of result 
resolvechoice4.printSchema()
resolvechoice4.toDF().show()

job.commit()