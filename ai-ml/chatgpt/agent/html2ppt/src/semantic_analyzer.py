"""
语义分析器 - 分析HTML内容的语义结构和重要性
"""

import logging
import re
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Optional AI dependencies - gracefully handle missing packages
try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    logger.warning("OpenAI package not installed. AI semantic analysis will be disabled.")

try:
    from transformers import pipeline, AutoTokenizer, AutoModel
    import torch
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False
    logger.warning("Transformers package not installed. Local AI models will be disabled.")

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    logger.warning("NumPy not installed. Some numerical operations may be limited.")

class SemanticAnalyzer:
    """语义分析器"""
    
    def __init__(self, config=None):
        self.config = config or {}
        self.semantic_config = self.config.get('semantic_analysis', {})
        self.model_type = self.semantic_config.get('model', 'local')
        self.content_weights = self.semantic_config.get('content_weights', {})
        
        # 初始化模型
        self._initialize_model()
        
    def _initialize_model(self):
        """初始化语义分析模型"""
        if self.model_type == 'gpt-3.5-turbo' or self.model_type.startswith('gpt'):
            # 使用OpenAI模型
            if not HAS_OPENAI:
                logger.warning("OpenAI包未安装，将使用本地模型")
                self.use_openai = False
                self._initialize_local_model()
                return
                
            api_key = self.semantic_config.get('api_key')
            if api_key:
                openai.api_key = api_key
                self.use_openai = True
            else:
                logger.warning("未提供OpenAI API密钥，将使用本地模型")
                self.use_openai = False
                self._initialize_local_model()
        else:
            # 使用本地模型
            self.use_openai = False
            self._initialize_local_model()
    
    def _initialize_local_model(self):
        """初始化本地模型"""
        if not HAS_TRANSFORMERS:
            logger.warning("Transformers包未安装，将使用基础语义分析")
            self.tokenizer = None
            self.model = None
            self.sentiment_analyzer = None
            return
            
        try:
            # 使用中文BERT模型进行语义分析
            model_name = "bert-base-chinese"
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModel.from_pretrained(model_name)
            self.sentiment_analyzer = pipeline(
                "sentiment-analysis", 
                model="uer/roberta-base-finetuned-chinanews-chinese"
            )
            logger.info("本地语义分析模型初始化成功")
        except Exception as e:
            logger.warning(f"本地模型初始化失败，将使用基础分析: {e}")
            self.tokenizer = None
            self.model = None
            self.sentiment_analyzer = None
    
    def analyze(self, parsed_content):
        """分析解析后的内容"""
        try:
            analyzed_content = parsed_content.copy()
            
            # 分析文档整体结构
            analyzed_content['document_analysis'] = self._analyze_document_structure(parsed_content)
            
            # 分析各个章节
            if 'sections' in parsed_content:
                analyzed_sections = []
                for section in parsed_content['sections']:
                    analyzed_section = self._analyze_section(section)
                    analyzed_sections.append(analyzed_section)
                analyzed_content['sections'] = analyzed_sections
            
            # 生成PPT结构建议
            analyzed_content['ppt_structure'] = self._generate_ppt_structure(analyzed_content)
            
            return analyzed_content
            
        except Exception as e:
            logger.error(f"语义分析失败: {e}")
            return parsed_content
    
    def _analyze_document_structure(self, content):
        """分析文档整体结构"""
        analysis = {
            'main_topic': '',
            'key_themes': [],
            'content_flow': [],
            'importance_scores': {},
            'suggested_slides': 0
        }
        
        try:
            # 提取主题
            doc_info = content.get('document_info', {})
            title = doc_info.get('title', '')
            
            if title and title != '未命名文档':
                analysis['main_topic'] = title
            else:
                # 从内容中推断主题
                analysis['main_topic'] = self._extract_main_topic(content)
            
            # 分析内容流程
            sections = content.get('sections', [])
            analysis['content_flow'] = self._analyze_content_flow(sections)
            
            # 计算重要性分数
            analysis['importance_scores'] = self._calculate_importance_scores(sections)
            
            # 建议幻灯片数量
            analysis['suggested_slides'] = self._suggest_slide_count(sections)
            
            # 提取关键主题
            analysis['key_themes'] = self._extract_key_themes(sections)
            
        except Exception as e:
            logger.error(f"文档结构分析失败: {e}")
        
        return analysis
    
    def _analyze_section(self, section):
        """分析单个章节"""
        analyzed_section = section.copy()
        
        try:
            # 计算章节重要性
            analyzed_section['importance_score'] = self._calculate_section_importance(section)
            
            # 分析内容类型
            analyzed_section['content_types'] = self._identify_content_types(section)
            
            # 提取关键信息
            analyzed_section['key_points'] = self._extract_key_points(section)
            
            # 建议PPT布局
            analyzed_section['suggested_layout'] = self._suggest_layout(section)
            
            # 分析情感倾向（如果有情感分析器）
            if self.sentiment_analyzer:
                analyzed_section['sentiment'] = self._analyze_sentiment(section)
            
        except Exception as e:
            logger.error(f"章节分析失败: {e}")
        
        return analyzed_section
    
    def _extract_main_topic(self, content):
        """提取文档主题"""
        sections = content.get('sections', [])
        if not sections:
            return "未知主题"
        
        # 收集所有标题
        titles = []
        for section in sections:
            if section.get('title'):
                titles.append(section['title'])
        
        if not titles:
            return "未知主题"
        
        # 使用第一个标题作为主题，或者分析最常见的词汇
        if len(titles) == 1:
            return titles[0]
        
        # 简单的关键词提取
        all_text = ' '.join(titles)
        words = re.findall(r'\b\w+\b', all_text)
        word_freq = {}
        for word in words:
            if len(word) > 1:  # 忽略单字符
                word_freq[word] = word_freq.get(word, 0) + 1
        
        if word_freq:
            most_common = max(word_freq, key=word_freq.get)
            return most_common
        
        return titles[0]
    
    def _analyze_content_flow(self, sections):
        """分析内容流程"""
        flow = []
        
        for i, section in enumerate(sections):
            flow_item = {
                'index': i,
                'title': section.get('title', f'章节 {i+1}'),
                'level': section.get('level', 1),
                'content_length': len(section.get('content', [])),
                'flow_type': self._determine_flow_type(section, i, len(sections))
            }
            flow.append(flow_item)
        
        return flow
    
    def _determine_flow_type(self, section, index, total_sections):
        """确定内容流程类型"""
        if index == 0:
            return 'introduction'
        elif index == total_sections - 1:
            return 'conclusion'
        elif section.get('level', 1) <= 2:
            return 'main_point'
        else:
            return 'supporting_detail'
    
    def _calculate_importance_scores(self, sections):
        """计算重要性分数"""
        scores = {}
        
        for i, section in enumerate(sections):
            score = 0.0
            
            # 基于位置的权重
            if i == 0:  # 开头
                score += 0.3
            elif i == len(sections) - 1:  # 结尾
                score += 0.2
            
            # 基于标题级别的权重
            level = section.get('level', 1)
            score += (6 - level) * 0.1  # h1最高分，h6最低分
            
            # 基于内容长度的权重
            content_length = len(section.get('content', []))
            if content_length > 5:
                score += 0.2
            elif content_length > 2:
                score += 0.1
            
            # 基于内容类型的权重
            content_types = self._identify_content_types(section)
            for content_type in content_types:
                weight = self.content_weights.get(content_type, 0.1)
                score += weight
            
            scores[f'section_{i}'] = min(score, 1.0)  # 限制最大值为1.0
        
        return scores
    
    def _calculate_section_importance(self, section):
        """计算单个章节的重要性"""
        score = 0.0
        
        # 标题权重
        level = section.get('level', 1)
        score += (6 - level) * 0.2
        
        # 内容数量权重
        content_count = len(section.get('content', []))
        score += min(content_count * 0.1, 0.5)
        
        # 内容类型权重
        content_types = self._identify_content_types(section)
        for content_type in content_types:
            weight = self.content_weights.get(content_type, 0.1)
            score += weight
        
        return min(score, 1.0)
    
    def _identify_content_types(self, section):
        """识别内容类型"""
        types = set()
        
        content = section.get('content', [])
        for item in content:
            item_type = item.get('type', '')
            
            if item_type in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                types.add('heading')
            elif item_type == 'p':
                types.add('paragraph')
            elif item_type in ['ul', 'ol']:
                types.add('list')
            elif item_type == 'img':
                types.add('image')
            elif item_type == 'table':
                types.add('table')
            elif item_type in ['blockquote', 'pre', 'code']:
                types.add('code')
        
        return list(types)
    
    def _extract_key_points(self, section):
        """提取关键点"""
        key_points = []
        
        content = section.get('content', [])
        for item in content:
            if item.get('type') in ['ul', 'ol']:
                # 列表项作为关键点
                items = item.get('items', [])
                for list_item in items:
                    text = list_item.get('text', '').strip()
                    if text and len(text) > 10:  # 过滤太短的内容
                        key_points.append({
                            'text': text,
                            'type': 'list_item',
                            'importance': 0.7
                        })
            
            elif item.get('type') == 'p':
                # 段落中的重要句子
                text = item.get('text', '').strip()
                if text:
                    sentences = self._split_sentences(text)
                    for sentence in sentences:
                        if self._is_important_sentence(sentence):
                            key_points.append({
                                'text': sentence,
                                'type': 'key_sentence',
                                'importance': 0.6
                            })
        
        # 按重要性排序
        key_points.sort(key=lambda x: x['importance'], reverse=True)
        
        return key_points[:5]  # 返回前5个关键点
    
    def _split_sentences(self, text):
        """分割句子"""
        # 简单的中文句子分割
        sentences = re.split(r'[。！？；]', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _is_important_sentence(self, sentence):
        """判断句子是否重要"""
        # 简单的重要性判断规则
        important_patterns = [
            r'重要|关键|核心|主要|首先|其次|最后|总之|因此|所以',
            r'必须|应该|需要|建议|推荐',
            r'优势|特点|特色|亮点|创新',
            r'问题|挑战|困难|风险',
            r'解决|方案|策略|方法|措施'
        ]
        
        for pattern in important_patterns:
            if re.search(pattern, sentence):
                return True
        
        # 长度判断
        return 20 <= len(sentence) <= 100
    
    def _suggest_layout(self, section):
        """建议PPT布局"""
        content_types = self._identify_content_types(section)
        content_count = len(section.get('content', []))
        
        # 根据内容类型和数量建议布局
        if 'image' in content_types and content_count <= 3:
            return 'image_focus'
        elif 'table' in content_types:
            return 'table_layout'
        elif 'list' in content_types:
            return 'bullet_points'
        elif content_count == 1:
            return 'single_content'
        elif content_count <= 3:
            return 'multi_content'
        else:
            return 'content_heavy'
    
    def _analyze_sentiment(self, section):
        """分析情感倾向"""
        if not self.sentiment_analyzer:
            return None
        
        try:
            # 收集文本内容
            texts = []
            content = section.get('content', [])
            
            for item in content:
                text = item.get('text', '').strip()
                if text:
                    texts.append(text)
            
            if not texts:
                return None
            
            # 分析情感
            combined_text = ' '.join(texts)[:512]  # 限制长度
            result = self.sentiment_analyzer(combined_text)
            
            return {
                'label': result[0]['label'],
                'score': result[0]['score']
            }
            
        except Exception as e:
            logger.error(f"情感分析失败: {e}")
            return None
    
    def _suggest_slide_count(self, sections):
        """建议幻灯片数量"""
        base_count = len(sections)
        
        # 根据内容复杂度调整
        complex_sections = 0
        for section in sections:
            content_count = len(section.get('content', []))
            if content_count > 3:
                complex_sections += 1
        
        # 复杂章节可能需要多张幻灯片
        additional_slides = complex_sections // 2
        
        return base_count + additional_slides + 1  # +1 for title slide
    
    def _extract_key_themes(self, sections):
        """提取关键主题"""
        themes = []
        
        # 收集所有文本
        all_text = []
        for section in sections:
            if section.get('title'):
                all_text.append(section['title'])
            
            content = section.get('content', [])
            for item in content:
                text = item.get('text', '').strip()
                if text:
                    all_text.append(text)
        
        # 简单的关键词提取
        combined_text = ' '.join(all_text)
        words = re.findall(r'\b[\u4e00-\u9fff]+\b', combined_text)  # 中文词汇
        
        word_freq = {}
        for word in words:
            if len(word) >= 2:  # 至少2个字符
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # 排序并返回前10个主题
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        themes = [word for word, freq in sorted_words[:10] if freq > 1]
        
        return themes
    
    def _generate_ppt_structure(self, analyzed_content):
        """生成PPT结构建议"""
        structure = {
            'total_slides': 0,
            'slide_plan': [],
            'design_suggestions': {}
        }
        
        try:
            doc_analysis = analyzed_content.get('document_analysis', {})
            sections = analyzed_content.get('sections', [])
            
            # 标题页
            structure['slide_plan'].append({
                'slide_number': 1,
                'type': 'title',
                'title': doc_analysis.get('main_topic', '演示文稿'),
                'content': '基于HTML文档自动生成',
                'layout': 'title_slide'
            })
            
            slide_number = 2
            
            # 智能合并内容页
            i = 0
            while i < len(sections):
                section = sections[i]
                importance = section.get('importance_score', 0.5)
                content_types = section.get('content_types', [])
                suggested_layout = section.get('suggested_layout', 'single_content')
                content_count = len(section.get('content', []))
                
                # 计算内容权重
                content_weight = self._calculate_section_weight(section)
                
                # 如果内容很少且不是很重要，尝试与下一个章节合并
                if (content_weight < 2 and importance < 0.7 and 
                    i + 1 < len(sections) and 
                    'table' not in content_types and 'image' not in content_types):
                    
                    next_section = sections[i + 1]
                    next_weight = self._calculate_section_weight(next_section)
                    next_types = next_section.get('content_types', [])
                    
                    # 如果合并后的内容量合适，就合并
                    if (content_weight + next_weight <= 6 and 
                        'table' not in next_types and 'image' not in next_types):
                        
                        combined_content = section.get('content', []) + next_section.get('content', [])
                        combined_title = section.get('title', f'章节 {i+1}')
                        
                        structure['slide_plan'].append({
                            'slide_number': slide_number,
                            'type': 'content',
                            'title': combined_title,
                            'content': combined_content,
                            'layout': suggested_layout,
                            'source_section': i
                        })
                        
                        slide_number += 1
                        i += 2  # 跳过下一个章节
                        continue
                
                # 如果内容很多，分割成多个幻灯片
                if content_count > 6 or content_weight > 10:
                    chunks = self._split_content_into_chunks(section['content'])
                    for j, chunk in enumerate(chunks):
                        structure['slide_plan'].append({
                            'slide_number': slide_number,
                            'type': 'content',
                            'title': section.get('title', f'章节 {i+1}') + (f' ({j+1})' if len(chunks) > 1 else ''),
                            'content': chunk,
                            'layout': suggested_layout,
                            'source_section': i
                        })
                        slide_number += 1
                else:
                    # 创建单独的幻灯片（只有当内容不为空时）
                    if content_weight > 0:
                        structure['slide_plan'].append({
                            'slide_number': slide_number,
                            'type': 'content',
                            'title': section.get('title', f'章节 {i+1}'),
                            'content': section.get('content', []),
                            'layout': suggested_layout,
                            'source_section': i
                        })
                        slide_number += 1
                
                i += 1
            
            structure['total_slides'] = slide_number - 1
            
            # 设计建议
            structure['design_suggestions'] = {
                'color_scheme': self._suggest_color_scheme(analyzed_content),
                'font_suggestions': self._suggest_fonts(analyzed_content),
                'layout_preferences': self._suggest_layout_preferences(analyzed_content)
            }
            
        except Exception as e:
            logger.error(f"生成PPT结构失败: {e}")
        
        return structure
    
    def _calculate_section_weight(self, section):
        """计算章节的内容权重"""
        content = section.get('content', [])
        if not content:
            return 0
        
        weight = 0
        for item in content:
            item_type = item.get('type', '')
            text = item.get('text', '').strip()
            
            if item_type == 'table':
                weight += 5  # 表格权重很高
            elif item_type == 'img':
                weight += 4  # 图片权重高
            elif item_type in ['ul', 'ol']:
                items = item.get('items', [])
                weight += min(len(items) * 0.5, 4)  # 列表项权重
            elif item_type in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                weight += 0.5  # 标题权重较低
            elif item_type in ['p', 'div']:
                # 根据文本长度计算权重
                if text:
                    weight += min(len(text) / 100, 2)  # 每100字符1分，最多2分
            elif item_type in ['pre', 'code', 'blockquote']:
                weight += 2  # 代码和引用权重中等
        
        return weight
    
    def _split_content_into_chunks(self, content, max_items_per_chunk=4):
        """将内容分割成块"""
        chunks = []
        current_chunk = []
        current_weight = 0
        
        for item in content:
            item_weight = self._calculate_item_weight(item)
            
            # 如果添加这个项目会超过权重限制，或者遇到重要分割点
            if (current_weight + item_weight > 8 or 
                (len(current_chunk) >= max_items_per_chunk and item.get('type') in ['h2', 'h3', 'table'])):
                
                if current_chunk:
                    chunks.append(current_chunk)
                    current_chunk = []
                    current_weight = 0
            
            current_chunk.append(item)
            current_weight += item_weight
        
        # 添加剩余内容
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks if chunks else [content]
    
    def _calculate_item_weight(self, item):
        """计算单个内容项的权重"""
        item_type = item.get('type', '')
        text = item.get('text', '').strip()
        
        if item_type == 'table':
            return 5
        elif item_type == 'img':
            return 4
        elif item_type in ['ul', 'ol']:
            items = item.get('items', [])
            return min(len(items) * 0.5, 4)
        elif item_type in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            return 0.5
        elif item_type in ['p', 'div']:
            if text:
                return min(len(text) / 100, 2)
            return 0
        elif item_type in ['pre', 'code', 'blockquote']:
            return 2
        else:
            return 1
    
    def _suggest_color_scheme(self, analyzed_content):
        """建议配色方案"""
        # 基于内容类型建议配色
        doc_analysis = analyzed_content.get('document_analysis', {})
        themes = doc_analysis.get('key_themes', [])
        
        # 简单的主题到配色映射
        theme_colors = {
            '技术': {'primary': '#0078D4', 'secondary': '#106EBE', 'accent': '#005A9E'},
            '商业': {'primary': '#107C10', 'secondary': '#0B6A0B', 'accent': '#004B1C'},
            '教育': {'primary': '#D83B01', 'secondary': '#C239B3', 'accent': '#881798'},
            '医疗': {'primary': '#00BCF2', 'secondary': '#0078D4', 'accent': '#005A9E'},
        }
        
        # 默认配色
        default_colors = {'primary': '#0078D4', 'secondary': '#106EBE', 'accent': '#005A9E'}
        
        for theme in themes:
            for key, colors in theme_colors.items():
                if key in theme:
                    return colors
        
        return default_colors
    
    def _suggest_fonts(self, analyzed_content):
        """建议字体"""
        return {
            'title': 'Microsoft YaHei',
            'heading': 'Microsoft YaHei',
            'body': 'Microsoft YaHei',
            'code': 'Consolas'
        }
    
    def _suggest_layout_preferences(self, analyzed_content):
        """建议布局偏好"""
        sections = analyzed_content.get('sections', [])
        
        # 统计内容类型
        content_type_counts = {}
        for section in sections:
            content_types = section.get('content_types', [])
            for content_type in content_types:
                content_type_counts[content_type] = content_type_counts.get(content_type, 0) + 1
        
        preferences = {
            'prefer_images': content_type_counts.get('image', 0) > 2,
            'prefer_lists': content_type_counts.get('list', 0) > 3,
            'prefer_tables': content_type_counts.get('table', 0) > 1,
            'content_heavy': sum(content_type_counts.values()) > 20
        }
        
        return preferences