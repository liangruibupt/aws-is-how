import requests
import json
import os

def send_minimax_image(api_key, message_text):
    
    url = "https://api.minimax.io/v1/image_generation"


    payload = json.dumps({
        "model": "image-01", 
        "prompt": message_text,
        "aspect_ratio": "16:9",
        "response_format": "url",
        "n": 3,
        "prompt_optimizer": True
    })
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    if response.status_code != 200:
        raise Exception(f"Error: {response.status_code} - {response.text}")
    # Check if the response contains the expected data structure
    if not response.json().get('data', {}):
        raise Exception("Unexpected response format from MiniMax API")
    else:
        # Extract image URLs from the response
        print(response.json().get('data', {}).get('metadata', {}))
        
    return (response.json().get('data', {}).get('image_urls', []))

if __name__ == "__main__":
    api_key = os.environ.get("MINIMAX_API_KEY")
    message_text = "Educational diagram showing El Niño formation mechanism in the Pacific Ocean, with labeled arrows showing wind patterns, ocean currents, and temperature changes. Show normal conditions on top and El Niño conditions on bottom. Include thermocline changes, warm water pool movement, and atmospheric circulation. Scientific style with clear labels in English language. Make sure the text is clear and readable"
    image_urls = send_minimax_image(api_key, message_text)
    # iterate through the image URLs and print them
    for url in image_urls:
        print(url)