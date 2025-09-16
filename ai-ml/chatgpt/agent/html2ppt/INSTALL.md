# HTML2PPT 安装和使用指南

## 系统要求

- Python 3.8 或更高版本
- 操作系统：Windows、macOS、Linux

## 安装步骤

### 1. 克隆或下载项目

```bash
# 如果是从git仓库克隆
git clone <repository-url>
cd html2ppt

# 或者直接下载项目文件到html2ppt目录
```

### 2. 创建虚拟环境（推荐）

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

### 3. 安装依赖包

#### 方法一：自动安装（推荐）
```bash
python install.py
```

#### 方法二：最小依赖安装
```bash
pip install -r requirements-minimal.txt
```

#### 方法三：完整安装
```bash
pip install -r requirements.txt
```

#### 如果遇到安装问题
请查看 `TROUBLESHOOTING.md` 文件获取详细的解决方案。

### 4. 验证安装

```bash
# 运行测试
python run_tests.py

# 运行示例
python run_example.py
```

## 快速开始

### 基本用法

```bash
# 转换HTML文件为PPT
python main.py -i examples/sample.html -o output.pptx
```

### 高级用法

```bash
# 使用自定义模版
python main.py -i input.html -o output.pptx -t templates/custom.pptx

# 使用自定义配置
python main.py -i input.html -o output.pptx -c custom_config.yaml

# 禁用语义分析
python main.py -i input.html -o output.pptx --no-semantic

# 严格保持HTML结构
python main.py -i input.html -o output.pptx --preserve-structure
```

## 配置说明

### 基本配置

编辑 `config.yaml` 文件来自定义转换行为：

```yaml
# 语义分析配置
semantic_analysis:
  enabled: true
  model: "local"  # 或 "gpt-3.5-turbo"
  
# 布局设置
layout_settings:
  slide_width: 10
  slide_height: 7.5
  margins:
    top: 0.5
    bottom: 0.5
    left: 0.5
    right: 0.5
```

### OpenAI API 配置（可选）

如果要使用OpenAI的语义分析功能：

1. 获取OpenAI API密钥
2. 在配置文件中设置：

```yaml
semantic_analysis:
  enabled: true
  model: "gpt-3.5-turbo"
  api_key: "your-api-key-here"
```

## 使用示例

### Python API

```python
from src.html_parser import HTMLParser
from src.semantic_analyzer import SemanticAnalyzer
from src.ppt_generator import PPTGenerator

# 创建解析器
parser = HTMLParser()
analyzer = SemanticAnalyzer()
generator = PPTGenerator()

# 解析HTML
content = parser.parse_file('input.html')

# 语义分析
analyzed = analyzer.analyze(content)

# 生成PPT
generator.create_presentation(analyzed, 'output.pptx')
```

### 批量转换

```python
import os
from pathlib import Path

html_dir = Path('html_files')
output_dir = Path('ppt_files')
output_dir.mkdir(exist_ok=True)

for html_file in html_dir.glob('*.html'):
    output_file = output_dir / f"{html_file.stem}.pptx"
    
    # 转换单个文件
    os.system(f'python main.py -i "{html_file}" -o "{output_file}"')
```

## 故障排除

### 常见问题

1. **模块导入错误**
   ```
   解决方案：确保已安装所有依赖包
   pip install -r requirements.txt
   ```

2. **字体问题**
   ```
   解决方案：确保系统安装了Microsoft YaHei字体，或修改配置文件中的字体设置
   ```

3. **图片加载失败**
   ```
   解决方案：检查HTML中的图片路径是否正确，或在配置中禁用图片下载
   ```

4. **内存不足**
   ```
   解决方案：处理大文件时，可以禁用语义分析或调整配置参数
   ```

### 日志调试

启用详细日志输出：

```bash
python main.py -i input.html -o output.pptx --log-level DEBUG
```

### 性能优化

1. **禁用语义分析**（提高速度）：
   ```bash
   python main.py -i input.html -o output.pptx --no-semantic
   ```

2. **使用本地模型**（避免API调用）：
   ```yaml
   semantic_analysis:
     model: "local"
   ```

3. **调整图片处理**：
   ```yaml
   image_processing:
     download_external: false
     resize_large_images: true
   ```

## 支持的HTML特性

### 完全支持
- 标题标签 (h1-h6)
- 段落 (p)
- 列表 (ul, ol, li)
- 表格 (table, tr, td, th)
- 图片 (img)
- 链接 (a)
- 强调 (strong, em, b, i)
- 代码 (code, pre)
- 引用 (blockquote)

### 部分支持
- CSS样式（颜色、字体、大小等）
- 内联样式和外部样式表
- 响应式布局（会适配PPT尺寸）

### 不支持
- JavaScript交互
- 复杂的CSS动画
- 视频和音频元素
- 表单元素

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本HTML到PPT转换
- 集成语义分析功能
- 支持自定义模版和配置

## 许可证

MIT License - 详见 LICENSE 文件

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交GitHub Issue
- 发送邮件至项目维护者