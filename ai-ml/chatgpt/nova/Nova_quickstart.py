import io
import json
import boto3
import base64
import random
import time
from PIL import Image
from io import BytesIO

AWS_REGION = "us-east-1"
NOVA_MODEL_ID = "amazon.nova-pro-v1:0"
NOVA_CANVAS_ID = "amazon.nova-canvas-v1:0"
NOVA_REEL_ID = "amazon.nova-reel-v1:0"
CLAUDE_MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0"
SD_MODEL_ID = "stability.sd3-large-v1:0"
# Use the inference profile ID for Claude 3.5 Sonnet
CLAUDE_INFERENCE_PROFILE_ID = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
NOVA_MAX_PROMPT_LENGTH = 1024  # Nova Canvas text limit

sd_style_presets = [
            "3d-model", "analog-film", "anime", "cinematic", "comic-book", 
            "digital-art", "enhance", "fantasy-art", "isometric", "line-art", 
            "low-poly", "modeling-compound", "neon-punk", "origami", 
            "photographic", "pixel-art", "tile-texture"
        ]

session = boto3.Session(profile_name="global_ruiliang")
bedrock_runtime = session.client(
    "bedrock-runtime",
    region_name=AWS_REGION
)

def video_analysis(video_file, input_prompt):
    print("Processing video: " + video_file)

    with open(video_file, "rb") as f:
        video_bytes = f.read()
        video_base64 = base64.b64encode(video_bytes).decode('utf-8')

    # Converse API
    messages = [ { "role": "user", 
                "content": [
                    {"video": {"format": "mp4", "source": {"bytes": video_base64}}},
                    {"text": input_prompt}
                    ]
                } ]

    response = bedrock_runtime.converse(
        modelId=NOVA_MODEL_ID,
        messages=messages,
        inferenceConfig={"temperature": 0.0}
    )

    response_text = response["output"]["message"]["content"][0]["text"]
    print('Nova output: ' + response_text)

    #  This model doesn't support the video content block that you provided. 
    # response = bedrock_runtime.converse(
    #     modelId=CLAUDE_INFERENCE_PROFILE_ID,
    #     messages=messages,
    #     inferenceConfig={"temperature": 0.0}
    # )

    # response_text = response["output"]["message"]["content"][0]["text"]
    # print('claude-3-5-sonnet output: ' + response_text)



def video_creation(video_prompt, s3_output_bucket, sleep_time):
    
    model_input = {
        "taskType": "TEXT_VIDEO",
        "textToVideoParams": {"text": video_prompt},
        "videoGenerationConfig": {
            "durationSeconds": 6,
            "fps": 24,
            "dimension": "1280x720",
            "seed": random.randint(0, 2147483648)
        }
    }

    invocation = bedrock_runtime.start_async_invoke(
        modelId=NOVA_REEL_ID,
        modelInput=model_input,
        outputDataConfig={"s3OutputDataConfig": {"s3Uri": f"s3://{s3_output_bucket}"}}
    )

    invocation_arn = invocation["invocationArn"]
    s3_prefix = invocation_arn.split('/')[-1]
    s3_location = f"s3://{s3_output_bucket}/{s3_prefix}"
    print(f"\nS3 URI: {s3_location}")

    while True:
        response = bedrock_runtime.get_async_invoke(
            invocationArn=invocation_arn
        )
        status = response["status"]
        print(f"Status: {status}")
        if status != "InProgress":
            break
        time.sleep(sleep_time)

    if status == "Completed":
        print(f"\nVideo is ready at {s3_location}/output.mp4")
    else:
        print(f"\nVideo generation status: {status}")



