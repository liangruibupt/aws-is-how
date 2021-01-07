CREATE EXTERNAL TABLE amazon_reviews_tsv (
marketplace string, 
customer_id string, 
review_id string, 
product_id string, 
product_parent string, 
product_title string, 
product_category string, 
star_rating int, 
helpful_votes int, 
total_votes int, 
vine string, 
verified_purchase string, 
review_headline string, 
review_body string, 
review_date date,
year int)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY '\t'
ESCAPED BY '\\'
LINES TERMINATED BY '\n'
LOCATION
's3://amazon-reviews-pds/tsv/'
TBLPROPERTIES ("skip.header.line.count"="1");  
