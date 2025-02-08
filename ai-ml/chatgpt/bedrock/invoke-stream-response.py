import boto3
import json
from botocore.exceptions import ClientError
from botocore.config import Config

REGION_NAME = 'us-west-2'
#MODEL_ID = "meta.llama3-70b-instruct-v1:0"
MODEL_ID= 'arn:aws:bedrock:us-west-2:710299592439:imported-model/w0cuytvlokan'
#MODEL_ID='anthropic.claude-3-5-sonnet-20241022-v2:0'

MAX_TOKEN = 4096
TEMPERATURE = 0.7

client_config = Config(
    retries={
        'total_max_attempts': 10, #customizable
        'mode': 'standard'
    }
)

# llama3 based example, can also be used for deepseek-r1-distill-llama 
class BedrockInvokeStreamingChat:
    def __init__(self, model_id, region_name=REGION_NAME, system_prompt=None):
        """
        Initialize Bedrock streaming chat
        
        Args:
            model_id (str): The model ID (e.g., 'meta.llama3-70b-instruct-v1:0')
            region_name (str): AWS region name
        """
        self.model_id = model_id
        session = boto3.Session(profile_name="global_ruiliang")
        self.bedrock_runtime_client = session.client(
            service_name='bedrock-runtime',
            region_name=region_name,
            config = client_config
        )
        self.conversation_history = []
        self.system_prompt = system_prompt

    def stream_response(self, prompt, **kwargs):
        """
        Stream response from the model
        
        Args:
            prompt (str): Input text prompt
            max_tokens (int): Maximum tokens to generate
            temperature (float): Controls randomness
        """
        # Prepare messages including history
        formatted_prompt = f"""
        <|begin_of_text|>
        """

        # Add system message if provided
        if self.system_prompt:
            formatted_prompt += f"""
            <|start_header_id|>system<|end_header_id|>
            {self.system_prompt}
            <|eot_id|>
            """
        # Add conversation history
        for msg in self.conversation_history:
            if msg['role'] == 'user':
                formatted_prompt += f"""
                <|start_header_id|>user<|end_header_id|>
                {msg['content']}
                <|eot_id|>
                """
            elif msg['role'] == 'assistant':
                formatted_prompt += f"""
                <|start_header_id|>assistant<|end_header_id|>
                {msg['content']}
                <|eot_id|>
                """

        # Add current message
        formatted_prompt += f"""
        <|start_header_id|>user<|end_header_id|>
        {prompt}
        <|eot_id|>
        <|start_header_id|>assistant<|end_header_id|>
        """

        request_body = {
                "prompt": formatted_prompt,
                "max_gen_len": kwargs.get('max_tokens', 512),
                "temperature": kwargs.get('temperature', 0.7),
                "top_p": kwargs.get('top_p', 0.9),
            }

        try:
            response = self.bedrock_runtime_client.invoke_model_with_response_stream(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=json.dumps(request_body)
            )

            full_response = ""
            for event in response["body"]:
                chunk = json.loads(event["chunk"]["bytes"])
                if "generation" in chunk:
                    text_chunk = chunk["generation"]
                    full_response += text_chunk
                    print(text_chunk, end="")

            # Store in conversation history
            self.conversation_history.append({
                "role": "user",
                "content": prompt
            })
            self.conversation_history.append({
                "role": "assistant",
                "content": full_response
            })

        except Exception as e:
            print(f"Error in streaming: {e}")
            exit(1)

        
def create_invoke_streaming_chat(model_id):
    """
    Create an interactive streaming chat interface
    """
    # Initialize with your model
    system_prompt = "You are a helpful AI assistant."
    chat = BedrockInvokeStreamingChat(model_id, system_prompt=system_prompt)
    
    print("Streaming Chat initialized. Type 'quit' to exit.")
    
    while True:
        user_input = input("\nYou: ").strip()
        
        if user_input.lower() == 'quit':
            break
        elif user_input.lower() == 'clear':
            chat.conversation_history = []
            print("Conversation history cleared.")
            continue
            
        print("\nAssistant: ", end='', flush=True)
        
        # Stream the response
        chat.stream_response(prompt=user_input, max_tokens=MAX_TOKEN, temperature=TEMPERATURE)
        print()


# Advanced implementation with more features
class Converse_StreamingChat:
    def __init__(self, model_id, region_name=REGION_NAME, system_prompt=None):
        self.model_id = model_id
        session = boto3.Session(profile_name="global_ruiliang")
        self.bedrock_runtime_client = session.client(
            service_name='bedrock-runtime',
            region_name=region_name,
            config = client_config
        )
        self.conversation_history = []
        self.system_prompt = system_prompt

    def stream_response(self, prompt, **kwargs):
        """
        converse version of streaming response
        """

        # Prepare messages including history
        messages = []
        system_messages = []

        # Add system message if provided
        if self.system_prompt:
            system_messages.append({
                "text": self.system_prompt
            })
        # Add conversation history
        for msg in self.conversation_history:
            messages.append({
                "role": msg["role"],
                "content": [{"text": msg["content"]}]
            })
        
        # Add current message
        #formatted_prompt = self.format_conversation(prompt)
        messages.append({
            "role": "user",
            "content": [{"text": prompt}]
        })

        inferenceConfig = {
            "maxTokens": kwargs.get('max_tokens', 4096),
            "temperature": kwargs.get('temperature', 0.7),
            "topP": kwargs.get('top_p', 0.9),
        
        }

        try:
            response = self.bedrock_runtime_client.converse_stream(
                modelId=self.model_id,
                messages=messages,
                system=system_messages,
                inferenceConfig=inferenceConfig
            )

            full_response = ""
            for chunk in response["stream"]:
                if "contentBlockDelta" in chunk:
                    text_chunk = chunk["contentBlockDelta"]["delta"]["text"]
                    full_response += text_chunk
                    print(text_chunk, end="")
                    
            # Store in conversation history
            self.conversation_history.append({
                "role": "user",
                "content": prompt
            })
            self.conversation_history.append({
                "role": "assistant",
                "content": full_response
            })

        except Exception as e:
            print(f"Error in streaming: {e}")
            exit(1)

def run_converse_stream_chat(model_id):
    """
    Create an interactive streaming chat interface
    """
    system_prompt = "You are a helpful AI assistant."
    chat = Converse_StreamingChat(model_id, system_prompt=system_prompt)

    print("Streaming Chat initialized. Type 'quit' to exit.")   
    while True:
        user_input = input("\nYou: ").strip()
        
        if user_input.lower() == 'quit':
            break
        elif user_input.lower() == 'clear':
            chat.conversation_history = []
            print("Conversation history cleared.")
            continue
            
        print("\nAssistant: ", end='', flush=True)
        
        chat.stream_response(
            prompt=user_input,
            max_tokens=MAX_TOKEN,
            temperature=TEMPERATURE
        )
        print()

if __name__ == "__main__":
    # Choose which version to run
    # LLama based mode invoke_model_with_response_stream version
    create_invoke_streaming_chat(MODEL_ID)
    ## Claude 3.5 Converse_stream version
    #run_converse_stream_chat(MODEL_ID) 
