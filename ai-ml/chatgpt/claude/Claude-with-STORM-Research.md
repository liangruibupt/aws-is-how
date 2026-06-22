# 斯坦福 STORM 方法：怎样让 Claude 在几分钟内像博士一样做研究

## Summary

原贴地址：https://mp.weixin.qq.com/s/gTkSNCVatjGuWzy7C7Mr2Q

STORM 的全称是 Synthesis of Topic Outlines through Retrieval and Multi perspective Question Asking（通过检索和多视角提问来综合生成主题大纲）

https://storm.genie.stanford.edu 体验在线版本

完整代码在 github.com/stanford-oval/storm

## Prompt 1，多视角扫描

只需要把第一行里的主题换成你自己的。

实践者会看到学者忽略的现实；怀疑者会挑战实践者视为当然的东西；经济学视角会揭开学者常常不谈的激励机制；历史学视角则会提供经济视角看不到的长期模式。

```
I need to research [YOUR TOPIC].
Simulate 5 different expert perspectives on this topic:
1. THE PRACTITIONER: works with this daily.
What do they know that academics miss?
What practical realities are usually ignored?
2. THE ACADEMIC: has studied this for years.
What does the peer reviewed evidence actually say?
Where does the evidence contradict popular belief?
3. THE SKEPTIC: thinks the mainstream view is wrong.
What is the strongest counterargument?
What evidence do proponents conveniently ignore?
4. THE ECONOMIST: follows the money.
Who profits from the current narrative?
What financial incentives shape the research?
5. THE HISTORIAN: has seen similar patterns before.
What historical parallels exist?
What can we learn from how those played out?
For each perspective give me:
- Their core position in 2 sentences
- The strongest evidence supporting their view
- The one thing they would tell me that no other perspective would
```

## Prompt 2，矛盾地图

Claude 去找出这五种声音彼此冲突的地方 - 一张关于“专家们在哪些地方意见不合、为什么不合”的矛盾地图

```
Based on the 5 perspectives above, map the contradictions:
1. Where do two or more perspectives directly contradict
each other? List each conflict with the specific claims
that clash.
2. Which perspective has the strongest evidence?
Which has the weakest? Why?
3. What is the one question that, if answered, would
resolve the biggest contradiction?
4. What does EVERY perspective agree on?
(This is likely true. Even opponents confirm it.)
5. What topic did NONE of the perspectives address?
(This is the blind spot in the whole field.
Often the most valuable finding.)
```

## Prompt 3，综合

让 Claude 把前面的内容整合成一份研究简报

```
Synthesize everything from the 5 perspectives and the
contradiction map into a research briefing:
1. THE ONE PARAGRAPH SUMMARY: explain this topic as if
briefing a CEO who has 60 seconds and needs nuance,
not just the headline.
2. THE 5 KEY FINDINGS: most important things I now know,
ranked by reliability. For each, note which perspectives
support it and which challenge it.
3. THE HIDDEN CONNECTION: one non obvious link between
findings that only shows up when you look at all 5
perspectives together.
4. THE ACTIONABLE INSIGHT: based on all the evidence,
what should someone in [YOUR ROLE] actually DO
differently? Be specific.
5. THE FRONTIER QUESTION: the one question that, if
answered, would change everything about how we
understand this topic.
```

## Prompt 4，同行评审

STORM 这个系统不会主动自我批判。 来源偏差和事实错配，会悄悄混进去。下面这段 prompt 的作用，就是让 Claude 给自己的成果打分和挑刺。

```
Now peer review your own research briefing:
1. CONFIDENCE SCORES: rate each of the 5 key findings
on a 1 to 10 scale for reliability. Explain each score.
2. WEAKEST LINK: which claim are you least confident in?
What specific info would you need to verify it?
3. BIAS CHECK: which perspective might be overrepresented
in your synthesis? Did one voice dominate?
4. MISSING PERSPECTIVE: is there a 6th angle I should
have included that would change the conclusions?
5. OVERALL GRADE: if a Stanford professor reviewed this
briefing, what grade would they give and why?
What would they tell me to fix?
```

## Workflow
1. Step1：跑 Prompt 1。你得到 5 种专家视角。
2. Step2：跑 Prompt 2。你得到一张矛盾地图。
3. Step3：跑 Prompt 3。你得到一份研究简报。
4. Step4：跑 Prompt 4。你知道哪些内容更可靠，哪些内容还需要怀疑。

## Wrap up

1. 在写任何文章或报告之前，先跑这 4 个 prompt。你的内容会天然覆盖别人根本没想到的角度。
2. 在做重大商业决策之前，先拿到 5 种视角。实践者会告诉你现实里什么真正有效；怀疑者会告诉你哪里最可能出错；经济学视角会告诉你谁在从中获利。
3. 在面试之前，用这 5 个角度研究公司。实践者视角会让你掌握“圈内语言”；怀疑者视角会帮你准备尖锐问题。你走进房间时，会比在场大多数人准备得更充分。
4. 在投资之前，快速搭出多头逻辑、空头逻辑、历史对照、激励结构和学术证据。矛盾地图会直接把真正的风险点暴露出来。
5. 在学习一项新技能之前，用 5 个视角先把领域地图跑出来。实践者告诉你先学什么；学者告诉你理论基础；怀疑者告诉你什么被过度炒作。你可以直接跳过噪音。
6. 在谈判之前，从 5 个视角研究对手。理解他们的激励、弱点和历史行为模式。你进场时就会拥有结构性优势。
7. 在做任何演讲或展示之前，先对主题跑一遍 STORM。你的幻灯片会在观众提出质疑之前，先把反对意见回答掉。你的 Q&A 会显得异常轻松。