#!/usr/bin/env python3
"""
Bedrock Cross-Region Inference with Claude Sonnet 4
Uses AccessKeyId, SecretAccessKey, SessionToken for authentication

Setup Instructions:
1. Create virtual environment: python3 -m venv venv
2. Activate: source venv/bin/activate  
3. Install dependencies: pip install boto3>=1.34.0
4. Set environment variables or modify credentials in code
5. Run: python bedrock_cross_region_inference.py

Environment Variables:
- AWS_ACCESS_KEY_ID: Your AWS access key
- AWS_SECRET_ACCESS_KEY: Your AWS secret key  
- AWS_SESSION_TOKEN: Your AWS session token (for temporary credentials)

Cross-Region Inference:
- Uses global inference profile for automatic region routing
- Provides better availability and performance optimization
- Profile ID: global.anthropic.claude-sonnet-4-20250514-v1:0
"""

import boto3
import json
import os

def call_bedrock_cross_region():
    # Configure credentials - set these as environment variables or replace with actual values
    access_key = os.getenv('AWS_ACCESS_KEY_ID', 'your-access-key-id')
    secret_key = os.getenv('AWS_SECRET_ACCESS_KEY', 'your-secret-access-key')
    session_token = os.getenv('AWS_SESSION_TOKEN', 'your-session-token')
    
    print(f"Access Key: {access_key[:10]}..." if access_key != 'your-access-key-id' else "Access Key: not set")
    print(f"Secret Key: {secret_key[:10]}..." if secret_key != 'your-secret-access-key' else "Secret Key: not set")
    print(f"Session Token: {session_token[:20]}..." if session_token != 'your-session-token' else "Session Token: not set")
    
    # First verify credentials with STS
    try:
        sts_client = boto3.client(
            'sts',
            region_name='us-west-2',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            aws_session_token=session_token
        )
        identity = sts_client.get_caller_identity()
        print(f"Verified identity: {identity}")
    except Exception as e:
        print(f"STS verification failed: {e}")
        return
    
    # Create Bedrock client with explicit credentials
    # us-west-2 to match the STS token region
    bedrock_client = boto3.client(
        'bedrock-runtime',
        region_name='us-west-2',
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        aws_session_token=session_token
    )
    
    # Global inference profile ID for Claude Sonnet 4 with cross-region capability
    inference_profile_id = "global.anthropic.claude-sonnet-4-20250514-v1:0"
    
    # Request payload following Anthropic's message format
    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1000,
        "messages": [
            {
                "role": "user",
                "content": "Hello, can you tell me about AWS Bedrock cross-region inference?"
            }
        ]
    }
    
    try:
        # Invoke model using cross-region inference profile
        response = bedrock_client.invoke_model(
            modelId=inference_profile_id,
            body=json.dumps(payload),
            contentType='application/json'
        )
        
        # Parse and display response
        response_body = json.loads(response['body'].read())
        print("Response:", response_body['content'][0]['text'])
        
    except Exception as e:
        print(f"Error calling Bedrock: {e}")

if __name__ == "__main__":
    call_bedrock_cross_region()
