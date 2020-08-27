--
-- import logs and break into tuples
--

raw_logs =
  -- load the weblogs into a sequence of one element tuples
  LOAD '$INPUT' USING TextLoader AS (line:chararray);

logs_base =
  -- for each weblog string convert the weblong string into a
  -- structure with named fields
  FOREACH
    raw_logs
  GENERATE
    FLATTEN (
      REGEX_EXTRACT_ALL(
        line,
        '^(\\S+) (\\S+) (\\S+) \\[([\\w:/]+\\s[+\\-]\\d{4})\\] "(.+?)" (\\S+) (\\S+) "([^"]*)" "([^"]*)"'
      )
    )
    AS (
      remoteAddr: chararray, remoteLogname: chararray, user: chararray, time: chararray,
      request: chararray, status: int, bytes_string: chararray, referrer: chararray,
      browser: chararray
    )
  ;

logs =
  -- convert from string values to typed values such as date_time and integers
  FOREACH 
    logs_base 
  GENERATE 
    *, 
    ToDate(time, 'dd/MMM/yyyy:HH:mm:ss Z', 'UTC') as dtime,
    (int)REPLACE(bytes_string, '-', '0')          as bytes
  ;


--
-- determine total number of requests and bytes served by UTC hour of day
-- aggregating as a typical day across the total time of the logs
--
by_hour_count =
  -- group logs by their hour of day, counting the number of logs in that hour
  -- and the sum of the bytes of rows for that hour
  FOREACH 
    (GROUP logs BY GetHour(dtime))
  GENERATE 
    $0, 
    COUNT($1) AS num_requests, 
    SUM($1.bytes) AS num_bytes
  ;

STORE by_hour_count INTO '$OUTPUT/total_requests_bytes_per_hour';



--
-- top 50 X.X.X.* blocks
--
by_ip_count =
  -- group weblog entries by the ip address from the remote address field
  -- and count the number of entries for each address blok as well as
  -- the sum of the bytes
    FOREACH
      (GROUP logs BY (chararray)REGEX_EXTRACT(remoteAddr, '(\\d+\\.\\d+\\.\\d+)', 1))
  --     (GROUP logs BY block)
    GENERATE  $0,
      COUNT($1) AS num_requests,
      SUM($1.bytes) AS num_bytes
  ; 



by_ip_count_sorted =  ORDER by_ip_count BY num_requests DESC;

by_ip_count_limited =
  -- order ip by the number of requests they make
  LIMIT by_ip_count_sorted 50;

STORE by_ip_count_limited into '$OUTPUT/top_50_ips';


--
-- top 50 external referrers
--
by_referrer_count =
  -- group by the referrer URL and count the number of requests
  FOREACH
    (GROUP logs BY (chararray)REGEX_EXTRACT(referrer, '(http:\\/\\/[a-z0-9\\.-]+)', 1))
  GENERATE
    FLATTEN($0),
    COUNT($1) AS num_requests
  ;

by_referrer_count_filtered =
  -- exclude matches for example.org
  FILTER by_referrer_count BY NOT $0 matches '.*example\\.org';

by_referrer_count_sorted =
  -- take the top 50 results
  ORDER by_referrer_count_filtered BY $1 DESC;

by_referrer_count_limited =
  -- take the top 50 results
  LIMIT by_referrer_count_sorted 50;

STORE by_referrer_count_limited INTO '$OUTPUT/top_50_external_referrers';


--
-- top search terms coming from bing or google
--
google_and_bing_urls =
  -- find referrer fields that match either bing or google
  FILTER
    (FOREACH logs GENERATE referrer)
  BY
    referrer matches '.*bing.*'
  OR
    referrer matches '.*google.*'
  ;

search_terms =
  -- extract from each referrer url the search phrases
  FOREACH
    google_and_bing_urls
  GENERATE
    FLATTEN(REGEX_EXTRACT_ALL(referrer, '.*[&\\?]q=([^&]+).*')) as (term:chararray)
  ;

search_terms_filtered =
  -- reject urls that contained no search terms
  FILTER search_terms BY NOT $0 IS NULL;

search_terms_count =
  -- for each search phrase count the number of weblogs entries that contained it
  FOREACH
    (GROUP search_terms_filtered BY $0)
  GENERATE
    $0,
    COUNT($1) AS num
  ;

search_terms_count_sorted =
  -- order the results
  ORDER search_terms_count BY num DESC;

search_terms_count_limited =
  -- take the top 50 results
  LIMIT search_terms_count_sorted 50;

STORE search_terms_count_limited INTO '$OUTPUT/top_50_search_terms_from_bing_google';