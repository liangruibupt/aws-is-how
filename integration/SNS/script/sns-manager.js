// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
const yargs = require('yargs');

const AWS_REGION = 'cn-northwest-1'
// Set region
AWS.config.update({ region: AWS_REGION });


function createTopic(topic_name) {
    // Create promise and SNS service object
    var createTopicPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).createTopic({ Name: topic_name }).promise();

    // Handle promise's fulfilled/rejected states
    createTopicPromise.then(
        function (data) {
            console.log("Topic ARN is " + data.TopicArn);
        }).catch(
            function (err) {
                console.error(err, err.stack);
            });
}

function listTopic() {
    // Create promise and SNS service object
    var listTopicsPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).listTopics({}).promise();

    // Handle promise's fulfilled/rejected states
    listTopicsPromise.then(
        function (data) {
            console.log(data.Topics);
        }).catch(
            function (err) {
                console.error(err, err.stack);
            });
}

function getTopic(topic_arn) {
    // Create promise and SNS service object
    var getTopicAttribsPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).getTopicAttributes({ TopicArn: topic_arn }).promise();

    // Handle promise's fulfilled/rejected states
    getTopicAttribsPromise.then(
        function (data) {
            console.log(data);
        }).catch(
            function (err) {
                console.error(err, err.stack);
            });
}

function publishMessage(topic_arn, message) {
    // Create publish parameters
    console.log(new Date().toLocaleString())
    var params = {
        Message: message, /* required */
        TopicArn: topic_arn,
        Subject: "TestMassge"
    };

    // Create promise and SNS service object
    var publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();

    // Handle promise's fulfilled/rejected states
    publishTextPromise.then(
        function (data) {
            console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`);
            console.log("MessageID is " + data.MessageId);
        }).catch(
            function (err) {
                console.error(err, err.stack);
            });

}

function subscribeEmail(topic_arn, email_address) {
    // Create subscribe/email parameters
    var params = {
        Protocol: 'EMAIL', /* required */
        TopicArn: topic_arn, /* required */
        Endpoint: email_address
    };

    // Create promise and SNS service object
    var subscribePromise = new AWS.SNS({ apiVersion: '2010-03-31' }).subscribe(params).promise();

    // Handle promise's fulfilled/rejected states
    subscribePromise.then(
        function (data) {
            console.log("Subscription ARN is " + data.SubscriptionArn);
        }).catch(
            function (err) {
                console.error(err, err.stack);
            });
}

const argv = yargs.command('createTopic [topic]', 'create the sns topic', (yargs) => {
    yargs
        .positional('topic', {
            describe: 'sns topic',
            default: 'SNS-HTTP-Demo'
        })
}, (argv) => {
    console.info(`create sns topic :${argv.topic}`)
    createTopic(argv.topic)
})
    .command('listTopic', 'list the sns topics', (argv) => {
        console.info(`list sns topic`)
        listTopic()
    })
    .command('getTopic [topic_arn]', 'get details of the sns topic', (yargs) => {
        yargs
            .positional('topic_arn', {
                describe: 'sns topic arn'
            })
    }, (argv) => {
        console.info(`getTopic sns topic :${argv.topic_arn}`)
        getTopic(argv.topic_arn)
    })
    .command('publishMessage <topic_arn> [message]', 'sent message to the sns topic', (yargs) => {
        yargs.positional('topic_arn', {
            describe: 'sns topic arn'
        })
            .positional('message', {
                describe: 'sns message'
            })
    }, (argv) => {
        console.info(`publishMessage sns topic :${argv.topic_arn} with ${argv.message}`)
        publishMessage(argv.topic_arn, argv.message)
    })
    .command('subscribeEmail <topic_arn> [email_address]', 'sub email endpoint to the sns topic', (yargs) => {
        yargs.positional('topic_arn', {
            describe: 'sns topic arn'
        })
            .positional('email_address', {
                describe: 'sns subscribe email_address'
            })
    }, (argv) => {
        console.info(`subscribeEmail sns topic :${argv.topic_arn} with ${argv.email_address}`)
        subscribeEmail(argv.topic_arn, argv.email_address)
    })
    .help()
    .argv;

