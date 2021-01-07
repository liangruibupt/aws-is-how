/* Let's try to find the products and their corresponding category by number of reviews and avg star rating */
SELECT product_id, product_category, product_title, count(*) as num_reviews, avg(star_rating) as avg_stars
FROM amazon_reviews_tsv 
GROUP BY 1, 2, 3
ORDER BY 4 DESC
limit 10;

/* Let's try to find the products and their corresponding category by number of reviews and avg star rating on parquet table */
SELECT product_id, product_category, product_title, count(*) as num_reviews, avg(star_rating) as avg_stars
FROM amazon_reviews_parquet 
GROUP BY 1, 2, 3
ORDER BY 4 DESC
limit 10;

/* Let's try to find the products by number of reviews and avg star rating in Mobile_Apps category */
SELECT product_id, product_title, count(*) as num_reviews, avg(star_rating) as avg_stars
FROM amazon_reviews_tsv where product_category='Mobile_Apps'
GROUP BY 1, 2
ORDER BY 3 DESC
limit 10;

/* Let's try to find the products by number of reviews and avg star rating in Mobile_Apps category */
SELECT product_id, product_title, count(*) as num_reviews, avg(star_rating) as avg_stars
FROM amazon_reviews_parquet where product_category='Mobile_Apps'
GROUP BY 1, 2
ORDER BY 3 DESC
limit 10;
