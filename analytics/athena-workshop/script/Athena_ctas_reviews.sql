CREATE TABLE amazon_reviews_by_marketplace
WITH ( format='PARQUET', parquet_compression = 'SNAPPY', partitioned_by = ARRAY['marketplace', 'year'], 
external_location =   's3://<<Athena-WorkShop-Bucket>>/athena-ctas-insert-into/') AS
SELECT customer_id,
        review_id,
        product_id,
        product_parent,
        product_title,
        product_category,
        star_rating,
        helpful_votes,
        total_votes,
        verified_purchase,
        review_headline,
        review_body,
        review_date,
        marketplace,
        year(review_date) AS year
FROM amazon_reviews_tsv
WHERE "$path" LIKE '%tsv.gz';

/* Let's try to find the products and their corresponding category by number of reviews and avg star rating for US marketplace in year 2015 */

SELECT product_id,
        product_category,
        product_title,
        count(*) AS num_reviews,
        avg(star_rating) AS avg_stars
FROM amazon_reviews_by_marketplace
WHERE marketplace='US'
AND year=2015
GROUP BY  1, 2, 3
ORDER BY  4 DESC limit 10; 
