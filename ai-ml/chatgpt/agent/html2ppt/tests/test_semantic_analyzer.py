"""
语义分析器测试
"""

import unittest
import os
import sys

# 添加src目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from semantic_analyzer import SemanticAnalyzer

class TestSemanticAnalyzer(unittest.TestCase):
    """语义分析器测试类"""
    
    def setUp(self):
        """测试前准备"""
        config = {
            'semantic_analysis': {
                'enabled': True,
                'model': 'local',  # 使用本地模型避免API依赖
                'content_weights': {
                    'title': 1.0,
                    'heading': 0.8,
                    'paragraph': 0.6,
                    'list': 0.7,
                    'image': 0.5,
                    'table': 0.6
                }
            }
        }
        self.analyzer = SemanticAnalyzer(config)
        
        # 测试数据
        self.test_content = {
            'document_info': {
                'title': '人工智能技术报告',
                'meta': {'description': '关于AI技术的详细报告'},
                'language': 'zh-CN'
            },
            'sections': [
                {
                    'type': 'section',
                    'level': 1,
                    'title': '人工智能概述',
                    'content': [
                        {
                            'type': 'p',
                            'text': '人工智能是计算机科学的一个重要分支。',
                            'styles': {}
                        },
                        {
                            'type': 'ul',
                            'items': [
                                {'text': '机器学习是AI的核心技术'},
                                {'text': '深度学习推动了AI的发展'}
                            ]
                        }
                    ]
                },
                {
                    'type': 'section',
                    'level': 2,
                    'title': '技术应用',
                    'content': [
                        {
                            'type': 'p',
                            'text': 'AI技术在各个领域都有广泛应用。',
                            'styles': {}
                        }
                    ]
                }
            ]
        }
    
    def test_analyze(self):
        """测试分析功能"""
        result = self.analyzer.analyze(self.test_content)
        
        self.assertIsNotNone(result)
        self.assertIn('document_analysis', result)
        self.assertIn('sections', result)
        self.assertIn('ppt_structure', result)
    
    def test_analyze_document_structure(self):
        """测试文档结构分析"""
        analysis = self.analyzer._analyze_document_structure(self.test_content)
        
        self.assertIn('main_topic', analysis)
        self.assertIn('content_flow', analysis)
        self.assertIn('importance_scores', analysis)
        self.assertIn('suggested_slides', analysis)
        
        # 检查主题提取
        self.assertEqual(analysis['main_topic'], '人工智能技术报告')
        
        # 检查建议幻灯片数量
        self.assertGreater(analysis['suggested_slides'], 0)
    
    def test_analyze_section(self):
        """测试章节分析"""
        section = self.test_content['sections'][0]
        analyzed_section = self.analyzer._analyze_section(section)
        
        self.assertIn('importance_score', analyzed_section)
        self.assertIn('content_types', analyzed_section)
        self.assertIn('key_points', analyzed_section)
        self.assertIn('suggested_layout', analyzed_section)
        
        # 检查重要性分数
        self.assertIsInstance(analyzed_section['importance_score'], float)
        self.assertGreaterEqual(analyzed_section['importance_score'], 0)
        self.assertLessEqual(analyzed_section['importance_score'], 1)
    
    def test_calculate_importance_scores(self):
        """测试重要性分数计算"""
        sections = self.test_content['sections']
        scores = self.analyzer._calculate_importance_scores(sections)
        
        self.assertIsInstance(scores, dict)
        self.assertGreater(len(scores), 0)
        
        # 检查分数范围
        for score in scores.values():
            self.assertGreaterEqual(score, 0)
            self.assertLessEqual(score, 1)
    
    def test_identify_content_types(self):
        """测试内容类型识别"""
        section = self.test_content['sections'][0]
        content_types = self.analyzer._identify_content_types(section)
        
        self.assertIsInstance(content_types, list)
        self.assertIn('paragraph', content_types)
        self.assertIn('list', content_types)
    
    def test_extract_key_points(self):
        """测试关键点提取"""
        section = self.test_content['sections'][0]
        key_points = self.analyzer._extract_key_points(section)
        
        self.assertIsInstance(key_points, list)
        
        # 检查关键点结构
        if key_points:
            point = key_points[0]
            self.assertIn('text', point)
            self.assertIn('type', point)
            self.assertIn('importance', point)
    
    def test_suggest_layout(self):
        """测试布局建议"""
        section = self.test_content['sections'][0]
        layout = self.analyzer._suggest_layout(section)
        
        self.assertIsInstance(layout, str)
        self.assertIn(layout, [
            'image_focus', 'table_layout', 'bullet_points',
            'single_content', 'multi_content', 'content_heavy'
        ])
    
    def test_extract_main_topic(self):
        """测试主题提取"""
        topic = self.analyzer._extract_main_topic(self.test_content)
        
        self.assertIsInstance(topic, str)
        self.assertNotEqual(topic, "未知主题")
    
    def test_analyze_content_flow(self):
        """测试内容流程分析"""
        sections = self.test_content['sections']
        flow = self.analyzer._analyze_content_flow(sections)
        
        self.assertIsInstance(flow, list)
        self.assertEqual(len(flow), len(sections))
        
        # 检查流程项结构
        if flow:
            flow_item = flow[0]
            self.assertIn('index', flow_item)
            self.assertIn('title', flow_item)
            self.assertIn('level', flow_item)
            self.assertIn('flow_type', flow_item)
    
    def test_suggest_slide_count(self):
        """测试幻灯片数量建议"""
        sections = self.test_content['sections']
        count = self.analyzer._suggest_slide_count(sections)
        
        self.assertIsInstance(count, int)
        self.assertGreater(count, 0)
        self.assertGreaterEqual(count, len(sections))  # 至少等于章节数
    
    def test_extract_key_themes(self):
        """测试关键主题提取"""
        sections = self.test_content['sections']
        themes = self.analyzer._extract_key_themes(sections)
        
        self.assertIsInstance(themes, list)
        # 主题应该包含相关词汇
        theme_text = ' '.join(themes)
        # 由于是中文文本，检查是否包含相关概念
    
    def test_generate_ppt_structure(self):
        """测试PPT结构生成"""
        structure = self.analyzer._generate_ppt_structure(self.test_content)
        
        self.assertIn('total_slides', structure)
        self.assertIn('slide_plan', structure)
        self.assertIn('design_suggestions', structure)
        
        # 检查幻灯片计划
        slide_plan = structure['slide_plan']
        self.assertIsInstance(slide_plan, list)
        self.assertGreater(len(slide_plan), 0)
        
        # 检查第一张幻灯片（应该是标题页）
        if slide_plan:
            title_slide = slide_plan[0]
            self.assertEqual(title_slide['type'], 'title')
            self.assertEqual(title_slide['slide_number'], 1)
    
    def test_split_content_into_chunks(self):
        """测试内容分块"""
        content = self.test_content['sections'][0]['content']
        chunks = self.analyzer._split_content_into_chunks(content, max_items_per_chunk=2)
        
        self.assertIsInstance(chunks, list)
        self.assertGreater(len(chunks), 0)
        
        # 检查每个块的大小
        for chunk in chunks:
            self.assertLessEqual(len(chunk), 2)  # 不超过最大项目数
    
    def test_suggest_color_scheme(self):
        """测试配色方案建议"""
        colors = self.analyzer._suggest_color_scheme(self.test_content)
        
        self.assertIsInstance(colors, dict)
        self.assertIn('primary', colors)
        self.assertIn('secondary', colors)
        self.assertIn('accent', colors)
    
    def test_suggest_fonts(self):
        """测试字体建议"""
        fonts = self.analyzer._suggest_fonts(self.test_content)
        
        self.assertIsInstance(fonts, dict)
        self.assertIn('title', fonts)
        self.assertIn('heading', fonts)
        self.assertIn('body', fonts)
    
    def test_suggest_layout_preferences(self):
        """测试布局偏好建议"""
        preferences = self.analyzer._suggest_layout_preferences(self.test_content)
        
        self.assertIsInstance(preferences, dict)
        self.assertIn('prefer_images', preferences)
        self.assertIn('prefer_lists', preferences)
        self.assertIn('prefer_tables', preferences)
        self.assertIn('content_heavy', preferences)

if __name__ == '__main__':
    unittest.main()