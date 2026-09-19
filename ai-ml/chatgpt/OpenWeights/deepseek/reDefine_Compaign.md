# Monday Briefing
```
Look up my org chart (manager, skip-level, and peers) then check my unread Teams DMs and emails since Monday. Summarize what needs my attention, ranked by urgency. Flag anything from my leadership chain or with a deadline this week as high priority.
```

# Deal Snapshot
```
Show me the following accounts ranked by revenue revenue opportunity. For each one, give me: account name, primary contact, current stage, last activity date, who on my team is engaged, and any risks or blockers. Format as a table and highlight any account with no activity in the last 14 days.
```

# Meeting Prepare
```
I have a meeting with a [industry] customer tomorrow. They're interested in how AWS and AI could improve their efficiency. They're worried about [costs/security]. Create a brief with context, talking points, open questions, and 2–3 relevant public case studies.
```

# Meeting Scheduler
```
Find the next available 30-minute slot this week where me and my following direct reports are free. You can get my direct reports from PhoneTool. Consider everyone's local time zone and only suggest times within 9 AM–6 PM local time for every participant. Skip conflicts. Show me only the first 3 fully-open options.
```

# My Challenge
1. Project Background
```
I will attend the workshop for all Sales and SA Managers across APJC next week, and I have a task to finish by then with the requirements listed below:
• Resolve an actual internal pain point
• Deliver value for stakeholders outside your immediate team, spanning different functions, regions and seniority levels
• Be deployable and accessible through a single link
• Develop a solution that transforms our operational mode, benefiting not only your own team but the entire organization

Based on my daily job responsibilities and scope of management, I need to first identify a genuine internal pain point, then create a SKILL to fulfill this task.
```

2. One of my internal pain point
```
SAs are carrying out TRE (tech role evolution) and accelerating the rollout of GenAI/Agentic AI use cases via CDE engagement. However, after SAs build a working solution or software within 3 to 5 days, there exists a pain point regarding how to hand over these assets and artifacts to the customer's internal technical teams, or deliver them to the customer's production environment through ProServe or SI partners.
```

3. CDE Handover Accelerator Skill
```
Step 1: Collect Sprint Context (Retrieve project background from user input, KG and Asana). 
- Input: project_name, sprint_summary, code_repo_path and delivery_target are required
Step 2: Scan Artifacts (Analyze code structure and dependencies if code_repo_path is available)
Step 3: Generate Handover Package documents (Architecture, Deployment and Decision records)
Step 4: Determine Delivery Routing (Identify the assignee and adopt document formats tailored for different audiences)
Step 5: Export the final Handover Package (DOCX/MD files together with descriptions of Architecture Diagrams)
```

4. Create the Quick App
```
Create a Quick App, so I can share with team to execute the CDE Handover Accelerator and give a visibility about each project status.
```

5. Generate eval test cases
```json
{
  "skill_name": "cde-handover-accelerator",
  "created_at": 1782459108.1052392,
  "evals": [
    {
      "id": 1,
      "prompt": "Generate handover package for 欣和食品 Kiro Agent. Sprint summary: Built an AI-powered coding assistant integration using AWS Bedrock and Kiro for 欣和食品's development platform, enabling developers to use spec-driven development with automated code review. Code repo: /Users/ruiliang/projects/xinhe-kiro-agent. Delivery target: customer_team",
      "description": "Test case 1 - 欣和食品 Kiro Agent → customer_team",
      "expected_output": ""
    },
    {
      "id": 2,
      "prompt": "CDE handover for Trip.com Agentic Booking. Sprint summary: Developed a multi-agent booking orchestration system using Bedrock Agents with tool-use for flight+hotel bundling, leveraging DynamoDB for session state and Step Functions for workflow coordination. Code repo: /Users/ruiliang/projects/trip-agentic-booking. Delivery target: customer_team",
      "description": "Test case 2 - Trip.com Agentic Booking → customer_team",
      "expected_output": ""
    },
    {
      "id": 3,
      "prompt": "Sprint交付包 — Ubiquant ML Training Pipeline. Sprint summary: Built a distributed training pipeline on HyperPod with custom CUDA kernels for quantitative model training, integrated with customer's existing Snowflake data lake via S3 cross-account access. Code repo: /Users/ruiliang/projects/ubiquant-hyperpod. Delivery target: si_partner",
      "description": "Test case 3 - Ubiquant ML Training → si_partner",
      "expected_output": ""
    },
    {
      "id": 4,
      "prompt": "Generate handover for CHAGEE Smart Store Agent. Sprint summary: Built a store supply chain management agent using Amazon Quick Desktop as the development platform, enabling store managers to interact with inventory, ordering, and demand forecasting through natural language. The agent integrates with CHAGEE's existing ERP via MCP connectors. Code repo: /Users/ruiliang/projects/chagee-store-agent. Delivery target: customer_team",
      "description": "Test case 4 - CHAGEE Smart Store (Quick Desktop + 门店供应链 Agent) → customer_team",
      "expected_output": ""
    },
    {
      "id": 5,
      "prompt": "CDE handover — Roche AI Translation Agent. Sprint summary: Built an AI-powered medical document translation agent using Bedrock Claude for regulatory submission documents (CSR, IB, Protocol), with terminology management via custom knowledge base and human-in-the-loop review workflow. Code repo: /Users/ruiliang/projects/roche-ai-translation. Delivery target: proserve",
      "description": "Test case 5 - Roche AI Translation Agent → proserve",
      "expected_output": ""
    }
  ]
}
```