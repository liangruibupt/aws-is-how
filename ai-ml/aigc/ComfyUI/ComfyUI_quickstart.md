# ComfyUI Quick Start

## Install ComfyUI on EC2/EKS

### Option for production
- [cost-effective-aws-deployment-of-comfyui](https://github.com/aws-samples/cost-effective-aws-deployment-of-comfyui)
- [基于 Amazon EKS 的 Stable Diffusion ComfyUI 部署方案](https://aws.amazon.com/cn/blogs/china/stable-diffusion-comfyui-deployment-solution-based-on-amazon-eks/)

### Option for Dev

Follow up the guide of [ComfyUI github repo](https://github.com/comfyanonymous/ComfyUI) and [install-comfyui-on-linux](https://comfyui-wiki.com/en/install/install-comfyui/install-comfyui-on-linux)

1. Start EC2 G6e.12xlarge with Deep Learning OSS Nvidia Driver AMI GPU Pytouch 2.8 (Ubuntu 24.04)

2. SSH to EC2
```
nvidia-smi
nvcc --version

mkdir -p /home/ubuntu/ai-workspace
cd /home/ubuntu/ai-workspace

python3 --version # make sure Python 3.12 or 3.13
python3 -m venv venv
source venv/bin/activate

which pip
/home/ubuntu/ai-workspace/venv/bin/pip
which python3
/home/ubuntu/ai-workspace/venv/bin/python3

pip install comfy-cli
comfy --workspace /home/ubuntu/ai-workspace/ComfyUI install --nvidia 

nvidia-smi

#Start the Service
cd ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```


## Use ComfyUI
1. Access the http://EC2_IP:8188

### Test the Wan 2.2 model
1. [ComfUI Wan 2.2 examples](https://comfyanonymous.github.io/ComfyUI_examples/wan22/)
2. [Wan2.2 视频生成ComfyUI 官方原生工作流示例](https://docs.comfy.org/zh-CN/tutorials/video/wan/wan2_2)
3. 样题 Prompt
```bash
一位年轻漂亮的中国女子站在一间柔和照明的房间里，房间的背景有一扇大窗户。这位女子有着长长的、笔直的黑色长发，从她的后背一直垂到腰。她穿着一件宽松的浅蓝色、露肩的上衣，左臂上的衣服开始滑落，露出了她的左肩和背部的一小部分，穿一件白色紧身运动短裤，显得臀部曲线优美。她的右臂抬起，手放在头顶上，使她的头微微后仰并向上凝视。她的皮肤白皙，身材苗条。窗户上的光线为她周围营造出一种柔和、近乎梦幻的光芒，凸显出她皮肤的光滑质感和头发的柔软度。窗户上装饰着薄纱般的白色窗帘，能让光线柔和地透进来，营造出一种宁静的氛围。女子的姿势和柔和的光线共同营造出一种宁静、沉思的氛围在照片中。

# nagtive prompt
色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走，NSFW
```

4. Nano Banana prompt - 陶瓷娃娃
```bash
The ceramic art piece depicts an artistic and semi-realistic female figure. She has a serene expression and is sitting in front of a dark and solid background. This woman has fair skin, her eyes are closed, her head is slightly tilted back, and her right hand gently touches her neck. She has long blue hair, which is adorned with a delicate white floral hair accessory, matching the intricate floral patterns on her clothes.
Her clothes are sleeveless and made of a traditional Chinese ceramic material with a ceramic glaze firing process, featuring exquisite blue floral patterns. The flowers on her clothes are large and detailed, creating a harmonious contrast with her hair accessory. Her left arm is resting on her leg, in a relaxed and graceful posture, exuding a sense of calm and introspection.
The background is a simple gradient of dark colors, which helps to highlight the refined features of the figure and the intricate details of her clothing. The overall style of this work is both realistic and has a touch of fantasy, emphasizing the elegance and tranquility of the female figure.
```

5. 休闲照变证件照
```bash
Transform the uploaded casual photo into a high-end professional business portrait for a resume. 
Keep the original face and identity fully consistent. 
The composition should be a formal head-and-shoulders shot, 1:1 aspect ratio, with clean framing and balanced proportions. 
The man should wear a premium solid-colored dress shirt (navy blue, charcoal gray, or light blue), with a visible collar, neat and elegant, no logos or patterns. 
Use a subtle gradient or textured studio background in warm neutral tones (light gray or soft beige), softly blurred to create depth. 
Apply soft studio lighting that highlights the facial features naturally, with realistic skin tones and high clarity. 
The overall atmosphere must feel confident, approachable, and modern, with a relaxed but professional expression. 
The photo should look like a refined corporate headshot suitable for resumes or LinkedIn. 
--no text, logos, clutter, watermarks, artistic effects, or distracting elements
```

6. Try [wan22-animate-and-qwen-image-edit-2509]https://blog.comfy.org/p/wan22-animate-and-qwen-image-edit-2509
```bash
中景特写，户外专业摄影，一位年轻漂亮的中国少女站在热带海滩上，侧身向镜头。她有着长长的、笔直的深棕色头发，披散在肩上，脸上洋溢着灿烂的笑容，露出了洁白的牙齿。她的皮肤白皙，穿着一件白色运动背心，紧贴着她苗条的身材，还有一条浅蓝色的运动短裤。她手拿一顶编制草帽，她的右手放在胸部，弯腰，左臂弯曲到肘部，手轻轻地触碰着膝盖。她的左腕戴着一条薄薄的紫色手链。

在背景中，有一片湛蓝的天空，一片平静的蓝绿色海洋，波浪轻柔地拍打着海岸，一片沙滩。一棵椰子树的叶子部分框住了画面的左上角。左边有两把灰色的躺椅，上面铺着白色的坐垫，放在沙滩上。整体氛围轻松而明媚，给人一种温暖的热带环境的感觉。
```

```bash
Hyperrealistic macro photograph of a team of tiny bakers—each precisely 2 inches tall—collaborating on an enormous, golden-brown croissant with flaky, layered textures. The bakers are engaged in dynamic, detailed actions: one uses a miniature wooden bucket to spread rich, creamy butter between the croissant’s layers, another climbs a thin rope ladder to evenly pipe smooth, glossy chocolate filling onto the top, and a third brushes a light egg wash with a tiny pastry brush. The scene is bathed in warm, soft kitchen lighting with cinematic depth—subtle highlights on the croissant’s golden crust, gentle shadows that emphasize texture, and a soft glow from overhead pendant lights. Floating flour dust particles catch the light, adding a sense of movement and realism, while tiny details like the bakers’ stitched cloth aprons, smudged flour on their faces, the rough wood of the worktable, and the slight sheen of melted butter on the croissant are rendered with ultra-precision. Ultra-detailed, 8K resolution, photorealistic textures, sharp focus on the bakers and croissant, shallow depth of field to blur the background slightly, rich warm color palette, lifelike proportions, and a cozy, whimsical atmosphere that balances realism with charm.
```

## update ComfyUI

Follow up the guide for [manual installation update](https://docs.comfy.org/installation/update_comfyui#manual-installation)

```bash
source venv/bin/activate

cd ~/ai-workspace/ComfyUI
git pull

pip install -r requirements.txt

python main.py --listen 0.0.0.0 --port 8188

Using the Manager to update to the stable version
```

