import pymongo
import sys

##Create a MongoDB client, open a connection to Amazon DocumentDB as a replica set and specify the read preference as secondary preferred
#client = pymongo.MongoClient('mongodb://dbadmin:<insertYourPassword>@docdb-2023-03-01-09.cluster-ckghkggpkoby.docdb.cn-north-1.amazonaws.com.cn:27017/?ssl=true&ssl_ca_certs=rds-combined-ca-cn-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false') 
client = pymongo.MongoClient('mongodb://dbadmin:<insertYourPassword>@docdb-2023-03-01-09.cluster-ckghkggpkoby.docdb.cn-north-1.amazonaws.com.cn:27017/?tls=true&tlsCAFile=rds-combined-ca-cn-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false') 

##Specify the database to be used
db = client.sample_database

##Specify the collection to be used
col = db.sample_collection

##Insert a single document
col.insert_one({'hello':'Amazon DocumentDB'})

##Find the document that was previously written
x = col.find_one({'hello':'Amazon DocumentDB'})

##Print the result to the screen
print(x)

##Close the connection
client.close()