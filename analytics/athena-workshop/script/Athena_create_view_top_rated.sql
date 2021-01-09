CREATE view topratedproducts AS
SELECT product_category,
        product_id,
        product_title,
        count(*) count_reviews
FROM amazon_reviews_parquet
WHERE star_rating=5
GROUP BY  1, 2, 3
ORDER BY  4 desc;

Select * from topratedproducts limit 10;