
var AWS = require('aws-sdk');
var sqs = new AWS.SQS({
    region: process.env.AWS_REGION
});
// Just echo each request URL path.
exports.handler = function (event, context, callback) {
    console.log("request:", JSON.stringify(event, undefined, 2));
    var queueUrl = process.env.QUEUE_NAME;
    var msgBody = `Hello, CDK! You have hit ${event.path}`;
    console.log("queueUrl: " + queueUrl, "msgBody: " + msgBody);
    // SQS message parameters
    var params = {
        MessageBody: msgBody,
        QueueUrl: queueUrl
    };
    var responseBody = {
        message: '',
        messageId: ''
    };
    sqs.sendMessage(params, function (err, data) {
        if (err) {
            console.log('error:', "failed to send message" + err);
            var responseCode = 500;
        }
        else {
            var responseCode = 200;
            responseBody.message = 'Sent to ' + queueUrl;
            responseBody.messageId = data.MessageId;
            console.log('data:', JSON.stringify(responseBody));
        }
        var response = {
            statusCode: responseCode,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(responseBody)
        };
        callback(null, response);
    });
};