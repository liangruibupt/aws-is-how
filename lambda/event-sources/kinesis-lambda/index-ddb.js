const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB();
const sns = new AWS.SNS();

console.log('Loading function');

exports.handler = async (event) => {
    const [record] = event.Records;
    try {
        const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
        // save records to the dynamodb
        await dynamodb.putItem({
            TableName: 'kinesis-lambda-table',
            Item: {
                recordId: { S: record.eventID },
                payload: { S: payload },
            }
        }).promise();

        await sns.publish({
            TopicArn: process.env.NOTIFICATIONS_TOPIC_ARN,
            Subject: "kinesis-lambda-sns",
            Message: "record.eventID: " + record.eventID + " , payload: " + payload
        }).promise();

    } catch (err) {
        console.log(err);
    }
};