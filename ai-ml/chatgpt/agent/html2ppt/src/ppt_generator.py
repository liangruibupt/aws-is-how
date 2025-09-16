"""
PPT生成器 - 根据分析结果生成PowerPoint演示文稿
"""

import os
import logging
from datetime import datetime
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_THEME_COLOR
from PIL import Image
import re

try:
    from .style_mapper import StyleMapper
    from .template_manager import TemplateManager
except ImportError:
    # Handle direct execution or testing
    from style_mapper import StyleMapper
    from template_manager import TemplateManager

logger = logging.getLogger(__name__)

class PPTGenerator:
    """PowerPoint生成器"""
    
    def __init__(self, config=None):
        self.config = config or {}
        self.ppt_config = self.config.get('ppt_generation', {})
        self.layout_config = self.config.get('layout_settings', {})
        
        self.presentation = None
        self.style_mapper = StyleMapper(config)
        self.template_manager = TemplateManager(config)
        
        # 统计信息
        self.stats = {
            'slides': 0,
            'images': 0,
            'text_blocks': 0,
            'tables': 0
        }
    
    def set_template(self, template_path):
        """设置PPT模版"""
        self.template_manager.load_template(template_path)
    
    def create_presentation(self, analyzed_content, output_path):
        """创建PowerPoint演示文稿"""
        try:
            # 初始化演示文稿
            self._initialize_presentation()
            
            # 获取PPT结构
            ppt_structure = analyzed_content.get('ppt_structure', {})
            slide_plan = ppt_structure.get('slide_plan', [])
            
            if not slide_plan:
                logger.warning("没有找到幻灯片计划，使用默认结构")
                slide_plan = self._create_default_slide_plan(analyzed_content)
            
            # 生成幻灯片
            for slide_info in slide_plan:
                self._create_slide(slide_info, analyzed_content)
            
            # 应用设计建议
            design_suggestions = ppt_structure.get('design_suggestions', {})
            self._apply_design_suggestions(design_suggestions)
            
            # 保存演示文稿
            self._save_presentation(output_path, analyzed_content)
            
            logger.info(f"成功生成PPT: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"生成PPT失败: {e}")
            return False
    
    def _initialize_presentation(self):
        """初始化演示文稿"""
        template_path = self.template_manager.get_template_path()
        
        if template_path and os.path.exists(template_path):
            self.presentation = Presentation(template_path)
            logger.info(f"使用模版: {template_path}")
        else:
            self.presentation = Presentation()
            logger.info("使用默认模版")
        
        # 设置幻灯片尺寸
        slide_width = self.layout_config.get('slide_width', 10)
        slide_height = self.layout_config.get('slide_height', 7.5)
        
        self.presentation.slide_width = Inches(slide_width)
        self.presentation.slide_height = Inches(slide_height)
    
    def _create_default_slide_plan(self, analyzed_content):
        """创建默认幻灯片计划"""
        slide_plan = []
        
        # 标题页
        doc_info = analyzed_content.get('document_info', {})
        slide_plan.append({
            'slide_number': 1,
            'type': 'title',
            'title': doc_info.get('title', '演示文稿'),
            'content': '基于HTML文档自动生成',
            'layout': 'title_slide'
        })
        
        # 内容页
        sections = analyzed_content.get('sections', [])
        for i, section in enumerate(sections):
            slide_plan.append({
                'slide_number': i + 2,
                'type': 'content',
                'title': section.get('title', f'章节 {i+1}'),
                'content': section.get('content', []),
                'layout': 'content_slide',
                'source_section': i
            })
        
        return slide_plan
    
    def _create_slide(self, slide_info, analyzed_content):
        """创建单张幻灯片"""
        slide_type = slide_info.get('type', 'content')
        
        if slide_type == 'title':
            self._create_title_slide(slide_info)
        elif slide_type == 'content':
            self._create_content_slide(slide_info, analyzed_content)
        elif slide_type == 'section':
            self._create_section_slide(slide_info)
        
        self.stats['slides'] += 1
    
    def _create_title_slide(self, slide_info):
        """创建标题幻灯片"""
        # 使用标题布局
        slide_layout = self.presentation.slide_layouts[0]  # 通常是标题布局
        slide = self.presentation.slides.add_slide(slide_layout)
        
        # 设置标题
        title = slide_info.get('title', '演示文稿')
        if slide.shapes.title:
            slide.shapes.title.text = title
            self._format_title_text(slide.shapes.title)
        
        # 设置副标题 - 更安全的方式
        subtitle = slide_info.get('content', '')
        subtitle_placeholder = None
        
        # 查找副标题占位符
        for placeholder in slide.placeholders:
            if placeholder.placeholder_format.type == 4:  # 副标题占位符 (SUBTITLE)
                subtitle_placeholder = placeholder
                break
        
        if subtitle_placeholder and subtitle:
            subtitle_placeholder.text = subtitle
            self._format_subtitle_text(subtitle_placeholder)
        elif subtitle:
            # 如果没有副标题占位符，创建文本框
            self._add_subtitle_textbox(slide, subtitle)
        
        # 添加生成时间到页脚
        timestamp = datetime.now().strftime("%Y年%m月%d日")
        self._add_footer_text(slide, f"生成时间: {timestamp}")
    
    def _add_subtitle_textbox(self, slide, subtitle):
        """添加副标题文本框"""
        # 在标题下方添加副标题
        left = Inches(1)
        top = Inches(3)
        width = Inches(8)
        height = Inches(1)
        
        textbox = slide.shapes.add_textbox(left, top, width, height)
        text_frame = textbox.text_frame
        text_frame.text = subtitle
        
        # 设置副标题样式
        paragraph = text_frame.paragraphs[0]
        paragraph.alignment = PP_ALIGN.CENTER
        for run in paragraph.runs:
            run.font.size = Pt(18)
            run.font.color.theme_color = MSO_THEME_COLOR.ACCENT_2
    
    def _create_content_slide(self, slide_info, analyzed_content):
        """创建内容幻灯片"""
        content = slide_info.get('content', [])
        layout_type = self._determine_best_layout(content, slide_info.get('layout', 'content_slide'))
        
        # 选择合适的布局
        slide_layout = self._select_slide_layout(layout_type)
        slide = self.presentation.slides.add_slide(slide_layout)
        
        # 设置标题
        title = slide_info.get('title', '')
        if slide.shapes.title:
            slide.shapes.title.text = title
            self._format_heading_text(slide.shapes.title)
        
        # 添加内容
        self._add_slide_content(slide, content, analyzed_content)
        
        # 添加备注
        self._add_slide_notes(slide, slide_info, analyzed_content)
    
    def _determine_best_layout(self, content, suggested_layout):
        """根据内容确定最佳布局"""
        if not content:
            return 'content_slide'
        
        # 分析内容类型
        has_table = any(item.get('type') == 'table' for item in content)
        has_image = any(item.get('type') == 'img' for item in content)
        has_list = any(item.get('type') in ['ul', 'ol'] for item in content)
        content_count = len(content)
        
        # 根据内容特征选择布局
        if has_table:
            return 'content_slide'  # 表格用标准内容布局
        elif has_image and content_count <= 2:
            return 'content_slide'  # 图片内容用标准布局
        elif has_list and content_count <= 3:
            return 'content_slide'  # 列表用标准布局
        elif content_count == 1:
            return 'content_slide'
        else:
            return suggested_layout
    
    def _create_section_slide(self, slide_info):
        """创建章节分隔幻灯片"""
        slide_layout = self.presentation.slide_layouts[2]  # 通常是章节标题布局
        slide = self.presentation.slides.add_slide(slide_layout)
        
        title = slide_info.get('title', '章节')
        if slide.shapes.title:
            slide.shapes.title.text = title
            self._format_section_title_text(slide.shapes.title)
    
    def _select_slide_layout(self, layout_type):
        """选择幻灯片布局"""
        layout_mapping = {
            'title_slide': 0,
            'content_slide': 1,
            'section_slide': 2,
            'image_focus': 6,
            'table_layout': 4,
            'bullet_points': 1,
            'single_content': 5,
            'multi_content': 1,
            'content_heavy': 1
        }
        
        layout_index = layout_mapping.get(layout_type, 1)
        
        # 确保布局索引有效
        if layout_index >= len(self.presentation.slide_layouts):
            layout_index = 1
        
        return self.presentation.slide_layouts[layout_index]
    
    def _add_slide_content(self, slide, content, analyzed_content):
        """添加幻灯片内容"""
        if not content:
            return
        
        # 尝试使用内容占位符
        content_placeholder = self._find_content_placeholder(slide)
        
        if content_placeholder and self._can_use_placeholder(content):
            # 使用占位符添加内容
            self._add_content_to_placeholder(content_placeholder, content)
        else:
            # 使用自定义布局添加内容
            self._add_content_with_custom_layout(slide, content)
    
    def _find_content_placeholder(self, slide):
        """查找内容占位符"""
        for placeholder in slide.placeholders:
            # 内容占位符类型通常是2或7
            if placeholder.placeholder_format.type in [2, 7]:
                return placeholder
        return None
    
    def _can_use_placeholder(self, content):
        """判断是否可以使用占位符"""
        # 如果内容主要是文本和列表，可以使用占位符
        text_types = ['p', 'div', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        for item in content:
            if item.get('type') not in text_types:
                return False
        return len(content) <= 5  # 内容不太多时使用占位符
    
    def _add_content_to_placeholder(self, placeholder, content):
        """向占位符添加内容"""
        if not placeholder.has_text_frame:
            return
        
        text_frame = placeholder.text_frame
        text_frame.clear()
        
        # 添加内容到占位符
        paragraph_index = 0
        
        for i, item in enumerate(content):
            item_type = item.get('type', '')
            text = item.get('text', '').strip()
            
            # 跳过空内容，但不跳过列表（列表没有直接文本）
            if not text and item_type not in ['ul', 'ol']:
                continue
            
            if item_type in ['ul', 'ol']:
                # 处理列表
                items = item.get('items', [])
                for j, list_item in enumerate(items):
                    list_text = list_item.get('text', '').strip()
                    if list_text:
                        if paragraph_index == 0:
                            p = text_frame.paragraphs[0]
                        else:
                            p = text_frame.add_paragraph()
                        
                        p.text = f"• {list_text}"
                        p.level = 0
                        
                        # 设置列表样式
                        for run in p.runs:
                            run.font.size = Pt(14)
                        
                        paragraph_index += 1
            elif item_type in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                # 处理标题
                if paragraph_index == 0:
                    p = text_frame.paragraphs[0]
                else:
                    p = text_frame.add_paragraph()
                
                p.text = text
                p.level = 0
                
                # 设置标题样式
                for run in p.runs:
                    run.font.bold = True
                    level = int(item_type[1])
                    if level <= 2:
                        run.font.size = Pt(18)
                    else:
                        run.font.size = Pt(16)
                
                paragraph_index += 1
            else:
                # 处理普通段落
                if paragraph_index == 0:
                    p = text_frame.paragraphs[0]
                else:
                    p = text_frame.add_paragraph()
                
                p.text = text
                p.level = 0
                
                paragraph_index += 1
            
            # 应用样式
            styles = item.get('styles', {})
            self.style_mapper.apply_text_styles(p, styles)
    
    def _add_content_with_custom_layout(self, slide, content):
        """使用自定义布局添加内容"""
        margins = self.layout_config.get('margins', {})
        slide_width = self.layout_config.get('slide_width', 10)
        slide_height = self.layout_config.get('slide_height', 7.5)
        
        # 计算可用区域
        left_margin = margins.get('left', 0.5)
        top_margin = margins.get('top', 1.5)  # 为标题留出空间
        right_margin = margins.get('right', 0.5)
        bottom_margin = margins.get('bottom', 0.5)
        
        available_width = slide_width - left_margin - right_margin
        available_height = slide_height - top_margin - bottom_margin
        
        current_y = top_margin
        
        for item in content:
            if current_y >= slide_height - bottom_margin:
                break  # 空间不足，停止添加
            
            item_type = item.get('type', '')
            
            if item_type in ['p', 'div']:
                height = self._add_paragraph_content_at_position(slide, item, left_margin, current_y, available_width)
                current_y += height + 0.1  # 添加间距
            elif item_type in ['ul', 'ol']:
                height = self._add_list_content_at_position(slide, item, left_margin, current_y, available_width)
                current_y += height + 0.1
            elif item_type == 'table':
                height = self._add_table_content_at_position(slide, item, left_margin, current_y, available_width)
                current_y += height + 0.2
            elif item_type == 'img':
                height = self._add_image_content_at_position(slide, item, left_margin, current_y, available_width)
                current_y += height + 0.2
            elif item_type in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                height = self._add_heading_content_at_position(slide, item, left_margin, current_y, available_width)
                current_y += height + 0.1
            elif item_type in ['blockquote', 'pre', 'code']:
                height = self._add_code_content_at_position(slide, item, left_margin, current_y, available_width)
                current_y += height + 0.1
    
    def _create_content_textbox(self, slide):
        """创建内容文本框"""
        margins = self.layout_config.get('margins', {})
        left = Inches(margins.get('left', 0.5))
        top = Inches(margins.get('top', 1.5))
        width = Inches(self.layout_config.get('slide_width', 10) - margins.get('left', 0.5) - margins.get('right', 0.5))
        height = Inches(self.layout_config.get('slide_height', 7.5) - margins.get('top', 1.5) - margins.get('bottom', 0.5))
        
        textbox = slide.shapes.add_textbox(left, top, width, height)
        return textbox
    
    def _add_paragraph_content_at_position(self, slide, item, left, top, width):
        """在指定位置添加段落内容"""
        text = item.get('text', '').strip()
        if not text:
            return 0
        
        # 估算文本高度（更准确的估算）
        lines = max(1, len(text) // 80)  # 假设每行80个字符
        text_height = max(0.3, lines * 0.25)  # 每行约0.25英寸
        
        textbox = slide.shapes.add_textbox(
            Inches(left), Inches(top), 
            Inches(width), Inches(text_height)
        )
        text_frame = textbox.text_frame
        text_frame.text = text
        text_frame.word_wrap = True
        text_frame.auto_size = MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT
        
        # 应用样式
        styles = item.get('styles', {})
        self.style_mapper.apply_text_styles(text_frame.paragraphs[0], styles)
        
        self.stats['text_blocks'] += 1
        return text_height
    
    def _add_list_content_at_position(self, slide, item, left, top, width):
        """在指定位置添加列表内容"""
        items = item.get('items', [])
        if not items:
            return 0
        
        # 估算列表高度
        list_height = max(0.5, len(items) * 0.25)
        
        textbox = slide.shapes.add_textbox(
            Inches(left), Inches(top), 
            Inches(width), Inches(list_height)
        )
        text_frame = textbox.text_frame
        text_frame.clear()
        text_frame.word_wrap = True
        
        # 添加列表项
        for i, list_item in enumerate(items):
            item_text = list_item.get('text', '').strip()
            if item_text:
                p = text_frame.paragraphs[0] if i == 0 else text_frame.add_paragraph()
                p.text = f"• {item_text}"
                p.level = 0
                
                # 设置列表样式
                for run in p.runs:
                    run.font.size = Pt(14)
                
                # 应用自定义样式
                styles = list_item.get('styles', {})
                self.style_mapper.apply_text_styles(p, styles)
        
        self.stats['text_blocks'] += 1
        return list_height
    
    def _add_table_content(self, slide, item, y_offset):
        """添加表格内容"""
        table_data = item.get('table_data', {})
        if not table_data:
            return 0
        
        headers = table_data.get('headers', [])
        rows = table_data.get('rows', [])
        
        if not rows:
            return 0
        
        # 计算表格尺寸
        row_count = len(rows) + (1 if headers else 0)
        col_count = max(len(row) for row in rows) if rows else 1
        
        margins = self.layout_config.get('margins', {})
        left = Inches(margins.get('left', 0.5))
        top = Inches(margins.get('top', 1.5) + y_offset)
        width = Inches(self.layout_config.get('slide_width', 10) - margins.get('left', 0.5) - margins.get('right', 0.5))
        height = Inches(min(4.0, row_count * 0.4))
        
        # 创建表格
        table_shape = slide.shapes.add_table(row_count, col_count, left, top, width, height)
        table = table_shape.table
        
        # 添加表头
        current_row = 0
        if headers:
            for col, header in enumerate(headers):
                if col < col_count:
                    cell = table.cell(current_row, col)
                    cell.text = header.get('text', '')
                    # 表头样式
                    self._format_table_header_cell(cell)
            current_row += 1
        
        # 添加数据行
        for row_data in rows:
            if current_row < row_count:
                for col, cell_data in enumerate(row_data):
                    if col < col_count:
                        cell = table.cell(current_row, col)
                        cell.text = cell_data.get('text', '')
                        # 数据单元格样式
                        self._format_table_data_cell(cell)
                current_row += 1
        
        self.stats['tables'] += 1
        return height.inches
    
    def _add_image_content(self, slide, item, y_offset):
        """添加图片内容"""
        image_info = item.get('image_info', {})
        if not image_info:
            return 0
        
        local_path = image_info.get('local_path')
        if not local_path or not os.path.exists(local_path):
            # 如果图片不存在，添加占位符
            return self._add_image_placeholder(slide, image_info, y_offset)
        
        try:
            # 获取图片信息
            with Image.open(local_path) as img:
                img_width, img_height = img.size
            
            # 计算合适的显示尺寸
            max_width = self.layout_config.get('slide_width', 10) * 0.8
            max_height = (self.layout_config.get('slide_height', 7.5) - 2) * 0.6
            
            # 保持宽高比
            aspect_ratio = img_width / img_height
            if max_width / aspect_ratio <= max_height:
                display_width = max_width
                display_height = max_width / aspect_ratio
            else:
                display_height = max_height
                display_width = max_height * aspect_ratio
            
            # 居中放置
            margins = self.layout_config.get('margins', {})
            left = Inches((self.layout_config.get('slide_width', 10) - display_width) / 2)
            top = Inches(margins.get('top', 1.5) + y_offset)
            
            # 添加图片
            slide.shapes.add_picture(local_path, left, top, Inches(display_width), Inches(display_height))
            
            # 添加图片说明
            alt_text = image_info.get('alt', '') or image_info.get('title', '')
            if alt_text:
                caption_top = top + Inches(display_height) + Inches(0.1)
                caption_textbox = slide.shapes.add_textbox(
                    left, caption_top, Inches(display_width), Inches(0.3)
                )
                caption_textbox.text_frame.text = alt_text
                caption_textbox.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
                
                # 设置说明文字样式
                for run in caption_textbox.text_frame.paragraphs[0].runs:
                    run.font.size = Pt(10)
                    run.font.color.rgb = RGBColor(128, 128, 128)
            
            self.stats['images'] += 1
            return display_height + 0.5  # 包括说明文字的高度
            
        except Exception as e:
            logger.error(f"添加图片失败 {local_path}: {e}")
            return self._add_image_placeholder(slide, image_info, y_offset)
    
    def _add_image_placeholder(self, slide, image_info, y_offset):
        """添加图片占位符"""
        margins = self.layout_config.get('margins', {})
        left = Inches(margins.get('left', 0.5))
        top = Inches(margins.get('top', 1.5) + y_offset)
        width = Inches(4)
        height = Inches(2)
        
        # 创建占位符形状
        placeholder = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, left, top, width, height
        )
        
        # 设置占位符样式
        placeholder.fill.solid()
        placeholder.fill.fore_color.rgb = RGBColor(240, 240, 240)
        placeholder.line.color.rgb = RGBColor(200, 200, 200)
        
        # 添加占位符文字
        placeholder.text_frame.text = f"图片: {image_info.get('alt', '无法加载')}"
        placeholder.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
        
        return 2.5
    
    def _add_heading_content(self, slide, item, y_offset):
        """添加标题内容"""
        text = item.get('text', '').strip()
        if not text:
            return 0
        
        margins = self.layout_config.get('margins', {})
        left = Inches(margins.get('left', 0.5))
        top = Inches(margins.get('top', 1.5) + y_offset)
        width = Inches(self.layout_config.get('slide_width', 10) - margins.get('left', 0.5) - margins.get('right', 0.5))
        height = Inches(0.8)
        
        textbox = slide.shapes.add_textbox(left, top, width, height)
        text_frame = textbox.text_frame
        text_frame.text = text
        
        # 根据标题级别设置样式
        heading_level = int(item.get('type', 'h3')[1])  # 提取数字
        self._format_heading_by_level(text_frame.paragraphs[0], heading_level)
        
        # 应用自定义样式
        styles = item.get('styles', {})
        self.style_mapper.apply_text_styles(text_frame.paragraphs[0], styles)
        
        self.stats['text_blocks'] += 1
        return 0.8
    
    def _add_code_content(self, slide, item, y_offset):
        """添加代码内容"""
        text = item.get('text', '').strip()
        if not text:
            return 0
        
        margins = self.layout_config.get('margins', {})
        left = Inches(margins.get('left', 0.5))
        top = Inches(margins.get('top', 1.5) + y_offset)
        width = Inches(self.layout_config.get('slide_width', 10) - margins.get('left', 0.5) - margins.get('right', 0.5))
        
        # 估算代码块高度
        lines = text.split('\n')
        code_height = max(0.5, len(lines) * 0.2)
        height = Inches(code_height)
        
        textbox = slide.shapes.add_textbox(left, top, width, height)
        text_frame = textbox.text_frame
        text_frame.text = text
        
        # 代码样式
        paragraph = text_frame.paragraphs[0]
        for run in paragraph.runs:
            run.font.name = 'Consolas'
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0, 0, 0)
        
        # 设置背景色
        textbox.fill.solid()
        textbox.fill.fore_color.rgb = RGBColor(248, 248, 248)
        textbox.line.color.rgb = RGBColor(200, 200, 200)
        
        self.stats['text_blocks'] += 1
        return code_height
    
    def _format_title_text(self, title_shape):
        """格式化标题文本"""
        if not title_shape.has_text_frame:
            return
        
        paragraph = title_shape.text_frame.paragraphs[0]
        for run in paragraph.runs:
            run.font.size = Pt(36)
            run.font.bold = True
            run.font.color.theme_color = MSO_THEME_COLOR.ACCENT_1
    
    def _format_subtitle_text(self, subtitle_shape):
        """格式化副标题文本"""
        if not subtitle_shape.has_text_frame:
            return
        
        paragraph = subtitle_shape.text_frame.paragraphs[0]
        for run in paragraph.runs:
            run.font.size = Pt(18)
            run.font.color.theme_color = MSO_THEME_COLOR.ACCENT_2
    
    def _format_heading_text(self, heading_shape):
        """格式化标题文本"""
        if not heading_shape.has_text_frame:
            return
        
        paragraph = heading_shape.text_frame.paragraphs[0]
        for run in paragraph.runs:
            run.font.size = Pt(24)
            run.font.bold = True
            run.font.color.theme_color = MSO_THEME_COLOR.ACCENT_1
    
    def _format_section_title_text(self, title_shape):
        """格式化章节标题文本"""
        if not title_shape.has_text_frame:
            return
        
        paragraph = title_shape.text_frame.paragraphs[0]
        paragraph.alignment = PP_ALIGN.CENTER
        for run in paragraph.runs:
            run.font.size = Pt(32)
            run.font.bold = True
            run.font.color.theme_color = MSO_THEME_COLOR.ACCENT_1
    
    def _format_heading_by_level(self, paragraph, level):
        """根据级别格式化标题"""
        size_mapping = {1: 28, 2: 24, 3: 20, 4: 18, 5: 16, 6: 14}
        font_size = size_mapping.get(level, 16)
        
        for run in paragraph.runs:
            run.font.size = Pt(font_size)
            run.font.bold = True
            if level <= 2:
                run.font.color.theme_color = MSO_THEME_COLOR.ACCENT_1
            else:
                run.font.color.theme_color = MSO_THEME_COLOR.DARK_1
    
    def _format_table_header_cell(self, cell):
        """格式化表头单元格"""
        cell.fill.solid()
        cell.fill.fore_color.theme_color = MSO_THEME_COLOR.ACCENT_1
        
        paragraph = cell.text_frame.paragraphs[0]
        paragraph.alignment = PP_ALIGN.CENTER
        for run in paragraph.runs:
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)
            run.font.size = Pt(12)
    
    def _format_table_data_cell(self, cell):
        """格式化数据单元格"""
        paragraph = cell.text_frame.paragraphs[0]
        for run in paragraph.runs:
            run.font.size = Pt(11)
            run.font.color.theme_color = MSO_THEME_COLOR.DARK_1
    
    def _add_footer_text(self, slide, text):
        """添加页脚文本"""
        margins = self.layout_config.get('margins', {})
        left = Inches(margins.get('left', 0.5))
        top = Inches(self.layout_config.get('slide_height', 7.5) - 0.5)
        width = Inches(self.layout_config.get('slide_width', 10) - margins.get('left', 0.5) - margins.get('right', 0.5))
        height = Inches(0.3)
        
        textbox = slide.shapes.add_textbox(left, top, width, height)
        text_frame = textbox.text_frame
        text_frame.text = text
        
        paragraph = text_frame.paragraphs[0]
        paragraph.alignment = PP_ALIGN.RIGHT
        for run in paragraph.runs:
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(128, 128, 128)
    
    def _add_slide_notes(self, slide, slide_info, analyzed_content):
        """添加幻灯片备注"""
        if not self.ppt_config.get('notes', {}).get('include_original_html', True):
            return
        
        notes_slide = slide.notes_slide
        notes_text_frame = notes_slide.notes_text_frame
        
        notes_content = []
        
        # 添加原始HTML信息
        if self.ppt_config.get('notes', {}).get('include_original_html', True):
            source_section = slide_info.get('source_section')
            if source_section is not None:
                sections = analyzed_content.get('sections', [])
                if source_section < len(sections):
                    section = sections[source_section]
                    notes_content.append(f"原始章节: {section.get('title', '')}")
                    
                    # 添加关键点
                    key_points = section.get('key_points', [])
                    if key_points:
                        notes_content.append("关键点:")
                        for point in key_points[:3]:  # 只添加前3个关键点
                            notes_content.append(f"- {point.get('text', '')}")
        
        # 添加元数据
        if self.ppt_config.get('notes', {}).get('include_metadata', True):
            notes_content.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            notes_content.append(f"幻灯片类型: {slide_info.get('type', 'content')}")
            notes_content.append(f"布局: {slide_info.get('layout', 'default')}")
        
        # 设置备注文本
        if notes_content:
            max_length = self.ppt_config.get('notes', {}).get('max_note_length', 1000)
            notes_text = '\n'.join(notes_content)[:max_length]
            notes_text_frame.text = notes_text
    
    def _apply_design_suggestions(self, design_suggestions):
        """应用设计建议"""
        if not design_suggestions:
            return
        
        try:
            # 应用配色方案
            color_scheme = design_suggestions.get('color_scheme', {})
            if color_scheme:
                self._apply_color_scheme(color_scheme)
            
            # 应用字体建议
            font_suggestions = design_suggestions.get('font_suggestions', {})
            if font_suggestions:
                self._apply_font_suggestions(font_suggestions)
                
        except Exception as e:
            logger.error(f"应用设计建议失败: {e}")
    
    def _apply_color_scheme(self, color_scheme):
        """应用配色方案"""
        # 这里可以实现更复杂的配色逻辑
        # 由于python-pptx的限制，主要通过模版来控制配色
        pass
    
    def _apply_font_suggestions(self, font_suggestions):
        """应用字体建议"""
        # 这里可以实现字体应用逻辑
        # 由于python-pptx的限制，主要在创建内容时应用字体
        pass
    
    def _save_presentation(self, output_path, analyzed_content):
        """保存演示文稿"""
        # 确保输出目录存在
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        
        # 设置文档属性
        doc_props = self.presentation.core_properties
        doc_props.author = self.ppt_config.get('metadata', {}).get('author', 'HTML2PPT Converter')
        doc_props.title = analyzed_content.get('document_info', {}).get('title', 'Converted Presentation')
        doc_props.subject = self.ppt_config.get('metadata', {}).get('subject', 'Auto-generated presentation')
        doc_props.created = datetime.now()
        doc_props.modified = datetime.now()
        
        # 保存文件
        self.presentation.save(output_path)
        
        logger.info(f"演示文稿已保存: {output_path}")
        logger.info(f"统计信息: {self.stats}")
    
    def get_statistics(self):
        """获取生成统计信息"""
        return self.stats.copy()
    
    def _add_heading_content_at_position(self, slide, item, left, top, width):
        """在指定位置添加标题内容"""
        text = item.get('text', '').strip()
        if not text:
            return 0
        
        height = 0.6  # 标题固定高度
        
        textbox = slide.shapes.add_textbox(
            Inches(left), Inches(top), 
            Inches(width), Inches(height)
        )
        text_frame = textbox.text_frame
        text_frame.text = text
        text_frame.word_wrap = True
        
        # 根据标题级别设置样式
        heading_level = int(item.get('type', 'h3')[1])
        paragraph = text_frame.paragraphs[0]
        self._format_heading_by_level(paragraph, heading_level)
        
        # 应用自定义样式
        styles = item.get('styles', {})
        self.style_mapper.apply_text_styles(paragraph, styles)
        
        self.stats['text_blocks'] += 1
        return height
    
    def _add_table_content_at_position(self, slide, item, left, top, width):
        """在指定位置添加表格内容"""
        table_data = item.get('table_data', {})
        if not table_data:
            return 0
        
        headers = table_data.get('headers', [])
        rows = table_data.get('rows', [])
        
        if not rows:
            return 0
        
        # 计算表格尺寸
        row_count = len(rows) + (1 if headers else 0)
        col_count = max(len(row) for row in rows) if rows else 1
        
        height = min(3.0, row_count * 0.4)  # 限制表格高度
        
        # 创建表格
        table_shape = slide.shapes.add_table(
            row_count, col_count, 
            Inches(left), Inches(top), 
            Inches(width), Inches(height)
        )
        table = table_shape.table
        
        # 添加表头
        current_row = 0
        if headers:
            for col, header in enumerate(headers):
                if col < col_count:
                    cell = table.cell(current_row, col)
                    cell.text = header.get('text', '')
                    self._format_table_header_cell(cell)
            current_row += 1
        
        # 添加数据行
        for row_data in rows:
            if current_row < row_count:
                for col, cell_data in enumerate(row_data):
                    if col < col_count:
                        cell = table.cell(current_row, col)
                        cell.text = cell_data.get('text', '')
                        self._format_table_data_cell(cell)
                current_row += 1
        
        self.stats['tables'] += 1
        return height
    
    def _add_image_content_at_position(self, slide, item, left, top, width):
        """在指定位置添加图片内容"""
        image_info = item.get('image_info', {})
        if not image_info:
            return 0
        
        local_path = image_info.get('local_path')
        if not local_path or not os.path.exists(local_path):
            return self._add_image_placeholder_at_position(slide, image_info, left, top, width)
        
        try:
            # 获取图片信息并计算尺寸
            with Image.open(local_path) as img:
                img_width, img_height = img.size
            
            # 计算合适的显示尺寸
            max_width = width * 0.8
            max_height = 3.0  # 限制图片高度
            
            # 保持宽高比
            aspect_ratio = img_width / img_height
            if max_width / aspect_ratio <= max_height:
                display_width = max_width
                display_height = max_width / aspect_ratio
            else:
                display_height = max_height
                display_width = max_height * aspect_ratio
            
            # 居中放置
            image_left = left + (width - display_width) / 2
            
            # 添加图片
            slide.shapes.add_picture(
                local_path, 
                Inches(image_left), Inches(top), 
                Inches(display_width), Inches(display_height)
            )
            
            # 添加图片说明
            alt_text = image_info.get('alt', '') or image_info.get('title', '')
            if alt_text:
                caption_top = top + display_height + 0.1
                caption_textbox = slide.shapes.add_textbox(
                    Inches(left), Inches(caption_top), 
                    Inches(width), Inches(0.3)
                )
                caption_textbox.text_frame.text = alt_text
                caption_textbox.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
                
                # 设置说明文字样式
                for run in caption_textbox.text_frame.paragraphs[0].runs:
                    run.font.size = Pt(10)
                    run.font.color.rgb = RGBColor(128, 128, 128)
            
            self.stats['images'] += 1
            return display_height + 0.5
            
        except Exception as e:
            logger.error(f"添加图片失败 {local_path}: {e}")
            return self._add_image_placeholder_at_position(slide, image_info, left, top, width)
    
    def _add_image_placeholder_at_position(self, slide, image_info, left, top, width):
        """在指定位置添加图片占位符"""
        height = 2.0
        placeholder_width = min(width, 4.0)
        placeholder_left = left + (width - placeholder_width) / 2
        
        # 创建占位符形状
        placeholder = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, 
            Inches(placeholder_left), Inches(top), 
            Inches(placeholder_width), Inches(height)
        )
        
        # 设置占位符样式
        placeholder.fill.solid()
        placeholder.fill.fore_color.rgb = RGBColor(240, 240, 240)
        placeholder.line.color.rgb = RGBColor(200, 200, 200)
        
        # 添加占位符文字
        placeholder.text_frame.text = f"图片: {image_info.get('alt', '无法加载')}"
        placeholder.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
        
        return height + 0.2
    
    def _add_code_content_at_position(self, slide, item, left, top, width):
        """在指定位置添加代码内容"""
        text = item.get('text', '').strip()
        if not text:
            return 0
        
        # 估算代码块高度
        lines = text.split('\n')
        code_height = max(0.5, len(lines) * 0.2)
        
        textbox = slide.shapes.add_textbox(
            Inches(left), Inches(top), 
            Inches(width), Inches(code_height)
        )
        text_frame = textbox.text_frame
        text_frame.text = text
        text_frame.word_wrap = True
        
        # 代码样式
        paragraph = text_frame.paragraphs[0]
        for run in paragraph.runs:
            run.font.name = 'Consolas'
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0, 0, 0)
        
        # 设置背景色
        textbox.fill.solid()
        textbox.fill.fore_color.rgb = RGBColor(248, 248, 248)
        textbox.line.color.rgb = RGBColor(200, 200, 200)
        
        self.stats['text_blocks'] += 1
        return code_height