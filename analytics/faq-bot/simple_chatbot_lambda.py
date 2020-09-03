from elasticsearch import Elasticsearch
import sys
import pandas as pd
from elasticsearch import helpers
import datetime
import os
import argparse

ES_USER = os.environ['ES_USER']
ES_PASSWORD = os.environ['ES_PASSWORD']
ES_HOST = os.environ['ES_HOST']

class ESUtils(object):
    def __init__(self, ip, port, index_name):
        self.es = Elasticsearch(
            hosts=[ip], port=port, http_auth=(ES_USER, ES_PASSWORD))
        self.index = index_name

    def create_index(self):
        mapping = {
            'properties': {
                'question': {
                    'type': 'text',
                    'analyzer': 'smartcn'
                }
            }
        }
        # 创建index
        if self.es.indices.exists(index=self.index):
            self.es.indices.delete(index=self.index)
        self.es.indices.create(index=self.index)
        # 创建mapping
        self.es.indices.put_mapping(body=mapping, index=self.index)

    def insert_qa_pairs(self, qa_pairs, data_source):
        count = self.es.count(index=self.index)[
            'count']  # 获取当前数据库中的已有document数量

        def gen_data():
            for i, qa in enumerate(qa_pairs):
                yield {
                    '_index': self.index,
                    '_id': i + count,
                    'data_source': data_source,
                    'timestamp': datetime.datetime.now().timestamp(),
                    'question': qa[0],
                    'answer': qa[1]
                }
        helpers.bulk(self.es, gen_data())

    def get_qa_pairs(self, csv_path):
        qa_pairs = pd.read_csv(csv_path, delimiter=',', quotechar='"')
        r_qa_pairs = list(zip(qa_pairs['question'], qa_pairs['answer']))
        #qa_pairs = list(qa_pairs['question'], qa_pairs['answer'])
        print(r_qa_pairs)
        return r_qa_pairs


class ESChat(object):
    def __init__(self, ip, port, index_name):
        self.es = Elasticsearch(
            hosts=[ip], port=port, http_auth=(ES_USER, ES_PASSWORD))
        self.index = index_name

    def search(self, input_str):
        """
        Args:
            input_str: 用户问句

        Returns: 由匹配的question、answer和其分数score构成的字典的列表
        """
        dsl = {
            "query": {
                "match": {
                    "question": {
                        "query": input_str,
                        "analyzer": "smartcn",
                        "operator": "AND"
                    }
                }
            }
        }
        result = self.es.search(index=self.index, body=dsl)
        hits_total = result["hits"]["total"]["value"]
        if hits_total > 0:
            hits = result["hits"]["hits"]
        else:
            dsl = {
                "query": {
                    "match": {
                        "question": {
                            "query": input_str,
                            "analyzer": "smartcn"
                        }
                    }
                }
            }
            result = self.es.search(index=self.index, body=dsl)
            hits_total = result["hits"]["total"]["value"]
            if hits_total > 0:
                hits = result["hits"]["hits"]
            else:
                hits = [
                    {
                        "_index": "faq",
                        "_type": "_doc",
                        "_id": "NA",
                        "_score": 0,
                        "_source": {
                            "data_source": "N/A",
                            "timestamp": 1.599112127713317E9,
                            "question": "N/A",
                            "answer": "N/A"
                        }
                    }
                ]
        qa_pairs = []
        for h in hits:
            qa_pairs.append(
                {'score': h['_score'], 'question': h['_source']['question'], 'answer': h['_source']['answer']})
        return qa_pairs

    def chat(self, input_str):
        return self.search(input_str)[0]['answer']


def handler(event, context):
    create_index_str = event.get('create_index', 'False')
    if create_index_str == 'True' or create_index_str == 'true':
        create_index = True
    else:
        create_index = False
    input_str = event.get('question', None)

    if input_str == None:
        return {
            'statusCode': 500,
            'body': 'Required input parameter "question" is missing! '
        }
    else:
        es_util = ESUtils(ip=ES_HOST, port=9200, index_name='faq')
        if create_index:
            print('create index and load question')
            es_util.create_index()
            qa_pair = es_util.get_qa_pairs('faq_data.csv')
            es_util.insert_qa_pairs(qa_pair, 'faq_dataset_manual')
        else:
            print('Skip create index and load question')
        es_chat = ESChat(ip=ES_HOST, port=9200, index_name='faq')
        answer_str = es_chat.chat(input_str)

        return {
            'statusCode': 200,
            'body': {'answer': answer_str}
        }
