#!/usr/bin/env python3
"""
HTML2PPT 示例运行脚本
"""

import os
import sys
import logging
from pathlib import Path

# 添加src目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def main():
    """运行示例"""
    # 设置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger = logging.getLogger(__name__)
    
    try:
        # 导入模块
        from html_parser import HTMLParser
        from semantic_analyzer import SemanticAnalyzer
        from ppt_generator import PPTGenerator
        
        # 配置
        config = {
            'semantic_analysis': {
                'enabled': True,
                'model': 'local'  # 使用本地模型
            },
            'layout_settings': {
                'slide_width': 10,
                'slide_height': 7.5,
                'margins': {
                    'top': 0.5,
                    'bottom': 0.5,
                    'left': 0.5,
                    'right': 0.5
                }
            }
        }
        
        # 输入输出文件
        input_file = 'examples/sample.html'
        output_file = 'tests/__pycache__/output.pptx'
        
        if not os.path.exists(input_file):
            logger.error(f"示例HTML文件不存在: {input_file}")
            return 1
        
        logger.info("开始HTML转PPT示例...")
        
        # 1. 解析HTML
        logger.info("正在解析HTML文档...")
        html_parser = HTMLParser(config)
        parsed_content = html_parser.parse_file(input_file)
        
        if not parsed_content:
            logger.error("HTML解析失败")
            return 1
        
        logger.info(f"HTML解析完成，发现 {len(parsed_content.get('sections', []))} 个内容区块")
        
        # 2. 语义分析
        logger.info("正在进行语义分析...")
        semantic_analyzer = SemanticAnalyzer(config)
        analyzed_content = semantic_analyzer.analyze(parsed_content)
        
        # 3. 生成PPT
        logger.info("正在生成PowerPoint演示文稿...")
        ppt_generator = PPTGenerator(config)
        success = ppt_generator.create_presentation(analyzed_content, output_file)
        
        if success:
            logger.info(f"转换完成！输出文件: {output_file}")
            
            # 显示统计信息
            stats = ppt_generator.get_statistics()
            logger.info(f"生成统计: {stats['slides']} 张幻灯片, "
                       f"{stats['images']} 张图片, "
                       f"{stats['text_blocks']} 个文本块, "
                       f"{stats['tables']} 个表格")
            
            # 显示PPT结构信息
            ppt_structure = analyzed_content.get('ppt_structure', {})
            logger.info(f"PPT结构: 总计 {ppt_structure.get('total_slides', 0)} 张幻灯片")
            
            return 0
        else:
            logger.error("PPT生成失败")
            return 1
            
    except ImportError as e:
        logger.error(f"模块导入失败: {e}")
        logger.error("请确保已安装所有依赖包: pip install -r requirements.txt")
        return 1
    except Exception as e:
        logger.error(f"运行示例时发生错误: {str(e)}", exc_info=True)
        return 1

if __name__ == '__main__':
    sys.exit(main())