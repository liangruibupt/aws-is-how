curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install node
npm install aws-es-curl -g
aws-es-curl --region ap-southeast-1 --profile default -X GET 'https://search-centralizedlogging-g4ybhxmqmgktv6lm63stgap6ge.ap-southeast-1.es.amazonaws.com/'