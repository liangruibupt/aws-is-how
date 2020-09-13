pip install boto3 --user
pip install elasticsearch --user
pip install requests --user
pip install requests-aws4auth --user
wget https://search-sa-log-solutions.s3-us-east-2.amazonaws.com/fluentd-kinesis-logstash/packages/put-data.py
wget https://search-sa-log-solutions.s3-us-east-2.amazonaws.com/fluentd-kinesis-logstash/packages/put-mappings.py
wget https://search-sa-log-solutions.s3-us-east-2.amazonaws.com/fluentd-kinesis-logstash/data/2013Imdb.txt
echo 'putting mappings'
python put-mappings.py --endpoint search-centralizedlogging-g4ybhxmqmgktv6lm63stgap6ge.ap-southeast-1.es.amazonaws.com --region ap-southeast-1
echo 'posting data'
python put-data.py --endpoint search-centralizedlogging-g4ybhxmqmgktv6lm63stgap6ge.ap-southeast-1.es.amazonaws.com --region ap-southeast-1