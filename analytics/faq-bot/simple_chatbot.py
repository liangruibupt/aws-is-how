from elasticsearch import Elasticsearch
import sys
import pandas as pd
from elasticsearch import helpers
import datetime
import os
import requests
from requests_aws4auth import AWS4Auth
import argparse

ES_USER = os.environ['ES_USER']
ES_PASSWORD = os.environ['ES_PASSWORD']
ES_HOST = os.environ['ES_HOST']

parser = argparse.ArgumentParser()
parser.add_argument('--create_index', action='store_true', default=False)
args = parser.parse_args()
create_index = args.create_index


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
        hits = self.es.search(index=self.index, body=dsl)["hits"]["hits"]
        qa_pairs = []
        for h in hits:
            qa_pairs.append(
                {'score': h['_score'], 'question': h['_source']['question'], 'answer': h['_source']['answer']})
        return qa_pairs

    def chat(self):
        """聊天方法，在系统输出'> '后输入句子，得到系统回复，输入exit结束聊天。"""
        sys.stdout.write("> ")
        sys.stdout.flush()
        sentence = sys.stdin.readline().strip()

        while sentence:
            if sentence == 'exit':
                break
            # 使用最高score的结果，但是需要优化：从多个结果找出最匹配的
            print(self.search(sentence)[0]['answer'])
            print("> ", end='')
            sys.stdout.flush()
            sentence = sys.stdin.readline().strip()


if __name__ == '__main__':
    es_util = ESUtils(ip=ES_HOST, port=9200, index_name='faq')
    if create_index:
        print('create index and load question')
        es_util.create_index()
        qa_pair = es_util.get_qa_pairs('faq_data.csv')
        es_util.insert_qa_pairs(qa_pair, 'faq_dataset_manual')
    else:
        print('Skip create index and load question')
    es_chat = ESChat(ip=ES_HOST, port=9200, index_name='faq')
    es_chat.chat()
