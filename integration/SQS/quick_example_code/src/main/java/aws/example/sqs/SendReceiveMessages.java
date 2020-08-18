/*
 * Copyright 2011-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *    http://aws.amazon.com/apache2.0
 *
 * This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
 * OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and
 * limitations under the License.
 */
package aws.example.sqs;
import com.amazonaws.services.sqs.AmazonSQS;
import com.amazonaws.services.sqs.AmazonSQSClientBuilder;
import com.amazonaws.services.sqs.model.AmazonSQSException;
import com.amazonaws.services.sqs.model.CreateQueueResult;
import com.amazonaws.services.sqs.model.Message;
import com.amazonaws.services.sqs.model.SendMessageBatchRequest;
import com.amazonaws.services.sqs.model.SendMessageBatchRequestEntry;
import com.amazonaws.services.sqs.model.SendMessageRequest;
import com.amazonaws.auth.profile.ProfileCredentialsProvider;
import com.amazonaws.AmazonClientException;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.sqs.model.ReceiveMessageRequest;
import java.util.Date;
import java.util.List;
import java.util.Collections;

public class SendReceiveMessages
{
    private static final String QUEUE_NAME = "MyQueue";

    public static void main(String[] args)
    {
        
        //final AmazonSQS sqs = AmazonSQSClientBuilder.defaultClient();
        ProfileCredentialsProvider credentialsProvider = new ProfileCredentialsProvider("china");
        try {
            credentialsProvider.getCredentials();
        } catch (Exception e) {
            throw new AmazonClientException("Cannot load the credentials from the credential profiles file. "
                    + "Please make sure that your credentials file is at the correct "
                    + "location (~/.aws/credentials), and is in valid format.", e);
        }

        AmazonSQS sqs = AmazonSQSClientBuilder.standard().withCredentials(credentialsProvider)
                .withRegion(Regions.CN_NORTH_1).build();
                
        try {
            CreateQueueResult create_result = sqs.createQueue(QUEUE_NAME);
        } catch (AmazonSQSException e) {
            if (!e.getErrorCode().equals("QueueAlreadyExists")) {
                throw e;
            }
        }

        String queueUrl = sqs.getQueueUrl(QUEUE_NAME).getQueueUrl();
        System.out.println(" queueUrl " + queueUrl);

        SendMessageRequest send_msg_request = new SendMessageRequest()
                .withQueueUrl(queueUrl)
                .withMessageBody("hello world " + new Date().getTime())
                .withDelaySeconds(5);
        sqs.sendMessage(send_msg_request);


        // Send multiple messages to the queue
        SendMessageBatchRequest send_batch_request = new SendMessageBatchRequest()
                .withQueueUrl(queueUrl)
                .withEntries(
                        new SendMessageBatchRequestEntry(
                                "msg_1", "Hello from message " + new Date().getTime()),
                        new SendMessageBatchRequestEntry(
                                "msg_2", "Hello from message " + new Date().getTime())
                                .withDelaySeconds(10));
        sqs.sendMessageBatch(send_batch_request);

        // receive messages from the queue
        try {
            java.lang.Thread.sleep(12*1000);
        } catch (InterruptedException e) {
            System.out.println(e.getMessage());
        }
        
        boolean flag = true;
        
        while(flag){
            ReceiveMessageRequest receiveMessageRequest = new ReceiveMessageRequest(queueUrl);
            receiveMessageRequest.setMaxNumberOfMessages(10);
            receiveMessageRequest.setAttributeNames(Collections.singleton("All"));
            List<Message> messages = sqs.receiveMessage(receiveMessageRequest).getMessages();

            // delete messages from the queue
            for (Message m : messages) {
                System.out.println(" received message " + m.getBody());
                sqs.deleteMessage(queueUrl, m.getReceiptHandle());
            }
            
            if(messages.size()==0)
            {
                flag = false;
            }
        }
        
    }
}