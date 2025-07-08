import requests
import os

def send_bedrock_message(api_key, message_text):
    url = "https://bedrock-runtime.us-east-1.amazonaws.com/model/us.anthropic.claude-3-5-haiku-20241022-v1:0/converse"

    payload = {
        "messages": [
            {
                "role": "user",
                "content": [{"text": message_text}]
            }
        ]
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    response = requests.post(url, json=payload, headers=headers)
    return response.text

if __name__ == "__main__":
    api_key = os.environ.get("BEDROCK_API_KEY")
    message_text = "Hello, Bedrock!"
    response = send_bedrock_message(api_key, message_text)
    print(response)

