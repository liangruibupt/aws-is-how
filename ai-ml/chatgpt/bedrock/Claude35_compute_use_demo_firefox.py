import base64
import json
import boto3

MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0"

IMAGE_NAME = "ubuntu-screenshot.png"

session = boto3.Session(profile_name="global_ruiliang")
bedrock_runtime = session.client(
    "bedrock-runtime",
    region_name="us-west-2"
)

with open(IMAGE_NAME, "rb") as f:
    image = f.read()

image_base64 = base64.b64encode(image).decode("utf-8")

prompt = "Find me a hotel in Rome."

body = {
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 512,
    "temperature": 0.5,
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_base64,
                    },
                },
            ],
        }
    ],
    "tools": [
        { # new
            "type": "computer_20241022", # literal / constant
            "name": "computer", # literal / constant
            "display_height_px": 1280, # min=1, no max
            "display_width_px": 800, # min=1, no max
            "display_number": 0 # min=0, max=N, default=None
        },
        { # new
            "type": "bash_20241022", # literal / constant
            "name": "bash", # literal / constant
        },
        { # new
            "type": "text_editor_20241022", # literal / constant
            "name": "str_replace_editor", # literal / constant
        }
    ],
    "anthropic_beta": ["computer-use-2024-10-22"],
}

# Convert the native request to JSON.
request = json.dumps(body)

try:
    # Invoke the model with the request.
    response = bedrock_runtime.invoke_model(modelId=MODEL_ID, body=request)

except Exception as e:
    print(f"ERROR: {e}")
    exit(1)

# Decode the response body.
model_response = json.loads(response["body"].read())
print(json.dumps(model_response, indent=2))