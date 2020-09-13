import optparse
import json
import sys
from requests_aws4auth import AWS4Auth
import boto3
import requests

def get_options():
    opt = optparse.OptionParser()
    opt.add_option('--endpoint', action='store', type='str', default=None,
                   help='amazon es endpoint to send data')
    opt.add_option('--region', action='store', type='str', default=None,
                   help='amazon region in format like us-east-1, etc')
    return opt.parse_args(sys.argv)

def send_data(opts):

    service = 'es'
    credentials = boto3.Session().get_credentials()
    awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, opts.region, service, session_token=credentials.token)

    records = list()
    url = "https://%s/_bulk/" % opts.endpoint

    with open('2013Imdb.txt', 'r') as imdb_data_file:
        imdb_data = json.load(imdb_data_file)
        for rec in imdb_data:
            #records.append('{"index" : { "_index" : "movies"} }')
            print '{"index" : { "_index" : "movies", "_type": "_doc", "_id": "' + rec['id'] + '"} }'
            records.append('{"index" : { "_index" : "movies", "_type": "_doc", "_id": "' + rec['id'] + '"} }')
            records.append(json.JSONEncoder().encode(rec['fields']))
            if (len(records) / 2) >= 100:
                #print records
                print 'Flushing %d records' % (len(records) / 2)
                res = requests.post(url, auth=awsauth, data=("\n".join(records)) + "\n", headers={"Content-Type":"application/json"})
                print res.text
                records = list()
        print 'Flushing %d records' % (len(records) / 2)
        res = requests.post(url, auth=awsauth, data="\n".join(records))
        print res.text

if __name__== '__main__':
    (opts, args) = get_options()
    if not opts.endpoint:
        raise Exception('--endpoint is required')
    if not opts.region:
        raise Exception('--region is required')

    send_data(opts)