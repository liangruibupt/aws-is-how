FROM centos:centos7

RUN yum -y update; yum clean all
RUN yum -y install epel-release python-pip; yum clean all
RUN yum -y install python-pip; yum clean all
RUN pip install --upgrade pip;
RUN pip install flask;

COPY . /src

EXPOSE 8080

CMD cd /src && python webpage.py