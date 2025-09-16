#!/usr/bin/env python3
"""
HTML to PowerPoint Converter - Main Entry Point
"""

import argparse
import sys
import os
from pathlib import Path
import yaml
import logging
from datetime import datetime

# 添加src目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from html_parser import HTMLParser
from semantic_analyzer import SemanticAnalyzer
from ppt_generator import PPTGenerator

def setup_logging(log_level='INFO'):
    """设置日志配置"""
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(f'html2ppt_{datetime.now().strftime("%Y%m%d")}.log')
        ]
    )

def load_config(config_path='config.yaml'):
    """加载配置文件"""
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        logging.warning(f"配置文件 {config_path} 未找到，使用默认配置")
        return {}
    except yaml.YAMLError as e:
        logging.error(f"配置文件解析错误: {e}")
        return {}

def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='将HTML文档转换为PowerPoint演示文稿',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python main.py -i input.html -o output.pptx
  python main.py -i input.html -o output.pptx -t templates/custom.pptx
  python main.py -i input.html -o output.pptx -c custom_config.yaml
        """
    )
    
    parser.add_argument(
        '-i', '--input',
        required=True,
        help='输入HTML文件路径'
    )
    
    parser.add_argument(
        '-o', '--output',
        required=True,
        help='输出PPT文件路径'
    )
    
    parser.add_argument(
        '-t', '--template',
        help='PPT模版文件路径（可选）'
    )
    
    parser.add_argument(
        '-c', '--config',
        default='config.yaml',
        help='配置文件路径（默认: config.yaml）'
    )
    
    parser.add_argument(
        '--log-level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        default='INFO',
        help='日志级别（默认: INFO）'
    )
    
    parser.add_argument(
        '--no-semantic',
        action='store_true',
        help='禁用语义分析'
    )
    
    parser.add_argument(
        '--preserve-structure',
        action='store_true',
        help='严格保持HTML结构'
    )
    
    args = parser.parse_args()
    
    # 设置日志
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    try:
        # 检查输入文件
        if not os.path.exists(args.input):
            logger.error(f"输入文件不存在: {args.input}")
            return 1
            
        # 加载配置
        config = load_config(args.config)
        
        # 如果禁用语义分析，更新配置
        if args.no_semantic:
            config.setdefault('semantic_analysis', {})['enabled'] = False
            
        # 如果保持结构，更新配置
        if args.preserve_structure:
            config.setdefault('layout_settings', {})['preserve_hierarchy'] = True
        
        logger.info(f"开始转换: {args.input} -> {args.output}")
        
        # 1. 解析HTML
        logger.info("正在解析HTML文档...")
        html_parser = HTMLParser(config)
        parsed_content = html_parser.parse_file(args.input)
        
        if not parsed_content:
            logger.error("HTML解析失败")
            return 1
            
        logger.info(f"HTML解析完成，发现 {len(parsed_content.get('sections', []))} 个内容区块")
        
        # 2. 语义分析（如果启用）
        if config.get('semantic_analysis', {}).get('enabled', True):
            logger.info("正在进行语义分析...")
            semantic_analyzer = SemanticAnalyzer(config)
            analyzed_content = semantic_analyzer.analyze(parsed_content)
        else:
            logger.info("跳过语义分析")
            analyzed_content = parsed_content
            
        # 3. 生成PPT
        logger.info("正在生成PowerPoint演示文稿...")
        ppt_generator = PPTGenerator(config)
        
        # 设置模版
        if args.template:
            ppt_generator.set_template(args.template)
            
        # 生成演示文稿
        success = ppt_generator.create_presentation(analyzed_content, args.output)
        
        if success:
            logger.info(f"转换完成！输出文件: {args.output}")
            
            # 显示统计信息
            stats = ppt_generator.get_statistics()
            logger.info(f"生成统计: {stats['slides']} 张幻灯片, "
                       f"{stats['images']} 张图片, "
                       f"{stats['text_blocks']} 个文本块")
            return 0
        else:
            logger.error("PPT生成失败")
            return 1
            
    except KeyboardInterrupt:
        logger.info("用户中断操作")
        return 1
    except Exception as e:
        logger.error(f"转换过程中发生错误: {str(e)}", exc_info=True)
        return 1

if __name__ == '__main__':
    sys.exit(main())