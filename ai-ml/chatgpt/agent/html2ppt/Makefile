# HTML2PPT Makefile

.PHONY: help install test example clean lint format

# 默认目标
help:
	@echo "HTML2PPT 项目管理命令："
	@echo ""
	@echo "  install          - 自动安装项目依赖（推荐）"
	@echo "  install-minimal  - 安装最小依赖"
	@echo "  install-full     - 安装完整依赖"
	@echo "  test             - 运行所有测试"
	@echo "  example          - 运行示例转换"
	@echo "  clean            - 清理生成的文件"
	@echo "  lint             - 代码风格检查"
	@echo "  format           - 代码格式化"
	@echo "  setup            - 初始化项目环境"
	@echo ""
	@echo "故障排除："
	@echo "  如果安装失败，请查看 TROUBLESHOOTING.md"
	@echo ""

# 安装依赖
install:
	@echo "正在安装项目依赖..."
	python install.py

# 最小安装
install-minimal:
	@echo "正在安装最小依赖..."
	pip install -r requirements-minimal.txt
	@echo "最小依赖安装完成！"

# 完整安装
install-full:
	@echo "正在安装完整依赖..."
	pip install -r requirements.txt
	@echo "完整依赖安装完成！"

# 运行测试
test:
	@echo "正在运行测试..."
	python run_tests.py

# 运行示例
example:
	@echo "正在运行示例转换..."
	python run_example.py

# 清理生成的文件
clean:
	@echo "正在清理生成的文件..."
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.log" -delete
	rm -f examples/output.pptx
	rm -rf images/
	@echo "清理完成！"

# 代码风格检查
lint:
	@echo "正在进行代码风格检查..."
	@if command -v flake8 >/dev/null 2>&1; then \
		flake8 src/ tests/ --max-line-length=120 --ignore=E501,W503; \
	else \
		echo "flake8 未安装，跳过代码风格检查"; \
		echo "安装命令: pip install flake8"; \
	fi

# 代码格式化
format:
	@echo "正在格式化代码..."
	@if command -v black >/dev/null 2>&1; then \
		black src/ tests/ --line-length=120; \
	else \
		echo "black 未安装，跳过代码格式化"; \
		echo "安装命令: pip install black"; \
	fi

# 初始化项目环境
setup:
	@echo "正在初始化项目环境..."
	@if [ ! -d "venv" ]; then \
		echo "创建虚拟环境..."; \
		python -m venv venv; \
	fi
	@echo "请激活虚拟环境："
	@echo "  Windows: venv\\Scripts\\activate"
	@echo "  macOS/Linux: source venv/bin/activate"
	@echo "然后运行: make install"

# 创建必要的目录
dirs:
	@mkdir -p templates
	@mkdir -p examples
	@mkdir -p tests
	@mkdir -p images
	@echo "目录结构创建完成！"

# 运行完整的开发流程
dev: clean install test example
	@echo "开发环境准备完成！"

# 构建发布包
build:
	@echo "正在构建发布包..."
	@if command -v python setup.py >/dev/null 2>&1; then \
		python setup.py sdist bdist_wheel; \
	else \
		echo "setup.py 不存在，跳过构建"; \
	fi

# 显示项目信息
info:
	@echo "HTML2PPT 项目信息："
	@echo "  版本: 1.0.0"
	@echo "  Python版本: $(shell python --version)"
	@echo "  项目目录: $(shell pwd)"
	@echo "  依赖包数量: $(shell wc -l < requirements.txt)"
	@echo ""
	@echo "目录结构："
	@find . -type f -name "*.py" | head -10
	@echo "  ..."

# 快速转换（需要指定输入文件）
convert:
	@if [ -z "$(INPUT)" ]; then \
		echo "使用方法: make convert INPUT=input.html OUTPUT=output.pptx"; \
		exit 1; \
	fi
	@if [ -z "$(OUTPUT)" ]; then \
		OUTPUT="output.pptx"; \
	fi
	@echo "正在转换 $(INPUT) -> $(OUTPUT)"
	python main.py -i "$(INPUT)" -o "$(OUTPUT)"