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

    url = "https://%s/_template/movies_template" % opts.endpoint

    payload = {
        "index_patterns": [
            "movies*"
        ],
        "settings": {
            "index.number_of_shards": 1,
            "index.number_of_replicas": 2
        },
        "mappings": {
            "_doc": {
                "properties": {
                    "actors": {
                        "type": "text",
                        "fields": {
                            "keyword": {
                                "type": "keyword",
                                "ignore_above": 256
                            }
                        }
                    },
                    "directors": {
                        "type": "text",
                        "fields": {
                            "keyword": {
                                "type": "keyword",
                                "ignore_above": 256
                            }
                        }
                    },
                    "genres": {
                        "type": "text",
                        "fields": {
                            "keyword": {
                                "type": "keyword",
                                "ignore_above": 256
                            }
                        }
                    },
                    "image_url": {
                        "type": "text",
                        "fields": {
                            "keyword": {
                                "type": "keyword",
                                "ignore_above": 256
                            }
                        }
                    },
                    "plot": {
                        "type": "text",
                        "fielddata": "true",
                        "fields": {
                            "keyword": {
                                "type": "keyword",
                                "ignore_above": 256
                            }
                        }
                    },
                    "rank": {
                        "type": "long"
                    },
                    "rating": {
                        "type": "float"
                    },
                    "release_date": {
                        "type": "date"
                    },
                    "running_time_secs": {
                        "type": "long"
                    },
                    "title": {
                        "type": "text",
                        "fields": {
                            "keyword": {
                                "type": "keyword",
                                "ignore_above": 256
                            }
                        }
                    },
                    "year": {
                        "type": "long"
                    }
                }
            }
        }
    }


    res = requests.put(url, auth=awsauth, json=payload)
    print res


if __name__== '__main__':
    (opts, args) = get_options()
    if not opts.endpoint:
        raise Exception('--endpoint is required')
    if not opts.region:
        raise Exception('--region is required')

    send_data(opts)

