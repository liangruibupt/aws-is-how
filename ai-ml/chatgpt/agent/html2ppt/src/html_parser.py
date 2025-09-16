"""
HTML解析器 - 解析HTML文档并提取结构化内容
"""

import os
import re
import logging
from urllib.parse import urljoin, urlparse
from pathlib import Path
import requests
from bs4 import BeautifulSoup, Tag, NavigableString
import cssutils
from PIL import Image
import base64
import io

logger = logging.getLogger(__name__)

class HTMLParser:
    """HTML文档解析器"""
    
    def __init__(self, config=None):
        self.config = config or {}
        self.base_url = None
        self.images = []
        self.styles = {}
        
        # 配置CSS解析器
        cssutils.log.setLevel(logging.WARNING)
        
    def parse_file(self, file_path):
        """解析HTML文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # 设置基础URL用于相对路径解析
            file_path_abs = Path(file_path).resolve()
            self.base_url = file_path_abs.parent.as_uri() + '/'
            
            return self.parse_html(html_content)
            
        except Exception as e:
            logger.error(f"解析HTML文件失败: {e}")
            return None
    
    def parse_html(self, html_content):
        """解析HTML内容"""
        try:
            soup = BeautifulSoup(html_content, 'lxml')
            
            # 提取文档信息
            doc_info = self._extract_document_info(soup)
            
            # 提取样式信息
            self._extract_styles(soup)
            
            # 解析文档结构
            sections = self._parse_structure(soup.body if soup.body else soup)
            
            # 处理图片
            self._process_images(soup)
            
            return {
                'document_info': doc_info,
                'sections': sections,
                'images': self.images,
                'styles': self.styles,
                'raw_html': str(soup)
            }
            
        except Exception as e:
            logger.error(f"解析HTML内容失败: {e}")
            return None
    
    def _extract_document_info(self, soup):
        """提取文档基本信息"""
        info = {}
        
        # 标题
        title_tag = soup.find('title')
        info['title'] = title_tag.get_text().strip() if title_tag else '未命名文档'
        
        # 元数据
        meta_tags = soup.find_all('meta')
        info['meta'] = {}
        
        for meta in meta_tags:
            name = meta.get('name') or meta.get('property')
            content = meta.get('content')
            if name and content:
                info['meta'][name] = content
        
        # 语言
        html_tag = soup.find('html')
        info['language'] = html_tag.get('lang', 'zh-CN') if html_tag else 'zh-CN'
        
        return info
    
    def _extract_styles(self, soup):
        """提取样式信息"""
        # 内联样式
        style_tags = soup.find_all('style')
        for style_tag in style_tags:
            try:
                css_text = style_tag.get_text()
                sheet = cssutils.parseString(css_text)
                for rule in sheet:
                    if hasattr(rule, 'selectorText'):
                        self.styles[rule.selectorText] = self._parse_css_properties(rule.style)
            except Exception as e:
                logger.warning(f"解析CSS样式失败: {e}")
        
        # 外部样式表
        link_tags = soup.find_all('link', rel='stylesheet')
        for link in link_tags:
            href = link.get('href')
            if href:
                try:
                    css_url = urljoin(self.base_url, href)
                    response = requests.get(css_url, timeout=10)
                    if response.status_code == 200:
                        sheet = cssutils.parseString(response.text)
                        for rule in sheet:
                            if hasattr(rule, 'selectorText'):
                                self.styles[rule.selectorText] = self._parse_css_properties(rule.style)
                except Exception as e:
                    logger.warning(f"加载外部样式表失败 {href}: {e}")
    
    def _parse_css_properties(self, style):
        """解析CSS属性"""
        properties = {}
        for prop in style:
            properties[prop.name] = prop.value
        return properties
    
    def _parse_structure(self, element):
        """解析文档结构"""
        sections = []
        current_section = None
        
        for child in element.children:
            if isinstance(child, Tag):
                section_data = self._parse_element(child)
                if section_data:
                    # 根据标签类型决定是否创建新章节
                    if child.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                        # 标题标签创建新章节
                        if current_section:
                            sections.append(current_section)
                        
                        current_section = {
                            'type': 'section',
                            'level': int(child.name[1]),
                            'title': section_data['text'],
                            'content': [section_data],
                            'metadata': {
                                'tag': child.name,
                                'attributes': dict(child.attrs),
                                'styles': self._get_element_styles(child)
                            }
                        }
                    else:
                        # 其他内容添加到当前章节
                        if not current_section:
                            current_section = {
                                'type': 'section',
                                'level': 1,
                                'title': '内容',
                                'content': [],
                                'metadata': {}
                            }
                        current_section['content'].append(section_data)
        
        # 添加最后一个章节
        if current_section:
            sections.append(current_section)
        
        return sections
    
    def _parse_element(self, element):
        """解析单个元素"""
        if not isinstance(element, Tag):
            return None
        
        element_data = {
            'type': element.name,
            'text': '',
            'children': [],
            'attributes': dict(element.attrs),
            'styles': self._get_element_styles(element)
        }
        
        # 处理不同类型的元素
        if element.name in ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            element_data['text'] = self._extract_text_content(element)
            
        elif element.name in ['ul', 'ol']:
            element_data['items'] = []
            for li in element.find_all('li', recursive=False):
                item_data = {
                    'text': self._extract_text_content(li),
                    'attributes': dict(li.attrs),
                    'styles': self._get_element_styles(li)
                }
                element_data['items'].append(item_data)
                
        elif element.name == 'table':
            element_data['table_data'] = self._parse_table(element)
            
        elif element.name == 'img':
            element_data['image_info'] = self._parse_image(element)
            
        elif element.name in ['blockquote', 'pre', 'code']:
            element_data['text'] = self._extract_text_content(element)
            
        # 递归处理子元素
        for child in element.children:
            if isinstance(child, Tag):
                child_data = self._parse_element(child)
                if child_data:
                    element_data['children'].append(child_data)
        
        return element_data
    
    def _extract_text_content(self, element):
        """提取元素的文本内容"""
        # 保留基本格式
        text_parts = []
        
        for content in element.contents:
            if isinstance(content, NavigableString):
                text = str(content).strip()
                if text:
                    text_parts.append(text)
            elif isinstance(content, Tag):
                if content.name == 'br':
                    text_parts.append('\n')
                elif content.name in ['strong', 'b']:
                    text_parts.append(f"**{content.get_text()}**")
                elif content.name in ['em', 'i']:
                    text_parts.append(f"*{content.get_text()}*")
                elif content.name == 'a':
                    href = content.get('href', '')
                    text_parts.append(f"[{content.get_text()}]({href})")
                else:
                    text_parts.append(content.get_text())
        
        return ' '.join(text_parts).strip()
    
    def _parse_table(self, table):
        """解析表格"""
        table_data = {
            'headers': [],
            'rows': [],
            'caption': ''
        }
        
        # 表格标题
        caption = table.find('caption')
        if caption:
            table_data['caption'] = caption.get_text().strip()
        
        # 表头 - 先检查thead，如果没有则检查第一行是否有th元素
        thead = table.find('thead')
        if thead:
            header_row = thead.find('tr')
            if header_row:
                for th in header_row.find_all(['th', 'td']):
                    table_data['headers'].append({
                        'text': th.get_text().strip(),
                        'attributes': dict(th.attrs),
                        'styles': self._get_element_styles(th)
                    })
        else:
            # 如果没有thead，检查第一行是否有th元素
            first_row = table.find('tr')
            if first_row and first_row.find('th'):
                for th in first_row.find_all(['th', 'td']):
                    table_data['headers'].append({
                        'text': th.get_text().strip(),
                        'attributes': dict(th.attrs),
                        'styles': self._get_element_styles(th)
                    })
        
        # 表格行
        tbody = table.find('tbody') or table
        rows = tbody.find_all('tr')
        
        # 如果第一行是表头，跳过它
        start_index = 0
        if not thead and rows and rows[0].find('th'):
            start_index = 1
            
        for tr in rows[start_index:]:
            row_data = []
            for td in tr.find_all(['td', 'th']):
                cell_data = {
                    'text': td.get_text().strip(),
                    'attributes': dict(td.attrs),
                    'styles': self._get_element_styles(td)
                }
                row_data.append(cell_data)
            if row_data:
                table_data['rows'].append(row_data)
        
        return table_data
    
    def _parse_image(self, img):
        """解析图片信息"""
        src = img.get('src', '')
        alt = img.get('alt', '')
        title = img.get('title', '')
        
        image_info = {
            'src': src,
            'alt': alt,
            'title': title,
            'attributes': dict(img.attrs),
            'styles': self._get_element_styles(img),
            'local_path': None
        }
        
        # 处理图片URL
        if src:
            if src.startswith('data:'):
                # Base64编码的图片
                image_info['local_path'] = self._save_base64_image(src, alt or 'image')
            elif src.startswith(('http://', 'https://')):
                # 网络图片
                image_info['local_path'] = self._download_image(src, alt or 'image')
            else:
                # 相对路径图片
                full_url = urljoin(self.base_url, src)
                image_info['local_path'] = self._download_image(full_url, alt or 'image')
        
        return image_info
    
    def _get_element_styles(self, element):
        """获取元素的样式信息"""
        styles = {}
        
        # 内联样式
        style_attr = element.get('style')
        if style_attr:
            try:
                inline_styles = cssutils.parseStyle(style_attr)
                for prop in inline_styles:
                    styles[prop.name] = prop.value
            except Exception as e:
                logger.warning(f"解析内联样式失败: {e}")
        
        # 类样式
        classes = element.get('class', [])
        for class_name in classes:
            class_selector = f".{class_name}"
            if class_selector in self.styles:
                styles.update(self.styles[class_selector])
        
        # ID样式
        element_id = element.get('id')
        if element_id:
            id_selector = f"#{element_id}"
            if id_selector in self.styles:
                styles.update(self.styles[id_selector])
        
        # 标签样式
        tag_selector = element.name
        if tag_selector in self.styles:
            styles.update(self.styles[tag_selector])
        
        return styles
    
    def _save_base64_image(self, data_url, filename):
        """保存Base64编码的图片"""
        try:
            # 解析data URL
            header, data = data_url.split(',', 1)
            mime_type = header.split(';')[0].split(':')[1]
            
            # 确定文件扩展名
            ext = mime_type.split('/')[-1]
            if ext == 'jpeg':
                ext = 'jpg'
            
            # 解码并保存
            image_data = base64.b64decode(data)
            image_path = f"images/{filename}.{ext}"
            
            os.makedirs('images', exist_ok=True)
            with open(image_path, 'wb') as f:
                f.write(image_data)
            
            return image_path
            
        except Exception as e:
            logger.error(f"保存Base64图片失败: {e}")
            return None
    
    def _download_image(self, url, filename):
        """下载网络图片"""
        if not self.config.get('image_processing', {}).get('download_external', True):
            return None
        
        try:
            response = requests.get(url, timeout=10, stream=True)
            if response.status_code == 200:
                # 确定文件扩展名
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    ext = content_type.split('/')[-1]
                    if ext == 'jpeg':
                        ext = 'jpg'
                else:
                    ext = 'jpg'  # 默认扩展名
                
                # 保存图片
                image_path = f"images/{filename}.{ext}"
                os.makedirs('images', exist_ok=True)
                
                with open(image_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                return image_path
                
        except Exception as e:
            logger.error(f"下载图片失败 {url}: {e}")
            return None
    
    def _process_images(self, soup):
        """处理文档中的所有图片"""
        img_tags = soup.find_all('img')
        for img in img_tags:
            image_info = self._parse_image(img)
            if image_info:
                self.images.append(image_info)