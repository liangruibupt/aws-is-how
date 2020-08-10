\set s3datareadrolevar 'aws_iam_role=' :s3datareadrole
-- This transform ETL will refresh data for the store_sales table
-- Start a new transaction
begin transaction;

-- Create a stg_store_sales staging table and COPY data from input S3 location it with updated rows from SALES_UPDATE

DROP TABLE if exists public.stg_store_sales;

CREATE TABLE public.stg_store_sales
(
	sold_date DATE   ENCODE lzo
	,sold_time INTEGER   ENCODE lzo
	,i_item_id CHAR(16)   ENCODE lzo
	,c_customer_id CHAR(16)   ENCODE lzo
	,cd_demo_sk INTEGER   ENCODE lzo
	,hd_income_band_sk INTEGER   ENCODE lzo
	,hd_buy_potential CHAR(15)   ENCODE lzo
	,hd_dep_count INTEGER   ENCODE lzo
	,hd_vehicle_count INTEGER   ENCODE lzo
	,ca_address_id CHAR(16)   ENCODE lzo
	,s_store_id CHAR(16)   ENCODE lzo
	,p_promo_id CHAR(16)   ENCODE lzo
	,ss_ticket_number INTEGER   ENCODE lzo
	,ss_quantity INTEGER   ENCODE lzo
	,ss_wholesale_cost NUMERIC(7,2)   ENCODE lzo
	,ss_list_price NUMERIC(7,2)   ENCODE lzo
	,ss_sales_price NUMERIC(7,2)   ENCODE lzo
	,ss_ext_discount_amt NUMERIC(7,2)   ENCODE lzo
	,ss_ext_sales_price NUMERIC(7,2)   ENCODE lzo
	,ss_ext_wholesale_cost NUMERIC(7,2)   ENCODE lzo
	,ss_ext_list_price NUMERIC(7,2)   ENCODE lzo
	,ss_ext_tax NUMERIC(7,2)   ENCODE lzo
	,ss_coupon_amt NUMERIC(7,2)   ENCODE lzo
	,ss_net_paid NUMERIC(7,2)   ENCODE lzo
	,ss_net_paid_inc_tax NUMERIC(7,2)   ENCODE lzo
	,ss_net_profit NUMERIC(7,2)   ENCODE lzo
)
BACKUP NO
DISTSTYLE EVEN
;


\set s3loc 's3://salamander-us-east-1/reinvent2018/ant353/store_sales/saledate=' :dt '/'

-- COPY input data to the staging table

copy public.stg_store_sales
from
:'s3loc'
CREDENTIALS :'s3datareadrolevar'
DELIMITER '~' gzip region 'us-east-1';

-- Delete any rows from target store_sales for the input date for idempotency

delete from store_sales where ss_sold_date_sk in (select d_date_sk from date_dim where d_date=:'dt');

--Insert data from staging table to the target TABLE

INSERT INTO store_sales
(
  ss_sold_date_sk,
  ss_sold_time_sk,
  ss_item_sk,
  ss_customer_sk,
  ss_cdemo_sk,
  ss_hdemo_sk,
  ss_addr_sk,
  ss_store_sk,
  ss_promo_sk,
  ss_ticket_number,
  ss_quantity,
  ss_wholesale_cost,
  ss_list_price,
  ss_sales_price,
  ss_ext_discount_amt,
  ss_ext_sales_price,
  ss_ext_wholesale_cost,
  ss_ext_list_price,
  ss_ext_tax,
  ss_coupon_amt,
  ss_net_paid,
  ss_net_paid_inc_tax,
  ss_net_profit
)
SELECT date_dim.d_date_sk ss_sold_date_sk,
       time_dim.t_time_sk ss_sold_time_sk,
       item.i_item_sk ss_item_sk,
       customer.c_customer_sk ss_customer_sk,
       customer_demographics.cd_demo_sk ss_cdemo_sk,
       household_demographics.hd_demo_sk ss_hdemo_sk,
       customer_address.ca_address_sk ss_addr_sk,
       store.s_store_sk ss_store_sk,
       promotion.p_promo_sk ss_promo_sk,
       ss_ticket_number,
       ss_quantity,
       ss_wholesale_cost,
       ss_list_price,
       ss_sales_price,
       ss_ext_discount_amt,
       ss_ext_sales_price,
       ss_ext_wholesale_cost,
       ss_ext_list_price,
       ss_ext_tax,
       ss_coupon_amt,
       ss_net_paid,
       ss_net_paid_inc_tax,
       ss_net_profit
FROM stg_store_sales AS store_sales
  JOIN date_dim ON store_sales.sold_date = date_dim.d_date
  LEFT JOIN time_dim ON store_sales.sold_time = time_dim.t_time
  LEFT JOIN item
         ON store_sales.i_item_id = item.i_item_id
        AND i_rec_end_date IS NULL
  LEFT JOIN customer ON store_sales.c_customer_id = customer.c_customer_id
  LEFT JOIN customer_demographics ON store_sales.cd_demo_sk = customer_demographics.cd_demo_sk
  LEFT JOIN household_demographics
         ON store_sales.hd_income_band_sk = household_demographics.hd_income_band_sk
        AND store_sales.hd_buy_potential = household_demographics.hd_buy_potential
        AND store_sales.hd_dep_count = household_demographics.hd_dep_count
        AND store_sales.hd_vehicle_count = household_demographics.hd_vehicle_count
  LEFT JOIN customer_address ON store_sales.ca_address_id = customer_address.ca_address_id
  LEFT JOIN store
         ON store_sales.s_store_id = store.s_store_id
        AND s_rec_end_date IS NULL
  LEFT JOIN promotion ON store_sales.p_promo_id = promotion.p_promo_id;

  --drop staging table

  DROP TABLE if exists public.stg_store_sales;

  -- End transaction and commit
  end transaction;
