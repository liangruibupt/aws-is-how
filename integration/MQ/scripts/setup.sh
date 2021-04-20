#!/bin/bash
current_dir=$(pwd)
working_dir=$current_dir/..

cd $working_dir
current_dir=$(pwd)
echo "Installing jq..."
sudo yum install -y jq > /dev/null 2>&1
java_version=`java -version |& awk -F '"' '/version/ {print $2}'`
if [[ "$java_version" =~ .*1\.8.*  ]]; then
    echo "Java is up to date"
else 
    echo "Updating java to 1.8..."
    wget https://d3pxv6yz143wms.cloudfront.net/8.222.10.1/java-1.8.0-amazon-corretto-devel-1.8.0_222.b10-1.x86_64.rpm > /dev/null 2>&1
    sudo yum localinstall -y java-1.8.0-amazon-corretto-devel-1.8.0_222.b10-1.x86_64.rpm > /dev/null 2>&1
fi

echo "export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which javac))))" >> ~/.bashrc
source ~/.bashrc

mvn_version=`mvn -version |& awk '/Apache Maven/ {print $3 }'`
if [[ "$mvn_version" =~ .*3\.6.* ]]; then
    echo "Maven is up to date"
else 
    echo "Updating maven to 3.6..."
    wget https://archive.apache.org/dist/maven/maven-3/3.6.3/binaries/apache-maven-3.6.3-bin.tar.gz > /dev/null 2>&1
    tar zxvf apache-maven-3.6.3-bin.tar.gz > /dev/null 2>&1
    echo "export PATH=$current_dir/apache-maven-3.6.3/bin:$PATH" >> ~/.bashrc
fi

if [[ -d $current_dir/activemq-perftest ]];
then
    echo "Maven performance tool kit exists"
else 
    echo "Installing maven performance plugin..."
    svn checkout http://svn.apache.org/repos/asf/activemq/sandbox/activemq-perftest/ activemq-perftest > /dev/null 2>&1
    sed -i 's/5.8-SNAPSHOT/5.15.9/g' $current_dir/activemq-perftest/pom.xml 
    mkdir $current_dir/activemq-perftest/reports
fi
echo "Getting broker urls..."
brokerId=`aws mq list-brokers --region $AWS_DEFAULT_REGION | jq '.BrokerSummaries[] | select(.BrokerName=="Broker") | {id:.BrokerId}' | grep "id" | cut -d '"' -f4`
nob1Id=`aws mq list-brokers --region $AWS_DEFAULT_REGION | jq '.BrokerSummaries[] | select(.BrokerName=="NoB1") | {id:.BrokerId}' | grep "id" | cut -d '"' -f4`
nob2Id=`aws mq list-brokers --region $AWS_DEFAULT_REGION | jq '.BrokerSummaries[] | select(.BrokerName=="NoB2") | {id:.BrokerId}' | grep "id" | cut -d '"' -f4`
nob3Id=`aws mq list-brokers --region $AWS_DEFAULT_REGION | jq '.BrokerSummaries[] | select(.BrokerName=="NoB3") | {id:.BrokerId}' | grep "id" | cut -d '"' -f4`
url=`aws mq describe-broker --broker-id=$brokerId --region $AWS_DEFAULT_REGION | jq '.BrokerInstances[].Endpoints[0]' | xargs -n 2 | awk '{ print "failover:("$1","$2")" }'`
mesh1url=`aws mq describe-broker --broker-id=$nob1Id --region $AWS_DEFAULT_REGION | jq '.BrokerInstances[].Endpoints[0]' | xargs -n 2 | awk '{ print "failover:("$1","$2")" }'`
mesh2url=`aws mq describe-broker --broker-id=$nob2Id --region $AWS_DEFAULT_REGION | jq '.BrokerInstances[].Endpoints[0]' | xargs -n 2 | awk '{ print "failover:("$1","$2")" }'`
mesh3url=`aws mq describe-broker --broker-id=$nob3Id --region $AWS_DEFAULT_REGION | jq '.BrokerInstances[].Endpoints[0]' | xargs -n 2 | awk '{ print "failover:("$1","$2")" }'`
echo "Saving broker urls..."

echo "perfurl=\"$url\"" >> ~/.bashrc; 
echo "url=\"$url\"" >> ~/.bashrc; 
echo "mesh1url=\"$mesh1url\"" >> ~/.bashrc; 
echo "mesh2url=\"$mesh2url\"" >> ~/.bashrc; 
echo "mesh3url=\"$mesh3url\"" >> ~/.bashrc; 

echo "Accessing parameter store..."
userPassword=`aws ssm get-parameter --name "MQBrokerUserPassword" --region $AWS_DEFAULT_REGION |& grep "Value\|ParameterNotFound"`
if [[ $userPassword =~ .*ParameterNotFound.* ]];
then
    echo "Unable to obtain parameters from SSM. Most likely you are running this script outside of workshop using default one: workshopUser."
    userPassword="workshopUser"
fi
brokerUser=`echo $userPassword | sed 's/"//g' | sed 's/Value://g' | cut -d',' -f1 | sed 's/ //g'`
brokerPassword=`echo $userPassword | sed 's/"//g' | sed 's/Value://g' | cut -d',' -f2`


echo "brokerUser=\"$brokerUser\"" >> ~/.bashrc; 
echo "brokerPassword=\"$brokerPassword\"" >> ~/.bashrc; 

source ~/.bashrc

if [[ ! -z $perfurl ]]; 
then
printf "\nfactory.brokerURL=$perfurl\n" >> $current_dir/amazon-mq-workshop/openwire-producer.properties
printf "factory.userName=$brokerUser\n" >> $current_dir/amazon-mq-workshop/openwire-producer.properties
printf "factory.password=$brokerPassword\n" >> $current_dir/amazon-mq-workshop/openwire-producer.properties
printf "\nfactory.brokerURL=$perfurl\n" >> $current_dir/amazon-mq-workshop/openwire-consumer.properties
printf "factory.userName=$brokerUser\n" >> $current_dir/amazon-mq-workshop/openwire-consumer.properties
printf "factory.password=$brokerPassword\n" >> $current_dir/amazon-mq-workshop/openwire-consumer.properties
fi
echo "Done."
