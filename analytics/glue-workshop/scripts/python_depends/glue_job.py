import pandas as pd
import numpy as np
import datetime
import pandas as pd
from datetime import date
import numpy as np
from sklearn.preprocessing import OneHotEncoder
from sklearn.preprocessing import LabelEncoder
import boto3
import pickle
import io
from io import StringIO
import awswrangler


df_r = awswrangler.athena.read( "implementationdb", "select * from reseller" )
df = awswrangler.athena.read( "implementationdb", "select * from billing" )
bucket = 'blackb-mggaska-implementation'
df['date'] = pd.to_datetime(df['date'])


print('dataframe',df.shape)
print('dataframer',df_r.shape)

#---FUNCTIONS-------------------------------

def write_dataframe_to_csv_on_s3(dataframe, bucket, filename):
    """ Write a dataframe to a CSV on S3 """
    # Create buffer
    csv_buffer = StringIO()
    # Write dataframe to buffer
    dataframe.to_csv(csv_buffer, sep=",", header=None,index=None)
    # Create S3 object
    s3_resource = boto3.resource("s3")
    # Write buffer to S3 object
    s3_resource.Object(bucket, filename).put(Body=csv_buffer.getvalue())
    print("Writing {} records to {}".format(len(dataframe), filename))

#--------------------------------------------------
# ### Filter the last 4 months of data

max_date = df['date'].max()
min_date = max_date - pd.to_timedelta(120, unit='d')

df = df[df['date'] > min_date]

def completeItem(dfItem):
    min_date = dfItem['date'].min()
    max_date = dfItem['date'].max()
    if min_date == max_date:
        #only one data point
        return
    r = pd.date_range(start=min_date, end=max_date)
    dfItemNew = dfItem.set_index('date').reindex(r).rename_axis('date').reset_index()

    dfItemNew['mean-last-30'] = dfItemNew['bill'].rolling(30,min_periods=1).mean().reset_index()['bill']
    dfItemNew['mean-last-7'] = dfItemNew['bill'].rolling(7,min_periods=1).mean().reset_index()['bill']
    dfItemNew['std-last-30'] = dfItemNew['bill'].rolling(30,min_periods=1).std().reset_index()['bill']
    dfItemNew['bill'] = dfItemNew['bill'].fillna(0)
    dfItemNew['id_reseller'] = dfItem['id_reseller'].max()
    dfItemNew['std-last-30'].fillna(method='ffill',inplace=True)
    dfItemNew['mean-last-7'].fillna(method='ffill',inplace=True)
    dfItemNew['std-last-30'].fillna(method='ffill',inplace=True)
    resp = []
    counter = 0
    for index,row in dfItemNew.iterrows():
        resp.append(counter)
        if row['bill'] == 0:
            counter += 1
        else:
            counter = 0
    dfItemNew['days_without_purchase'] = pd.Series(resp)
    return dfItemNew

i = 0
dfCompletedList = []
for nid,item in df.groupby('id_reseller'):
    i = i+1
    if i%200 == 0:
        print ('processed {} resellers'.format(str(i)))
    dfCompletedList.append(completeItem(item))


df = pd.concat(dfCompletedList).copy()
del dfCompletedList
df['weekday']  = df['date'].dt.weekday_name


# ### Compute next bill

# In[11]:


df['next_bill'] = df.replace(0,np.nan).groupby('id_reseller')['bill'].fillna(method='bfill')


# ## Compute last bill

# In[12]:


df['last_bill'] = df.replace(0,np.nan).groupby('id_reseller')['bill'].fillna(method='ffill').copy()
different_zero = df['last_bill'].shift(1)
df.loc[df['bill'] != 0,'last_bill'] = np.nan
df['last_bill'] = df['last_bill'].fillna(different_zero)


# In[13]:


df = df.merge(df_r,how='inner',on='id_reseller')


# In[14]:


df = df.dropna()