def video_reference_image(input_image_pth, video_prompt, s3_output_bucket, sleep_time):
    with open(input_image_pth, "rb") as f:
        input_image_bytes = f.read()
        input_image_base64 = base64.b64encode(input_image_bytes).decode("utf-8")

    model_input = {
        "taskType": "TEXT_VIDEO",
        "textToVideoParams": {
            "text": video_prompt,
            "images": [{ "format": "png", "source": { "bytes": input_image_base64 } }]
            },
        "videoGenerationConfig": {
            "durationSeconds": 6,
            "fps": 24,
            "dimension": "1280x720",
            "seed": random.randint(0, 2147483648)
        }
    }
    invocation = bedrock_runtime.start_async_invoke(
        modelId=NOVA_REEL_ID,
        modelInput=model_input,
        outputDataConfig={"s3OutputDataConfig": {"s3Uri": f"s3://{s3_output_bucket}"}}
    )

    invocation_arn = invocation["invocationArn"]
    s3_prefix = invocation_arn.split('/')[-1]
    s3_location = f"s3://{s3_output_bucket}/{s3_prefix}"

    print(f"\nS3 URI: {s3_location}")

    while True:
        response = bedrock_runtime.get_async_invoke(
            invocationArn=invocation_arn
        )
        status = response["status"]
        print(f"Status: {status}")
        if status != "InProgress":
            break
        time.sleep(sleep_time)
    if status == "Completed":
        print(f"\nVideo is ready at {s3_location}/output.mp4")
    else:
        print(f"\nVideo generation status: {status}")

def invoke_stable_diffusion(image_file, prompt, negative_prompt="", output_filename="generated_image"):
    # 构建请求体
    if image_file is not None:
        with open(image_file, "rb") as f:
            image_bytes = f.read()
            base64_image = base64.b64encode(image_bytes).decode("utf-8")
        request_body = {
            "prompt": prompt,
            "image": base64_image,
            "negative_prompt": negative_prompt,
            'strength': 0.75,
            "seed": random.randint(0, 2147483648),
            'mode': 'image-to-image'
        }
    else:
        request_body = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "seed": random.randint(0, 2147483648)
        }
    
    # 调用模型
    try:
        bedrock_runtime = session.client(
            "bedrock-runtime",
            region_name='us-west-2'
        )
        response = bedrock_runtime.invoke_model(
            modelId=SD_MODEL_ID,
            body=json.dumps(request_body)
        )
        
        # 解析响应
        response_body = json.loads(response['body'].read().decode("utf-8"))
        
        # 获取生成的图像
        # Convert base64 images to PIL Images
        images = []
        for base64_image in response_body.get("images", []):
            image_bytes = base64.b64decode(base64_image)
            img = Image.open(io.BytesIO(image_bytes))
            images.append(img)

        print(f"stable_diffusion Successfully generated {len(images)} image(s)")
        for i, img in enumerate(images):
            filename = f"{output_filename}_{i+1}.png"
            img.save(filename)
            print(f"Saved image to {filename}")
            
    except Exception as e:
        print(f"invoke_stable_diffusion Error: {str(e)}")
        return None

def invoke_nova_canvas(image_file, prompt, height, width, num_images, cfg_scale, base_filename):
    if image_file is not None:
        with open(image_file, "rb") as f:
            image_bytes = f.read()
            base64_image = base64.b64encode(image_bytes).decode("utf-8")
        body = json.dumps({
                    "taskType": "TEXT_IMAGE",
                    "textToImageParams": {
                        "conditionImage": base64_image,
                        "text": prompt
                    },
                    "imageGenerationConfig": {
                        "numberOfImages": num_images,
                        "height": height,
                        "width": width,
                        "cfgScale": cfg_scale,
                        "seed": random.randint(0, 2147483648)
                    }
                })
    else:
        body = json.dumps({
                    "taskType": "TEXT_IMAGE",
                    "textToImageParams": {
                        "text": prompt
                    },
                    "imageGenerationConfig": {
                        "numberOfImages": num_images,
                        "height": height,
                        "width": width,
                        "cfgScale": cfg_scale,
                        "seed": random.randint(0, 2147483648)
                    }
                })
    try:
        response = bedrock_runtime.invoke_model(
                        body=body,
                        modelId=NOVA_CANVAS_ID,
                        accept="application/json",
                        contentType="application/json"
                    )
                    
        response_body = json.loads(response.get("body").read())
                
                    # Check for errors
        if "error" in response_body and response_body["error"]:
            raise Exception(f"Image generation error: {response_body['error']}")
                    # Convert base64 images to PIL Images
        images = []
        for base64_image in response_body.get("images", []):
            image_bytes = base64.b64decode(base64_image)
            img = Image.open(io.BytesIO(image_bytes))
            images.append(img)

        print(f"nova_canvas Successfully generated {len(images)} image(s)")
        for i, img in enumerate(images):
            filename = f"{base_filename}_{i+1}.png"
            img.save(filename)
            print(f"Saved image to {filename}")
    except Exception as e:
        print(f"invoke_nova_canvas Error: {str(e)}")
        return None

