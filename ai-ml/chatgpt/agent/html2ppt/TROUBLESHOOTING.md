# HTML2PPT 故障排除指南

## 安装问题解决方案

### 1. pip install 错误的常见解决方法

#### 方法一：使用最小依赖安装
```bash
# 先安装基本功能所需的包
pip install -r requirements-minimal.txt
```

#### 方法二：逐个安装依赖包
```bash
# 核心依赖
pip install python-pptx
pip install beautifulsoup4
pip install lxml
pip install Pillow
pip install requests
pip install pyyaml
pip install cssutils

# 可选依赖（如果需要AI功能）
pip install openai
pip install transformers
pip install torch
```

#### 方法三：升级pip和setuptools
```bash
# 升级pip
python -m pip install --upgrade pip

# 升级setuptools
pip install --upgrade setuptools wheel

# 然后重新安装
pip install -r requirements.txt
```

#### 方法四：使用conda（推荐）
```bash
# 创建conda环境
conda create -n html2ppt python=3.9
conda activate html2ppt

# 安装主要依赖
conda install -c conda-forge python-pptx beautifulsoup4 lxml pillow requests pyyaml

# 安装其他依赖
pip install cssutils html2text markdown
```

### 2. 特定包的安装问题

#### lxml 安装失败
```bash
# Ubuntu/Debian
sudo apt-get install libxml2-dev libxslt1-dev python3-dev

# CentOS/RHEL
sudo yum install libxml2-devel libxslt-devel python3-devel

# macOS
brew install libxml2 libxslt

# Windows
# 使用预编译的wheel包
pip install --only-binary=lxml lxml
```

#### Pillow 安装失败
```bash
# Ubuntu/Debian
sudo apt-get install libjpeg-dev zlib1g-dev

# CentOS/RHEL
sudo yum install libjpeg-devel zlib-devel

# macOS
brew install jpeg zlib

# Windows
# 通常pip安装即可，如果失败尝试：
pip install --upgrade Pillow
```

#### torch 安装失败（大文件）
```bash
# CPU版本（更小）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# 或者跳过torch安装，禁用AI功能
# 在config.yaml中设置：
# semantic_analysis:
#   enabled: false
```

### 3. Python版本兼容性

#### 检查Python版本
```bash
python --version
# 需要Python 3.8或更高版本
```

#### 如果Python版本过低
```bash
# 使用pyenv安装新版本Python
pyenv install 3.9.16
pyenv local 3.9.16

# 或使用conda
conda install python=3.9
```

### 4. 网络问题解决

#### 使用国内镜像源
```bash
# 临时使用
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/

# 永久配置
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple/
```

#### 离线安装
```bash
# 下载所有包到本地
pip download -r requirements.txt -d ./packages

# 离线安装
pip install --no-index --find-links ./packages -r requirements.txt
```

### 5. 权限问题

#### 使用用户安装
```bash
pip install --user -r requirements.txt
```

#### 使用虚拟环境（推荐）
```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 6. 内存不足问题

#### 分批安装大包
```bash
# 先安装小包
pip install python-pptx beautifulsoup4 lxml Pillow requests pyyaml cssutils

# 再安装大包
pip install torch --no-cache-dir

# 最后安装其他包
pip install transformers openai
```

### 7. 简化版本安装

如果仍然有问题，可以使用简化版本：

```bash
# 只安装核心功能
pip install python-pptx beautifulsoup4 lxml Pillow requests pyyaml
```

然后在配置文件中禁用AI功能：

```yaml
# config.yaml
semantic_analysis:
  enabled: false
```

### 8. Docker安装（终极解决方案）

创建Dockerfile：
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    libxml2-dev libxslt1-dev \
    libjpeg-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制文件
COPY requirements-minimal.txt .
RUN pip install -r requirements-minimal.txt

COPY . .

CMD ["python", "main.py"]
```

构建和运行：
```bash
docker build -t html2ppt .
docker run -v $(pwd):/data html2ppt python main.py -i /data/input.html -o /data/output.pptx
```

### 9. 验证安装

安装完成后，运行以下命令验证：

```bash
# 检查核心包
python -c "import pptx; print('python-pptx OK')"
python -c "from bs4 import BeautifulSoup; print('beautifulsoup4 OK')"
python -c "import lxml; print('lxml OK')"
python -c "from PIL import Image; print('Pillow OK')"

# 运行测试
python run_tests.py

# 运行示例
python run_example.py
```

### 10. 获取帮助

如果以上方法都不能解决问题，请：

1. 记录完整的错误信息
2. 提供系统信息（操作系统、Python版本）
3. 尝试最小化重现问题
4. 查看项目的GitHub Issues
5. 联系项目维护者

### 常见错误信息和解决方案

#### "Microsoft Visual C++ 14.0 is required"
```bash
# Windows用户安装Visual Studio Build Tools
# 或使用预编译的wheel包
pip install --only-binary=all -r requirements.txt
```

#### "Failed building wheel for lxml"
```bash
# 使用预编译版本
pip install --only-binary=lxml lxml
```

#### "No module named '_lzma'"
```bash
# 重新编译Python或使用conda
conda install python
```

#### "SSL: CERTIFICATE_VERIFY_FAILED"
```bash
# 临时解决
pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt
```

记住：如果遇到问题，优先尝试使用 `requirements-minimal.txt` 进行基本功能的安装！