# ## Deal with categorical variables
#
# To deal with categorical variables (reseller's cluster and reseller's zone), we will use a combination of sklearn's Label Encoder, a preprocessing module that transforms strings in numeric lables, and One Hot Encoder, that takes this numerical variables and creates dummy (0/1 state) variables.
#
# This modules are python objects that keep in their internal variables the information necessary to transform new data.  So, in the Glue ETL we are going to store this objects in pkl format
#

# In[17]:


le_cluster = LabelEncoder()
ohe_cluster = OneHotEncoder(handle_unknown='ignore')
df_cluster = pd.DataFrame(ohe_cluster.fit_transform(le_cluster.fit_transform(df['cluster'].fillna('')).reshape(-1, 1)).todense())
df_cluster = df_cluster.add_prefix('cluster_')


# In[18]:


le_zone = LabelEncoder()
ohe_zone = OneHotEncoder(handle_unknown='ignore')
df_zone = pd.DataFrame(ohe_zone.fit_transform(le_zone.fit_transform(df['zone'].fillna('')).reshape(-1, 1)).todense())
df_zone = df_zone.add_prefix('zone_')


# In[19]:


le_weekday = LabelEncoder()
ohe_weekday = OneHotEncoder(handle_unknown='ignore')
df_weekday = pd.DataFrame(ohe_weekday.fit_transform(le_weekday.fit_transform(df['weekday']).reshape(-1, 1)).todense())
df_weekday = df_weekday.add_prefix('weekday_')


# In[20]:


client = boto3.client('s3')
client.put_object(Body=pickle.dumps(le_cluster), Bucket=bucket, Key='preprocessing/le_cluster.pkl');


# In[21]:


client.put_object(Body=pickle.dumps(ohe_cluster), Bucket=bucket, Key='preprocessing/ohe_cluster.pkl')
client.put_object(Body=pickle.dumps(le_zone), Bucket=bucket, Key='preprocessing/le_zone.pkl')
client.put_object(Body=pickle.dumps(ohe_zone), Bucket=bucket, Key='preprocessing/ohe_zone.pkl')
client.put_object(Body=pickle.dumps(le_weekday), Bucket=bucket, Key='preprocessing/le_weekday.pkl')
client.put_object(Body=pickle.dumps(ohe_weekday), Bucket=bucket, Key='preprocessing/ohe_weekday.pkl');


# ## Write to S3 resulting ETL
#
# Now we have to write to S3 all the relevant columns. We will perform a train/validation split of the customers so we can train on a group and get relevant metrics on the other.

# In[29]:


df = df[['next_bill', 'bill', 'date', 'id_reseller', 'mean-last-30', 'mean-last-7',
       'std-last-30', 'days_without_purchase', 'weekday',
       'last_bill', 'zone', 'cluster']]

df = pd.concat([df,df_cluster,df_zone,df_weekday],axis=1)


#Take a random 10% sample of the resellers
val_resellers = list(pd.Series(df['id_reseller'].unique()).sample(frac=0.1))

df_train = df[~df['id_reseller'].isin(val_resellers)].sample(frac=1)

df_validation = df[df['id_reseller'].isin(val_resellers)].sample(frac=1)

df_train.drop(['date','id_reseller','bill','zone','cluster','weekday'],axis=1,inplace=True)
df_validation.drop(['date','id_reseller','bill','zone','cluster','weekday'],axis=1,inplace=True)


write_dataframe_to_csv_on_s3(df_validation, bucket, 'validation/validation.csv')
write_dataframe_to_csv_on_s3(df_train, bucket, 'train/train.csv')

#####
# Preprocessing Pipeline
#####

df_r = awswrangler.athena.read( "implementationdb", "select * from reseller" )
df = awswrangler.athena.read( "implementationdb", "select * from billing" )
df['date'] = pd.to_datetime(df['date'])

max_date = df['date'].max()
min_date = max_date - pd.Timedelta(days=30)
df = df[(df['date'] > min_date)]

def completeItem(dfItem,max_date,min_date):
    r = pd.date_range(start=min_date, end=max_date)
    dfItemNew = dfItem.set_index('date').reindex(r).fillna(0.0).rename_axis('date').reset_index()
    dfItemNew['id_reseller'] = dfItem['id_reseller'].max()
    return dfItemNew

