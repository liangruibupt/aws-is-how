/*
 * Copyright 2010-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  https://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 *
 */
 
package aws.example.sqs;
import com.amazonaws.regions.Regions;
import com.amazon.sqs.javamessaging.SQSConnectionFactory; 
import com.amazon.sqs.javamessaging.ProviderConfiguration;
import com.amazonaws.services.sqs.AmazonSQSClientBuilder;
import com.amazon.sqs.javamessaging.SQSConnection;
import javax.jms.Session;
import javax.jms.MessageProducer;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import javax.jms.Message;
import javax.jms.TextMessage;
import java.io.EOFException;
import java.io.IOException;
import javax.jms.JMSException;
import javax.jms.MessageConsumer;
import java.util.concurrent.TimeUnit;

public class SyncMessageReceiver {
public static void main(String args[]) throws JMSException {
    ExampleConfiguration config = ExampleConfiguration.parseConfig("SyncMessageReceiver", args);
    
    ExampleCommon.setupLogging();
    
    // Create the connection factory based on the config
    SQSConnectionFactory connectionFactory = new SQSConnectionFactory(
            new ProviderConfiguration(),
            AmazonSQSClientBuilder.standard()
                    .withRegion(config.getRegion().getName())
                    .withCredentials(config.getCredentialsProvider())
            );
    
    // Create the connection
    SQSConnection connection = connectionFactory.createConnection();
    
    // Create the queue if needed
    ExampleCommon.ensureQueueExists(connection, config.getQueueName());
        
    // Create the session
    Session session = connection.createSession(false, Session.CLIENT_ACKNOWLEDGE);
    MessageConsumer consumer = session.createConsumer( session.createQueue( config.getQueueName() ) );

    connection.start();
    
    receiveMessages(session, consumer);

    // Close the connection. This closes the session automatically
    connection.close();
    System.out.println( "Connection closed" );
}

private static void receiveMessages( Session session, MessageConsumer consumer ) {
    try {
        while( true ) {
            System.out.println( "Waiting for messages");
            // Wait 1 minute for a message
            Message message = consumer.receive(TimeUnit.MINUTES.toMillis(1));
            if( message == null ) {
                System.out.println( "Shutting down after 1 minute of silence" );
                break;
            }
            ExampleCommon.handleMessage(message);
            message.acknowledge();
            System.out.println( "Acknowledged message " + message.getJMSMessageID() );
        }
    } catch (JMSException e) {
        System.err.println( "Error receiving from SQS: " + e.getMessage() );
        e.printStackTrace();
    }
}
}