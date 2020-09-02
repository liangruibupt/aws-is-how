from elasticsearch import Elasticsearch
import sys

class ESUtils(object):
    def __init__(self, index_name, create_index=False):
        self.es = Elasticsearch()
        self.index = index_name
        if create_index:
            mapping = {
                'properties': {
                    'question': {
                        'type': 'text',
                        'analyzer': 'ik_max_word',
                        'search_analyzer': 'ik_smart'
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
        count = self.es.count(index=self.index)['count']  # 获取当前数据库中的已有document数量
        def gen_data():
            for i, qa in enumerate(qa_pairs):
                yield {
                    '_index': self.index,
                    '_id': i + count,
                    'data_source': data_source,
                    'question': qa[0],
                    'answer': qa[1]
                }
        bulk(self.es, gen_data())

    def get_qa_pairs(self, csv_path):
	qa_pairs = pd.read_csv(csv_path)
	#qa_pairs = list(zip(qa_pairs['question'], qa_pairs['answer']))
    qa_pairs = list(qa_pairs['question'], qa_pairs['answer'])
    return qa_pairs


class ESChat(object):
    def __init__(self, ip, port, index_name):
        self.es = Elasticsearch(hosts=[ip], port=port)
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
                    "question": input_str
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
            print(self.search(sentence)[0]['answer'])
            print("> ", end='')
            sys.stdout.flush()
            sentence = sys.stdin.readline().strip()


if __name__ == '__main__':
    es_chat = ESChat(ip='localhost', port=9200, index_name='qa')
    es_chat.chat()
