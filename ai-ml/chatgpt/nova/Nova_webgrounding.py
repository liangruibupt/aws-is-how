import boto3
import json

# Initialize Bedrock Runtime client
bedrock_runtime = boto3.client(
    service_name='bedrock-runtime',
    region_name='us-east-1'
)

def invoke_nova_with_web_grounding(prompt, search_query=None):
    """
    Invoke Amazon Nova with web grounding capability
    
    Args:
        prompt: The user's question or prompt
        search_query: Optional - will be included in the prompt for context
    """
    
    # If search query provided, include it in the prompt
    final_prompt = prompt
    if search_query:
        final_prompt = f"{prompt}\n\nPlease focus your search on: {search_query}"
    
    request_body = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "text": final_prompt
                    }
                ]
            }
        ],
        "inferenceConfig": {
            "maxTokens": 16324,
            "temperature": 0.7,
            "topP": 0.9
        },
        # Enable web grounding with nova_grounding system tool
        "toolConfig": {
            "tools": [
                {"systemTool": {"name": "nova_grounding"}}
            ]
        }
    }
    
    try:
        # Invoke the model
        response = bedrock_runtime.converse(
            modelId="us.amazon.nova-premier-v1:0",
            **request_body
        )
        
        # Extract the response
        output_message = response['output']['message']
        
        # Print the response
        print("\n" + "="*80)
        print("NOVA RESPONSE:")
        print("="*80)
        
        for content in output_message['content']:
            if 'text' in content:
                print(content['text'])
        
        # Check if web search was used
        if 'stopReason' in response and response['stopReason'] == 'tool_use':
            print("\n" + "="*80)
            print("WEB SEARCH RESULTS USED")
            print("="*80)
        
        # Print usage metrics
        if 'usage' in response:
            print("\n" + "="*80)
            print("USAGE METRICS:")
            print("="*80)
            print(f"Input tokens: {response['usage'].get('inputTokens', 0)}")
            print(f"Output tokens: {response['usage'].get('outputTokens', 0)}")
            print(f"Total tokens: {response['usage'].get('totalTokens', 0)}")
        
        return response
        
    except Exception as e:
        print(f"Error invoking Nova: {str(e)}")
        raise


def example_current_events():
    """Example: Ask about current events"""
    print("\n" + "="*80)
    print("EXAMPLE 1: Current Events Query")
    print("="*80)
    
    prompt = "What is the latest news about renewable energy sources?"
    invoke_nova_with_web_grounding(prompt)


def example_specific_search():
    """Example: Use specific search query"""
    print("\n" + "="*80)
    print("EXAMPLE 2: Specific Search Query")
    print("="*80)
    
    prompt = "AWS 最近的一次重要的 Agentic AI的新发布是什么？"
    search_query = "AWS Agenic AI 2025 announcements"
    invoke_nova_with_web_grounding(prompt, search_query)


def example_fact_checking():
    """Example: Fact checking with web grounding"""
    print("\n" + "="*80)
    print("EXAMPLE 3: Fact Checking")
    print("="*80)
    
    prompt = "What is the current price of AWS P5.48xlarge instances and when were they announced?"
    invoke_nova_with_web_grounding(prompt)


def example_comparison():
    """Example: Compare information from web"""
    print("\n" + "="*80)
    print("EXAMPLE 4: Comparison Query")
    print("="*80)
    
    prompt = "Compare the features and pricing of Amazon Nova Pro vs Claude 4.5 Sonnet"
    invoke_nova_with_web_grounding(prompt)


def example_streaming_response():
    """Example: Streaming response with web grounding"""
    print("\n" + "="*80)
    print("EXAMPLE 5: Streaming Response")
    print("="*80)
    
    request_body = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "text": "What are the top 5 AWS services announced in 2025?"
                    }
                ]
            }
        ],
        "inferenceConfig": {
            "maxTokens": 2048,
            "temperature": 0.7
        },
        "toolConfig": {
            "tools": [
                {"systemTool": {"name": "nova_grounding"}}
            ]
        }
    }
    
    try:
        response = bedrock_runtime.converse_stream(
            modelId="us.amazon.nova-premier-v1:0",
            **request_body
        )
        
        print("\nStreaming response:")
        print("-" * 80)
        
        for event in response['stream']:
            if 'contentBlockDelta' in event:
                delta = event['contentBlockDelta']['delta']
                if 'text' in delta:
                    print(delta['text'], end='', flush=True)
            elif 'messageStop' in event:
                print("\n" + "-" * 80)
                print(f"Stop reason: {event['messageStop']['stopReason']}")
        
    except Exception as e:
        print(f"Error in streaming: {str(e)}")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("AMAZON NOVA WEB GROUNDING EXAMPLES")
    print("="*80)
    
    # Run examples
    example_current_events()
    
    # Uncomment to run other examples
    example_specific_search()
    example_fact_checking()
    example_comparison()
    example_streaming_response()
    
    print("\n" + "="*80)
    print("EXAMPLES COMPLETED")
    print("="*80)