def generate_image(image_file, prompt, height=1024, width=1024, num_images=1, cfg_scale=8.0, base_filename="generated_image"):
        """
        Generate images using Nova Canvas model.
        
        Args:
            prompt (str): Text description of the image to generate
            height (int): Image height (default: 1024)
            width (int): Image width (default: 1024)
            num_images (int): Number of images to generate (default: 1)
            cfg_scale (float): Configuration scale (default: 8.0)
            seed (int): Random seed for reproducibility (default: 0)
            
        Returns:
            list: List of PIL Image objects
        """
        try:
            # Ensure prompt is within length limit
            if len(prompt) <= NOVA_MAX_PROMPT_LENGTH:
                invoke_nova_canvas(image_file, prompt, height, width, num_images, cfg_scale, base_filename)
            else:
                invoke_stable_diffusion(image_file, prompt, negative_prompt="", output_filename=base_filename)

        except Exception as e:
            print(f"Error generating images: {str(e)}")
            raise

def get_image_description(image_file: str, prompt: str) -> str:
    """Get concise image description from Claude"""
    try:
        if image_file is not None:
            # Read and process image
            with Image.open(image_file) as img:
                # Convert to PNG if needed
                if img.format != 'PNG':
                    buffer = BytesIO()
                    img.save(buffer, format='PNG')
                    image_bytes = buffer.getvalue()
                else:
                    with open(image_file, "rb") as f:
                        image_bytes = f.read()
        # Converse API
        analysis_prompt = f"""
        {prompt}
        Provide a clear, detailed description that captures the essential elements needed to generate a similar image.
        Focus on the most important visual aspects and be concise.
        """
        messages = [{
            "role": "user",
            "content": [
                {
                    "image": {
                        "format": "png",
                        "source": {
                            "bytes": image_bytes
                        }
                    }
                },
                {
                    "text": analysis_prompt
                }
            ]
        }]
        response = bedrock_runtime.converse(
            modelId=CLAUDE_INFERENCE_PROFILE_ID,
            messages=messages,
            inferenceConfig={"temperature": 0.1}
        )
        description = response["output"]["message"]["content"][0]["text"]
        return description
    except Exception as e:
        print(f"Error get_image_description: {str(e)}")
        raise

def processs_prompt(image_file, input_prompt, mode='analysis', num_variations=1, output_filename="generated_image"):
   
    if mode == 'analysis':
        if image_file is not None:
            #open the image_file and convert it to base64
            with open(image_file, "rb") as f:
                image_bytes = f.read()
            messages = [{
                "role": "user",
                "content": [
                    {
                        "image": {
                            "format": "png",
                            "source": {
                                "bytes": image_bytes
                            }
                        }
                    },
                    {
                        "text": input_prompt
                    }
                ]
            }]
        else:
            # Converse API
            messages = [ { "role": "user", 
                        "content": [
                            {"text": input_prompt}
                            ]
                        } ]
        # Make API call
        response = bedrock_runtime.converse(
            modelId=CLAUDE_INFERENCE_PROFILE_ID,
            messages=messages,
            inferenceConfig={"temperature": 0.3}
        )
        response_text = response["output"]["message"]["content"][0]["text"]
        if len(response_text) < 256:
            print('LLM output: ' + response_text)
        else:
            #save the response_text in a file named output.txt
            print('LLM output in output.txt')
            with open("output.txt", "w") as f:
                f.write(response_text)
    elif mode == 'text2image':
        generate_image(None, prompt=input_prompt, num_images=num_variations, base_filename=output_filename)
    elif mode == 'image2image' and image_file is not None:
        # Read and process image
        description = get_image_description(image_file, input_prompt)
        with open("image_description.txt", "w") as f:
            f.write(description)
        print('LLM get_image_description complete')
        generate_image(image_file, prompt=input_prompt, num_images=num_variations, base_filename=output_filename)
    else:
        print('NOT Supported output type!')

    
