# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Purpose

Shows how to use the AWS SDK for Python (Boto3) with Amazon Simple Notification
Service (Amazon SNS) to create notification topics, add subscribers, and publish
messages.
"""

import base64
import json
import logging
import time
import boto3
from botocore.exceptions import ClientError
import os

logger = logging.getLogger(__name__)

global_region_name = os.getenv('AWS_GLOBALREGION', "us-east-1")
global_secret_name = "/ses/tokyo/credential"

runtime_region = os.environ['AWS_REGION']
input_phone_number = os.environ['PHONE_HNUMBER']
input_email_address = os.environ['EMAIL_ADDRESS']

numRetries = 10

session = boto3.session.Session()
secretsmanager_client = session.client(
    service_name='secretsmanager',
    region_name = runtime_region
)

# snippet-start:[python.example_code.sns.SnsWrapper]
class SnsWrapper:
    """Encapsulates Amazon SNS topic and subscription functions."""
    def __init__(self, sns_resource):
        """
        :param sns_resource: A Boto3 Amazon SNS resource.
        """
        self.sns_resource = sns_resource
# snippet-end:[python.example_code.sns.SnsWrapper]

# snippet-start:[python.example_code.sns.CreateTopic]
    def create_topic(self, name):
        """
        Creates a notification topic.

        :param name: The name of the topic to create.
        :return: The newly created topic.
        """
        try:
            topic = self.sns_resource.create_topic(Name=name)
            logger.info("Created topic %s with ARN %s.", name, topic.arn)
        except ClientError:
            logger.exception("Couldn't create topic %s.", name)
            raise
        else:
            return topic
# snippet-end:[python.example_code.sns.CreateTopic]

# snippet-start:[python.example_code.sns.ListTopics]
    def list_topics(self):
        """
        Lists topics for the current account.

        :return: An iterator that yields the topics.
        """
        try:
            topics_iter = self.sns_resource.topics.all()
            logger.info("Got topics.")
        except ClientError:
            logger.exception("Couldn't get topics.")
            raise
        else:
            return topics_iter
# snippet-end:[python.example_code.sns.ListTopics]

    @staticmethod
# snippet-start:[python.example_code.sns.DeleteTopic]
    def delete_topic(topic):
        """
        Deletes a topic. All subscriptions to the topic are also deleted.
        """
        try:
            topic.delete()
            logger.info("Deleted topic %s.", topic.arn)
        except ClientError:
            logger.exception("Couldn't delete topic %s.", topic.arn)
            raise
# snippet-end:[python.example_code.sns.DeleteTopic]

    @staticmethod
# snippet-start:[python.example_code.sns.Subscribe]
    def subscribe(topic, protocol, endpoint):
        """
        Subscribes an endpoint to the topic. Some endpoint types, such as email,
        must be confirmed before their subscriptions are active. When a subscription
        is not confirmed, its Amazon Resource Number (ARN) is set to
        'PendingConfirmation'.

        :param topic: The topic to subscribe to.
        :param protocol: The protocol of the endpoint, such as 'sms' or 'email'.
        :param endpoint: The endpoint that receives messages, such as a phone number
                         (in E.164 format) for SMS messages, or an email address for
                         email messages.
        :return: The newly added subscription.
        """
        try:
            subscription = topic.subscribe(
                Protocol=protocol, Endpoint=endpoint, ReturnSubscriptionArn=True)
            logger.info("Subscribed %s %s to topic %s.", protocol, endpoint, topic.arn)
        except ClientError:
            logger.exception(
                "Couldn't subscribe %s %s to topic %s.", protocol, endpoint, topic.arn)
            raise
        else:
            return subscription
# snippet-end:[python.example_code.sns.Subscribe]

# snippet-start:[python.example_code.sns.ListSubscriptions]
    def list_subscriptions(self, topic=None):
        """
        Lists subscriptions for the current account, optionally limited to a
        specific topic.

        :param topic: When specified, only subscriptions to this topic are returned.
        :return: An iterator that yields the subscriptions.
        """
        try:
            if topic is None:
                subs_iter = self.sns_resource.subscriptions.all()
            else:
                subs_iter = topic.subscriptions.all()
            logger.info("Got subscriptions.")
        except ClientError:
            logger.exception("Couldn't get subscriptions.")
            raise
        else:
            return subs_iter
# snippet-end:[python.example_code.sns.ListSubscriptions]

    @staticmethod
# snippet-start:[python.example_code.sns.SetSubscriptionAttributes]
    def add_subscription_filter(subscription, attributes):
        """
        Adds a filter policy to a subscription. A filter policy is a key and a
        list of values that are allowed. When a message is published, it must have an
        attribute that passes the filter or it will not be sent to the subscription.

        :param subscription: The subscription the filter policy is attached to.
        :param attributes: A dictionary of key-value pairs that define the filter.
        """
        try:
            att_policy = {key: [value] for key, value in attributes.items()}
            subscription.set_attributes(
                AttributeName='FilterPolicy', AttributeValue=json.dumps(att_policy))
            logger.info("Added filter to subscription %s.", subscription.arn)
        except ClientError:
            logger.exception(
                "Couldn't add filter to subscription %s.", subscription.arn)
            raise
# snippet-end:[python.example_code.sns.SetSubscriptionAttributes]

    @staticmethod
# snippet-start:[python.example_code.sns.Unsubscribe]
    def delete_subscription(subscription):
        """
        Unsubscribes and deletes a subscription.
        """
        try:
            subscription.delete()
            logger.info("Deleted subscription %s.", subscription.arn)
        except ClientError:
            logger.exception("Couldn't delete subscription %s.", subscription.arn)
            raise
# snippet-end:[python.example_code.sns.Unsubscribe]

# snippet-start:[python.example_code.sns.Publish_TextMessage]
    def publish_text_message(self, phone_number, message):
        """
        Publishes a text message directly to a phone number without need for a
        subscription.

        :param phone_number: The phone number that receives the message. This must be
                             in E.164 format. For example, a United States phone
                             number might be +12065550101.
        :param message: The message to send.
        :return: The ID of the message.
        """
        try:
            response = self.sns_resource.meta.client.publish(
                PhoneNumber=phone_number, Message=message)
            message_id = response['MessageId']
            logger.info("Published message to %s.", phone_number)
        except ClientError:
            logger.exception("Couldn't publish message to %s.", phone_number)
            raise
        else:
            return message_id
# snippet-end:[python.example_code.sns.Publish_TextMessage]

    @staticmethod
# snippet-start:[python.example_code.sns.Publish_MessageAttributes]
    def publish_message(topic, message, attributes):
        """
        Publishes a message, with attributes, to a topic. Subscriptions can be filtered
        based on message attributes so that a subscription receives messages only
        when specified attributes are present.

        :param topic: The topic to publish to.
        :param message: The message to publish.
        :param attributes: The key-value attributes to attach to the message. Values
                           must be either `str` or `bytes`.
        :return: The ID of the message.
        """
        try:
            att_dict = {}
            for key, value in attributes.items():
                if isinstance(value, str):
                    att_dict[key] = {'DataType': 'String', 'StringValue': value}
                elif isinstance(value, bytes):
                    att_dict[key] = {'DataType': 'Binary', 'BinaryValue': value}
            response = topic.publish(Message=message, MessageAttributes=att_dict)
            message_id = response['MessageId']
            logger.info(
                "Published message with attributes %s to topic %s.", attributes,
                topic.arn)
        except ClientError:
            logger.exception("Couldn't publish message to topic %s.", topic.arn)
            raise
        else:
            return message_id
# snippet-end:[python.example_code.sns.Publish_MessageAttributes]

    @staticmethod
# snippet-start:[python.example_code.sns.Publish_MessageStructure]
    def publish_multi_message(
            topic, subject, default_message, sms_message, email_message):
        """
        Publishes a multi-format message to a topic. A multi-format message takes
        different forms based on the protocol of the subscriber. For example,
        an SMS subscriber might receive a short, text-only version of the message
        while an email subscriber could receive an HTML version of the message.

        :param topic: The topic to publish to.
        :param subject: The subject of the message.
        :param default_message: The default version of the message. This version is
                                sent to subscribers that have protocols that are not
                                otherwise specified in the structured message.
        :param sms_message: The version of the message sent to SMS subscribers.
        :param email_message: The version of the message sent to email subscribers.
        :return: The ID of the message.
        """
        try:
            message = {
                'default': default_message,
                'sms': sms_message,
                'email': email_message
            }
            response = topic.publish(
                Message=json.dumps(message), Subject=subject, MessageStructure='json')
            message_id = response['MessageId']
            logger.info("Published multi-format message to topic %s.", topic.arn)
        except ClientError:
            logger.exception("Couldn't publish message to topic %s.", topic.arn)
            raise
        else:
            return message_id
# snippet-end:[python.example_code.sns.Publish_MessageStructure]

def get_secret():

    # In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
    # See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    # We rethrow the exception by default.
    secret = 'NONE'
    try:
        describe_secret_response = secretsmanager_client.describe_secret(
            SecretId=global_secret_name
        )
        #print ("describe_secret_response %s" % (describe_secret_response) )
        get_secret_value_response = secretsmanager_client.get_secret_value(
            SecretId=describe_secret_response['ARN']
        )
        #print ("get_secret_value_response %s" % (get_secret_value_response) )
    except ClientError as e:
        if e.response['Error']['Code'] == 'DecryptionFailureException':
            # Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InternalServiceErrorException':
            # An error occurred on the server side.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InvalidParameterException':
            # You provided an invalid value for a parameter.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InvalidRequestException':
            # You provided a parameter value that is not valid for the current state of the resource.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'ResourceNotFoundException':
            # We can't find the resource that you asked for.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        return {
                'statusCode': 500,
                'body': json.dumps('Lambda copy s3 get_secret_value_response failed')
            }
    else:
        # Decrypts secret using the associated KMS CMK.
        # Depending on whether the secret is a string or binary, one of these fields will be populated.
        if 'SecretString' in get_secret_value_response:
            secret = get_secret_value_response['SecretString']
            #print ("secret %s " % (secret) )
        else:
            secret = base64.b64decode(get_secret_value_response['SecretBinary'])
            #print ("decoded_binary_secret %s " % (secret) )
    return secret

def lambda_handler(event, context):
    print('-'*88)
    print("Welcome to the Amazon SNS cross partition invoke demo!")
    print('-'*88)

    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    try:
        credential_value = get_secret()
        credential_json = json.loads(credential_value)
        session = boto3.Session(aws_access_key_id=credential_json['AWS_ACCESS_KEY_ID_GLB'],
                            aws_secret_access_key=credential_json['AWS_SECRET_ACCESS_KEY_GLB'],
                            region_name=global_region_name)
    
        sns_wrapper = SnsWrapper(session.resource('sns'))
    except ClientError as e:
        return_msg = json.dumps('Lambda get the global sns_wrapper failed!')
        return {
            'statusCode': 500,
            'body': return_msg
        }
    topic_name = f'demo-basics-topic-{time.time_ns()}'

    print(f"Creating topic {topic_name}.")
    topic = sns_wrapper.create_topic(topic_name)

    phone_number = input_phone_number
    if phone_number != '':
        print(f"Sending an SMS message directly from SNS to {phone_number}.")
        sns_wrapper.publish_text_message(phone_number, 'Hello from the SNS demo!')
    else:
        print(f"input_phone_number is null.")


    email = input_email_address
    retryCount = 1
    try:
        if email != '':
            print(f"Subscribing {email} to {topic_name}.")
            email_sub = sns_wrapper.subscribe(topic, 'email', email)
            time.sleep(30)
            while (email_sub.attributes['PendingConfirmation'] == 'true' and retryCount <= numRetries):
                print(f"Email address {email} is not confirmed. Follow the instructions in the email to confirm and receive SNS messages. ")
                time.sleep(10)
                email_sub.reload()
                retryCount += 1
        else:
            print(f"input_email_address is null.")

        phone_sub = None
        if phone_number != '':
            print(f"Subscribing {phone_number} to {topic_name}. Phone numbers do not "
                f"require confirmation.")
            phone_sub = sns_wrapper.subscribe(topic, 'sms', phone_number)

        if phone_number != '' or email != '':
            print(f"Publishing a multi-format message to {topic_name}. Multi-format "
                f"messages contain different messages for different kinds of endpoints.")
            sns_wrapper.publish_multi_message(
                topic, 'SNS multi-format demo',
                'This is the default message.',
                'This is the SMS version of the message.',
                'This is the email version of the message.')

        if phone_sub is not None:
            mobile_key = 'mobile'
            friendly = 'friendly'
            print(f"Adding a filter policy to the {phone_number} subscription to send "
                f"only messages with a '{mobile_key}' attribute of '{friendly}'.")
            sns_wrapper.add_subscription_filter(phone_sub, {mobile_key: friendly})
            print(f"Publishing a message with a {mobile_key}: {friendly} attribute.")
            sns_wrapper.publish_message(
                topic, "Hello! This message is mobile friendly.", {mobile_key: friendly})
            not_friendly = 'not-friendly'
            print(f"Publishing a message with a {mobile_key}: {not_friendly} attribute.")
            sns_wrapper.publish_message(
                topic,
                "Hey. This message is not mobile friendly, so you shouldn't get "
                "it on your phone.",
                {mobile_key: not_friendly})

        print(f"Getting subscriptions to {topic_name}.")
        topic_subs = sns_wrapper.list_subscriptions(topic)
        for sub in topic_subs:
            print(f"{sub.arn}")
    except Exception as e:
        print("Something went wrong" + e)
    finally:
        print(f"Deleting subscriptions and {topic_name}.")
        for sub in topic_subs:
            if sub.arn != 'PendingConfirmation':
                sns_wrapper.delete_subscription(sub)
        sns_wrapper.delete_topic(topic)

        print("Thanks for watching!")
        print('-'*88)


if __name__ == '__main__':
    usage_demo()
