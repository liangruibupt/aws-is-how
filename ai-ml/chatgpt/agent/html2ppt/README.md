# HTML to PowerPoint Converter Agent

一个智能的HTML文档转换为PowerPoint演示文稿的Agent，能够保持原始样式和语义结构。

## 功能特性

- **语义分析**: 基于语义提取和识别关键和非关键信息，构建PPT内容和故事主线
- **内容保真**: PPT中的文字、段落内容与HTML中内容完全一致
- **结构映射**: 支持任意标签结构层级的HTML文档，根据HTML标签结构定义PPT结构
- **样式保持**: 支持任意HTML标签样式，根据HTML标签样式定义PPT样式
- **模版支持**: 能够使用用户指定的PPT模版
- **图片处理**: 保留HTML中的图片内容，以合理布局展示在PPT中
- **备注保存**: 重要的文字内容和备注信息保存在PPT页面备注中

## 项目结构

```
html2ppt/
├── README.md                 # 项目说明文档
├── requirements.txt          # Python依赖包
├── config.yaml              # 配置文件
├── main.py                  # 主程序入口
├── src/                     # 源代码目录
│   ├── __init__.py
│   ├── html_parser.py       # HTML解析器
│   ├── semantic_analyzer.py # 语义分析器
│   ├── ppt_generator.py     # PPT生成器
│   ├── style_mapper.py      # 样式映射器
│   └── template_manager.py  # 模版管理器
├── templates/               # PPT模版目录
│   └── default.pptx         # 默认模版
├── examples/                # 示例文件
│   ├── sample.html          # 示例HTML文件
│   └── output.pptx          # 示例输出文件
└── tests/                   # 测试文件
    ├── __init__.py
    ├── test_html_parser.py
    ├── test_semantic_analyzer.py
    └── test_ppt_generator.py
```

## 快速开始

1. 安装依赖:
```bash
pip install -r requirements.txt
```

2. 运行转换:
```bash
python run_example.py
# 或使用命令行
python main.py --input sample.html --output presentation.pptx --template templates/default.pptx
```

3. 运行测试:
```
python run_tests.py
# 或使用Makefile
make test
```

## 使用方法

### 基本用法
```python
from src.html_parser import HTMLParser
from src.ppt_generator import PPTGenerator

# 解析HTML
parser = HTMLParser()
content = parser.parse_file('input.html')

# 生成PPT
generator = PPTGenerator()
generator.create_presentation(content, 'output.pptx')
```

### 高级配置
```python
# 使用自定义模版和配置
generator = PPTGenerator(
    template_path='templates/custom.pptx',
    config_path='config.yaml'
)
```

## 配置说明

配置文件 `config.yaml` 支持以下选项:

- `semantic_analysis`: 语义分析配置
- `style_mapping`: 样式映射规则
- `layout_settings`: 布局设置
- `image_processing`: 图片处理选项

## 依赖项

- python-pptx: PowerPoint文件操作
- beautifulsoup4: HTML解析
- lxml: XML/HTML处理
- Pillow: 图片处理
- openai: AI语义分析（可选）
- transformers: 本地语义分析（可选）

## 许可证

MIT License