def main():
    
    VIDEO_FILE = "AWSNEWS-1259-nova-pro-input-video.qt"
    user_message = "Describe this video."
    #video_analysis(VIDEO_FILE, user_message)

    SLEEP_TIME = 30
    S3_DESTINATION_BUCKET = "auto-ai-ml-demo"
    VIDEO_PROMPT = "Closeup of a large seashell in the sand. Gentle waves flow all around the shell. Sunset light. Camera zoom in very close."
    #video_creation (VIDEO_PROMPT, S3_DESTINATION_BUCKET, SLEEP_TIME)

    input_image_path = "nova-reel-seascape.png"
    video_prompt = "drone view flying over a coastal landscape" 
    #video_reference_image(input_image_path, video_prompt, S3_DESTINATION_BUCKET, SLEEP_TIME)

    #open_artifacts_for_bedrock
    input_prompt ="make a threejs app of a space sim with gravity of a solar system with planets in a single web file. " +\
            "the planets should be orbiting around the sun. Add a light source to the sun and realistic random materials to each planet. " +\
            "Add orbit traces to all bodies. use cannonjs. Using top view, making it cool and fanc." +\
            "Keeping the planets in orbit around the sun"
    #processs_prompt(None, input_prompt)

    input_prompt = "using Tailwind CSS and React JS to create a cool and impressive sales dashboard page in a single web file." +\
        "The dashboard should display rankings for different platforms (JD.com, Taobao, VIP.com) including product category rankings, store rankings, GMV (Gross Merchandise Value), number of orders, and other relevant metrics."
    #processs_prompt(None, input_prompt)

    prompt = "A beautiful sunset over a mountain lake, photorealistic, high detail, height 1024 pixel and width 1024 pixel"
    negative_prompt = "blurry, low quality, distorted, deformed"
    #invoke_stable_diffusion(None, prompt, negative_prompt, output_filename="sd_generated_image")

    # Need the english prompt
    input_prompt = "A Christmas tree made of colorful clouds in the sky, hanging with Christmas decorations, floating in the air"
    #invoke_stable_diffusion(None, input_prompt, negative_prompt, output_filename="sd_generated_image")
    # Nova Canvas can support Chinese prompt
    input_prompt = "天空中彩色的云朵组成的圣诞树，挂着圣诞装饰，漂浮在空中"
    #generate_image(None, prompt=input_prompt, num_images=1, base_filename="canvas_generated_image")
    #processs_prompt(None, input_prompt, mode='text2image', num_variations=1, output_filename="canvas_generated_image2")
    
    refer_image = 'reference_bi_style.png'
    input_prompt =  """
    Analyze this dashboard and create a modern version with:
    - Cleaner layout
    - Better data visualization
    - Improved color scheme
    - More intuitive navigation
    Generate 3 different variations.
    """
    #processs_prompt(refer_image, input_prompt, mode='image2image', num_variations=3, output_filename="dashboard_redesigns")

    refer_image = 'k8s_diagram.png'
    input_prompt =  """explain the architecture in the image, and convert all the services to aws services accordingly and draw diagram with AWS services architecture icon"""
    #processs_prompt(refer_image, input_prompt, mode='image2image', num_variations=1, output_filename="k8s_diagram_aws")

if __name__ == "__main__":
    main()