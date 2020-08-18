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
import com.amazon.sqs.javamessaging.SQSConnectionFactory; 
import com.amazon.sqs.javamessaging.ProviderConfiguration;
import com.amazonaws.services.sqs.AmazonSQSClientBuilder;
import com.amazon.sqs.javamessaging.SQSConnection;
import javax.jms.Session;
import javax.jms.MessageProducer;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import javax.jms.TextMessage;
import java.io.EOFException;
import java.io.IOException;
import javax.jms.JMSException;


public class TextMessageSender {
    public static void main(String args[]) throws JMSException {
        ExampleConfiguration config = ExampleConfiguration.parseConfig("TextMessageSender", args);
        
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
        Session session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
        MessageProducer producer = session.createProducer( session.createQueue( config.getQueueName() ) );
        
        sendMessages(session, producer);
 
        // Close the connection. This closes the session automatically
        connection.close();
        System.out.println( "Connection closed" );
    }
 
    private static void sendMessages( Session session, MessageProducer producer ) {
        BufferedReader inputReader = new BufferedReader(
            new InputStreamReader( System.in, Charset.defaultCharset() ) );
        
        try {
            String input;
            while( true ) { 
                System.out.print( "Enter message to send (leave empty to exit): " );
                input = inputReader.readLine();
                if( input == null || input.equals("" ) ) break;
                
                TextMessage message = session.createTextMessage(input);
                producer.send(message);
                System.out.println( "Send message " + message.getJMSMessageID() );
            }
        } catch (EOFException e) {
            // Just return on EOF
        } catch (IOException e) {
            System.err.println( "Failed reading input: " + e.getMessage() );
        } catch (JMSException e) {
            System.err.println( "Failed sending message: " + e.getMessage() );
            e.printStackTrace();
        }
    }
}