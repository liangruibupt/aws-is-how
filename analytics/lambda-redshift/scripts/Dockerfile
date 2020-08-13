FROM amazonlinux:latest
RUN yum -y install which unzip aws-cli
RUN yum install -y python3
RUN echo "alias python=/usr/bin/python3" >> ~/.bash_profile
RUN echo "alias pip=/usr/bin/pip3" >> ~/.bash_profile
RUN source ~/.bash_profile
RUN pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple psycopg2-binary
RUN pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple boto3

ADD fetch_and_run.sh /usr/local/bin/fetch_and_run.sh
WORKDIR /tmp
USER nobody
ENTRYPOINT ["/usr/local/bin/fetch_and_run.sh"]
