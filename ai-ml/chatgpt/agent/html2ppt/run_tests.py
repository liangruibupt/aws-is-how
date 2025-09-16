#!/usr/bin/env python3
"""
HTML2PPT 测试运行脚本
"""

import os
import sys
import unittest
import logging

def main():
    """运行所有测试"""
    # 设置日志
    logging.basicConfig(
        level=logging.WARNING,  # 测试时减少日志输出
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 添加src目录到Python路径
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
    
    # 发现并运行测试
    test_dir = os.path.join(os.path.dirname(__file__), 'tests')
    
    # 创建测试套件
    loader = unittest.TestLoader()
    suite = loader.discover(test_dir, pattern='test_*.py')
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 返回结果
    if result.wasSuccessful():
        print("\n✅ 所有测试通过！")
        return 0
    else:
        print(f"\n❌ 测试失败: {len(result.failures)} 个失败, {len(result.errors)} 个错误")
        return 1

if __name__ == '__main__':
    sys.exit(main())