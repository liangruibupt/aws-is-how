/* The DDLs and queries here are used to follow the tutorial section described in the 
   Redshift documentation for Redshift-ML feature*/


/* Managing permissions and ownership */

 /* There are separate privileges for creating a model, running a model, and getting predictions. 
 The following examples use two user groups, retention_analyst_grp (model creator) and marketing_analyst_grp (model user) to illustrate how Amazon Redshift manages access control. 
 It also assumes there is a schema called demo_ml.
 https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_GROUP.html
 https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_USER.html
 https://docs.aws.amazon.com/redshift/latest/dg/r_GRANT.html
 */


/* grant command on create model to a group of users */

GRANT CREATE MODEL TO GROUP retention_analyst_grp;


/* grant create, usage on schema to a group of users. */ 
GRANT CREATE, USAGE ON SCHEMA demo_ml TO GROUP retention_analyst_grp;

/* grant usage on schema to a group of users who can only query the objects in that schema */
GRANT USAGE ON SCHEMA demo_ml TO GROUP marketing_analyst_grp;




/* Simple Training */

/* The examples uses imaginary customer data and abalone(shellfish) dataset. 
Make sure the user you are logged into has necessary privileges to run create model and create table (refer above for managing permissions ) */

DROP TABLE IF EXISTS customer_activity;

/* Table DDL for the customer data set used for AUTO with binary classification */

CREATE TABLE customer_activity (
state varchar(2), 
account_length int, 
area_code int,
phone varchar(8), 
intl_plan varchar(3), 
vMail_plan varchar(3),
vMail_message int, 
day_mins float, 
day_calls int, 
day_charge float,
total_charge float,
eve_mins float, 
eve_calls int, 
eve_charge float, 
night_mins float,
night_calls int, 
night_charge float, 
intl_mins float, 
intl_calls int,
intl_charge float, 
cust_serv_calls int, 
churn varchar(6),
record_date date);


/* Load the table with the sample data set, please replace the IAM role of your choice */ 

COPY customer_activity FROM 's3://redshift-downloads/redshift-ml/customer_activity/' IAM_ROLE 'arn:aws:iam::XXXXXXXXXXXX:role/Redshift-ML' delimiter ',' IGNOREHEADER 1;

/*create a new model AUTO settings 
  in this example the model uses the data from table 'customer_churn' as the training set
  Replace S3_BUCKET option with your own bucket and the IAM_ROLE with your own IAM_ROLE with necessary privileges including S3 Read/Write and Amazon SageMaker */ 

/* Once the create model command is finished, a function named 'ml_fn_customer_churn_auto' which will be used in the subsequent inference (prediction) query below */

DROP MODEL IF EXISTS customer_churn_auto_model;

/* create model using defaul settings, training data set is customer activity 
for a imaginary mobile operator , the model uses only the activity before 2020-01-01 */

CREATE MODEL customer_churn_auto_model
FROM (SELECT state,
             account_length,
             area_code,
             total_charge/account_length AS average_daily_spend, 
             cust_serv_calls/account_length AS average_daily_cases,
             churn 
      FROM customer_activity
      WHERE  record_date < '2020-01-01' 
     )
TARGET churn
FUNCTION ml_fn_customer_churn_auto
IAM_ROLE 'arn:aws:iam::XXXXXXXXXXXX:role/Redshift-ML'
SETTINGS (
  S3_BUCKET 'your-bucket',
  max_runtime 1800
);


/* grant usage on model to the same group of users in marketing_analyst_grp */
GRANT EXECUTE ON MODEL demo_ml.customer_churn_auto_model TO marketing_analyst_grp;


/* inference query on customer joined after 2020-01-01 to predict customer churn */ 

SELECT phone, 
       ml_fn_customer_churn_auto( 
          state,
          account_length,
          area_code, 
          total_charge/account_length , 
          cust_serv_calls/account_length )
          AS active
FROM customer_activity
WHERE record_date > '2020-01-01';



/* variation of the inference query predicting customer churn after 2020-01-01 among states */

WITH infered AS (
SELECT state,
       ml_fn_customer_churn_auto( 
          state,
          account_length,
          area_code, 
          total_charge/account_length, 
          cust_serv_calls/account_length )::varchar(6)
          AS active
FROM customer_activity
WHERE record_date > '2020-01-01' )
SELECT state,SUM(CASE when active = 'True.' THEN 1 else 0 end) as churners ,SUM(CASE when active = 'False.' THEN 1 else 0 end) as nonchurners, count(*) as total_per_state from infered group by state order by state;




/* Customer example using XGBOOST */ 

/* Example uses abalone data */ 


DROP TABLE IF EXISTS abalone_xgb;

CREATE TABLE abalone_xgb (
length_val float, 
diameter float, 
height float,
whole_weight float, 
shucked_weight float, 
viscera_weight float,
shell_weight float, 
rings int,
record_number int);

COPY abalone_xgb FROM 's3://redshift-downloads/redshift-ml/abalone_xgb/' IAM_ROLE 'arn:aws:iam::XXXXXXXXXXXX:role/Redshift-ML' IGNOREHEADER 1 CSV;

/* create a new model with XGBOOST using abalone dataset 
  Replace S3_BUCKET option with your own bucket and the IAM_ROLE with your own IAM_ROLE with necessary privileges including S3 Read/Write and Amazon SageMaker */ 

/* Once the create model command is finished, a function named 'ml_fn_abalone_xgboost_multi_predict_age' which will be used in the subsequent inference (prediction) query below */

/* create model using modified abalone data set as the training data set with record number
   less than 2500 */

drop model abalone_xgboost_multi_predict_age;

CREATE MODEL abalone_xgboost_multi_predict_age
FROM ( SELECT length_val,
              diameter,
              height,
              whole_weight,
              shucked_weight,
              viscera_weight,
              shell_weight,
              rings 
        FROM abalone_xgb WHERE record_number < 2500 )
TARGET rings FUNCTION ml_fn_abalone_xgboost_multi_predict_age
IAM_ROLE 'arn:aws:iam::XXXXXXXXXXXX:role/Redshift-ML'
AUTO OFF
MODEL_TYPE XGBOOST
OBJECTIVE 'multi:softmax'
PREPROCESSORS 'none'
HYPERPARAMETERS DEFAULT EXCEPT (NUM_ROUND '100', NUM_CLASS '30')
settings (S3_BUCKET 'your-bucket', max_runtime 1800);


/* Inference query to predict the age of abalone for record numbers greater than 2500 */
select ml_fn_abalone_xgboost_multi_predict_age(length_val, 
                                               diameter, 
                                               height, 
                                               whole_weight, 
                                               shucked_weight, 
                                               viscera_weight, 
                                               shell_weight)+1.5 as age 
from abalone_xgb where record_number > 2500;


