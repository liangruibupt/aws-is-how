"""
HTML to PowerPoint Converter Package
"""

__version__ = "1.0.0"
__author__ = "HTML2PPT Team"
__description__ = "智能HTML文档转PowerPoint演示文稿工具"

from .html_parser import HTMLParser
from .semantic_analyzer import SemanticAnalyzer
from .ppt_generator import PPTGenerator
from .style_mapper import StyleMapper
from .template_manager import TemplateManager

__all__ = [
    'HTMLParser',
    'SemanticAnalyzer', 
    'PPTGenerator',
    'StyleMapper',
    'TemplateManager'
]