dfCompletedList = []
for nid,item in df.groupby('id_reseller'):
    dfCompletedList.append(completeItem(item,max_date,min_date))
dfCompleted = pd.concat(dfCompletedList).copy()


df = dfCompleted
del dfCompleted
del dfCompletedList

def complete_info(group):
    weekday = (max_date + pd.Timedelta(days=1)).weekday_name
    mean_last_30 = group['bill'].replace(0,np.nan).mean()
    std_last_30 = group['bill'].replace(0,np.nan).std()
    date_last_bill = group[group['bill'] != 0]['date'].max()
    days_without_purchase = (max_date + pd.Timedelta(days=1) - date_last_bill).days

    mean_last_7 = group[(group['date'] >= max_date - pd.Timedelta(days=6))]['bill'].replace(0,np.nan).mean()
    last_bill = group[group['bill'] > 0].sort_values('date',ascending=False).head(1)['bill'].values[0]
    return {'weekday':weekday,'mean-last-30':mean_last_30,
           'std-last-30':std_last_30,'mean-last-7':mean_last_7,'last_bill':last_bill,
           'id_reseller':group['id_reseller'].max(), 'days_without_purchase':days_without_purchase}


features = []
for index,group in df.groupby('id_reseller'):
    features.append(complete_info(group))

df_features = pd.DataFrame(features)

df_features = df_features.merge(df_r,how='inner',on='id_reseller')

pipe_list = [le_cluster,ohe_cluster,le_zone,ohe_zone,le_weekday,ohe_weekday]

df_cluster = pd.DataFrame(
    pipe_list[1].transform(pipe_list[0].transform(df_features['cluster']).reshape(-1, 1)).todense()
)
df_cluster = df_cluster.add_prefix('cluster_')
df_zone = pd.DataFrame(
    pipe_list[3].transform(pipe_list[2].transform(df_features['zone']).reshape(-1, 1)).todense()
)
df_zone = df_zone.add_prefix('zone_')
df_weekday = pd.DataFrame(
    pipe_list[5].transform(pipe_list[4].transform(df_features['weekday']).reshape(-1, 1)).todense()
)
df_weekday = df_weekday.add_prefix('weekday_')

df_to_predict = pd.concat([df_features,df_cluster,df_zone,df_weekday],axis=1)

df_to_predict_feats = df_to_predict[['mean-last-30', 'mean-last-7', 'std-last-30',
       'days_without_purchase', 'last_bill', 'cluster_0', 'cluster_1',
       'cluster_2', 'cluster_3', 'cluster_4', 'zone_0', 'zone_1', 'zone_2',
       'zone_3', 'zone_4', 'zone_5', 'zone_6', 'zone_7', 'zone_8', 'zone_9',
       'zone_10', 'zone_11', 'zone_12', 'zone_13', 'zone_14', 'zone_15',
       'zone_16', 'zone_17', 'zone_18', 'zone_19', 'zone_20', 'zone_21',
       'zone_22', 'zone_23', 'zone_24', 'zone_25', 'zone_26', 'zone_27',
       'zone_28', 'zone_29', 'zone_30', 'zone_31', 'zone_32', 'zone_33',
       'zone_34', 'zone_35', 'zone_36', 'zone_37', 'zone_38', 'zone_39',
       'zone_40', 'zone_41', 'zone_42', 'zone_43', 'zone_44', 'zone_45',
       'zone_46', 'zone_47', 'zone_48', 'zone_49', 'zone_50', 'zone_51',
       'weekday_0', 'weekday_1', 'weekday_2', 'weekday_3', 'weekday_4',
       'weekday_5', 'weekday_6']]

write_dataframe_to_csv_on_s3(df_to_predict_feats,bucket,'to_predict.csv')
write_dataframe_to_csv_on_s3(df_to_predict[['id_reseller']],bucket,'id_reseller_to_predict.csv')

