"""
HTML解析器测试
"""

import unittest
import os
import sys
from pathlib import Path

# 添加src目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from html_parser import HTMLParser

class TestHTMLParser(unittest.TestCase):
    """HTML解析器测试类"""
    
    def setUp(self):
        """测试前准备"""
        self.parser = HTMLParser()
        self.test_html = """
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <title>测试文档</title>
            <meta name="description" content="这是一个测试文档">
        </head>
        <body>
            <h1>主标题</h1>
            <p>这是一个段落。</p>
            <ul>
                <li>列表项1</li>
                <li>列表项2</li>
            </ul>
            <table>
                <tr>
                    <th>标题1</th>
                    <th>标题2</th>
                </tr>
                <tr>
                    <td>数据1</td>
                    <td>数据2</td>
                </tr>
            </table>
        </body>
        </html>
        """
    
    def test_parse_html(self):
        """测试HTML解析"""
        result = self.parser.parse_html(self.test_html)
        
        self.assertIsNotNone(result)
        self.assertIn('document_info', result)
        self.assertIn('sections', result)
        
        # 检查文档信息
        doc_info = result['document_info']
        self.assertEqual(doc_info['title'], '测试文档')
        self.assertEqual(doc_info['language'], 'zh-CN')
    
    def test_extract_document_info(self):
        """测试文档信息提取"""
        result = self.parser.parse_html(self.test_html)
        doc_info = result['document_info']
        
        self.assertEqual(doc_info['title'], '测试文档')
        self.assertIn('description', doc_info['meta'])
        self.assertEqual(doc_info['meta']['description'], '这是一个测试文档')
    
    def test_parse_structure(self):
        """测试结构解析"""
        result = self.parser.parse_html(self.test_html)
        sections = result['sections']
        
        self.assertGreater(len(sections), 0)
        
        # 检查第一个章节（应该是h1标题）
        first_section = sections[0]
        self.assertEqual(first_section['type'], 'section')
        self.assertEqual(first_section['level'], 1)
        self.assertEqual(first_section['title'], '主标题')
    
    def test_parse_list(self):
        """测试列表解析"""
        result = self.parser.parse_html(self.test_html)
        
        # 查找列表内容
        found_list = False
        for section in result['sections']:
            for content in section.get('content', []):
                if content.get('type') == 'ul':
                    found_list = True
                    items = content.get('items', [])
                    self.assertEqual(len(items), 2)
                    self.assertEqual(items[0]['text'], '列表项1')
                    self.assertEqual(items[1]['text'], '列表项2')
                    break
        
        self.assertTrue(found_list, "未找到列表内容")
    
    def test_parse_table(self):
        """测试表格解析"""
        result = self.parser.parse_html(self.test_html)
        
        # 查找表格内容
        found_table = False
        for section in result['sections']:
            for content in section.get('content', []):
                if content.get('type') == 'table':
                    found_table = True
                    table_data = content.get('table_data', {})
                    
                    # 检查表头
                    headers = table_data.get('headers', [])
                    self.assertEqual(len(headers), 2)
                    
                    # 检查数据行
                    rows = table_data.get('rows', [])
                    self.assertEqual(len(rows), 1)
                    self.assertEqual(len(rows[0]), 2)
                    break
        
        self.assertTrue(found_table, "未找到表格内容")
    
    def test_extract_text_content(self):
        """测试文本内容提取"""
        from bs4 import BeautifulSoup
        
        html = '<p>这是<strong>粗体</strong>和<em>斜体</em>文本。</p>'
        soup = BeautifulSoup(html, 'lxml')
        p_tag = soup.find('p')
        
        formatted_text = self.parser._extract_text_content(p_tag)
        
        # Check if we got formatted text (list) or plain text (string)
        if isinstance(formatted_text, list):
            # New formatted text structure
            text_parts = [part['text'] for part in formatted_text]
            full_text = ''.join(text_parts)
            self.assertIn('粗体', full_text)
            self.assertIn('斜体', full_text)
            
            # Check formatting
            bold_part = next((part for part in formatted_text if part['text'] == '粗体'), None)
            self.assertIsNotNone(bold_part)
            self.assertTrue(bold_part['bold'])
            
            italic_part = next((part for part in formatted_text if part['text'] == '斜体'), None)
            self.assertIsNotNone(italic_part)
            self.assertTrue(italic_part['italic'])
        else:
            # Fallback to old plain text structure
            self.assertIn('粗体', formatted_text)
            self.assertIn('斜体', formatted_text)
    
    def test_get_element_styles(self):
        """测试样式提取"""
        from bs4 import BeautifulSoup
        
        html = '<p style="color: red; font-size: 16px;" class="highlight">测试文本</p>'
        soup = BeautifulSoup(html, 'lxml')
        p_tag = soup.find('p')
        
        styles = self.parser._get_element_styles(p_tag)
        self.assertIn('color', styles)
        self.assertIn('font-size', styles)

if __name__ == '__main__':
    unittest.main()