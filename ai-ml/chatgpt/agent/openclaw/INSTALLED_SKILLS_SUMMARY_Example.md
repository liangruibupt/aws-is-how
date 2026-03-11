# OpenClaw 已安装技能清单

> **更新时间**：2026-03-04  
> **总计**：17个技能  
> **用途**：扩展OpenClaw能力，覆盖搜索、集成、自动化、内容生成等场景

---

## 🔍 搜索与知识获取（3个）

### 1. **tavily**
- **功能**：AI优化的网络搜索（Tavily Search API）
- **适用场景**：时事查询、深度研究、事实核查、权威来源收集
- **特点**：为LLM优化，结构化结果，自动生成摘要

### 2. **getnote**
- **功能**：搜索Get笔记个人知识库
- **适用场景**：查询会议记录、文章摘要、个人笔记
- **特点**：快速文档召回（~0.5秒）+ AI智能搜索（~10秒）

### 3. **notebooklm**
- **功能**：Google NotebookLM笔记本分析与交互
- **适用场景**：生成播客、创建幻灯片、总结笔记本
- **特点**：浏览器自动化，智能缓存，避免重复提取

---

## 📋 集成工具（5个）

### 4. **feishu-doc**
- **功能**：获取飞书Wiki、文档、表格、多维表内容
- **特点**：自动解析Wiki URL，转换为Markdown

### 5. **feishu-common**
- **功能**：飞书通用工具库
- **特点**：其他飞书技能的基础依赖

### 6. **notion-official**
- **功能**：Notion API官方文档参考（OpenClaw内置）
- **类型**：文档型技能
- **特点**：最新API版本（2025-09-03），完整curl示例

### 7. **openclaw-notion-skill**
- **功能**：Notion工作空间完整集成（CLI工具）
- **适用场景**：知识库管理、项目跟踪、内容日历、CRM、协作文档
- **特点**：读取页面、查询数据库、创建条目、管理内容

### 8. **bird-twitter**
- **功能**：Twitter/X命令行工具（基于bird）
- **适用场景**：发推文、回复、阅读、搜索、管理时间线
- **特点**：快速GraphQL-based X CLI

---

## 🌐 浏览器自动化（1个）

### 9. **agent-browser**
- **功能**：Rust高性能浏览器自动化CLI
- **特点**：snapshot+refs工作流，5-10x速度提升（vs传统工具）
- **适用场景**：网页数据提取、自动化测试、UI交互

---

## ✏️ 内容生成（1个）

### 10. **powerpoint-pptx**
- **功能**：编程式生成PowerPoint演示文稿
- **适用场景**：自动化创建PPT、批量生成幻灯片、结构化演示
- **特点**：基于python-pptx，支持多种布局、文本格式、视觉元素
- **触发词**："创建PPT"、"生成幻灯片"、"make a presentation"

---

## 🛠️ 系统与开发（5个）

### 11. **skill-creator**
- **功能**：创建和更新OpenClaw技能的指南
- **适用场景**：开发新技能、扩展能力、工作流集成
- **版本**：v0.1.0（2026-03-04更新，新增Evals和多agent测试）

### 12. **find-skills**
- **功能**：发现和安装agent技能
- **触发场景**："怎么做X"、"找个能做X的技能"、"有没有技能可以..."
- **特点**：帮助用户扩展功能

### 13. **self-improvement**
- **功能**：捕获学习、错误和纠正，实现持续改进
- **触发场景**：操作失败、用户纠正、API失败、知识过时、发现更好方法
- **特点**：自我学习机制

### 14. **proactive-agent**
- **功能**：将AI agent从任务执行者转变为主动伙伴
- **特点**：WAL Protocol、Working Buffer、自主Crons
- **标签**：Hal Stack 🦞

### 15. **automation-workflows**
- **功能**：设计和实施自动化工作流
- **适用场景**：识别重复任务、跨工具构建工作流、优化自动化
- **覆盖**：Zapier、Make、n8n等无代码工具
- **触发词**："automate"、"workflow automation"、"save time"

---

## 🔒 安全与审计（2个）

### 16. **skill-vetter**
- **功能**：安全优先的技能审查工具
- **适用场景**：安装前检查技能（ClawHub/GitHub等）
- **检查内容**：红旗标记、权限范围、可疑模式

### 17. **openclaw-security-audit**
- **功能**：审计OpenClaw/Clawdbot部署的安全配置
- **检查内容**：配置错误、攻击向量、gateway暴露、凭证泄漏
- **输出**：终端报告（OK/VULNERABLE + 修复建议）

---

## 📊 技能分布统计

| 类别 | 数量 | 占比 |
|------|------|------|
| 集成工具 | 5 | 29% |
| 系统与开发 | 5 | 29% |
| 搜索与知识 | 3 | 18% |
| 安全与审计 | 2 | 12% |
| 浏览器自动化 | 1 | 6% |
| 内容生成 | 1 | 6% |

---

## 🎯 高频使用场景

1. **搜索信息** → tavily / getnote
2. **飞书操作** → feishu-doc / feishu-common
3. **Notion管理** → openclaw-notion-skill / notion-official
4. **网页自动化** → agent-browser
5. **生成PPT** → powerpoint-pptx
6. **安全检查** → skill-vetter / openclaw-security-audit
7. **自我改进** → self-improvement
8. **开发技能** → skill-creator

---

## 📦 安装来源

- **ClawHub**：tavily, feishu-doc, skill-vetter, bird-twitter, automation-workflows, powerpoint-pptx
- **GitHub**：openclaw-notion-skill, find-skills, getnote, notebooklm, agent-browser
- **OpenClaw官方**：notion-official, feishu-common
- **内置/自建**：skill-creator, self-improvement, proactive-agent, openclaw-security-audit

---

## 💡 使用建议

### 新用户入门
1. 先装 **skill-vetter**（安全第一）
2. 根据需求选择集成工具（feishu/notion）
3. 安装 **tavily**（基础搜索能力）

### 高级用户
1. **agent-browser**（高性能自动化）
2. **skill-creator**（自建技能）
3. **proactive-agent**（主动式工作）

### 团队协作
1. **feishu-doc** + **openclaw-notion-skill**（文档管理）
2. **automation-workflows**（流程自动化）
3. **powerpoint-pptx**（内容生成）

---

**维护者**：龙虾小子 🦞  
**联系方式**：通过Phoenix  
**更新频率**：根据新技能安装实时更新
