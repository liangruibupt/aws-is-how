# I need create a comments blocker for this file.
# Supervisor Workers Pattern
# ```
#                   ┌─→ Worker Agent A

# Supervisor Agent ─┼─→ Worker Agent B

#                   └─→ Worker Agent C
# ```

# Swarm Pattern
# ```
#     Agent 1 ---─┐
#        |        ├─ Agent 2
#     Agent 3 ---─┘ 

# Agent Graph Pattern
# ```
#           ┐-- Agent 1 ──┐
#  Agent 3 ─┼             ├─ Agent 2
#           └─ Agent 4 -──┘
# ```

# Workflow patterns using Strands Agents
# ```
# Agent A → Agent B → Agent C → Final Output

# ```

from strands import Agent, tool
from strands_tools import calculator
from strands_tools import swarm, agent_graph, workflow

# Worker Agent A: Data Processor
@tool
def data_processor(query: str) -> str:
    try:
        data_processor_agent = Agent(
            model="us.amazon.nova-lite-v1:0",
            system_prompt="""You are a data processing specialist. 
            Your job is to take raw data and transform it into a structured format.
            Extract key metrics and present data in a clean, organized way."""
        )

        # Call the agent and return its response
        response = data_processor_agent(query)
        return str(response)
    except Exception as e:
        return f"Error in data processor assistant: {str(e)}"

# Worker Agent B: Financial Analyst
@tool
def financial_analyst(query: str) -> str:
    try:
        financial_analyst_agent = Agent(
            model="us.amazon.nova-lite-v1:0",
            tools=[calculator],
            system_prompt="""You are a financial analysis specialist. 
            Analyze financial data to identify trends, risks, and opportunities.
            Focus on metrics like revenue, costs, margins, and growth rates."""
        )

        # Call the agent and return its response
        response = financial_analyst_agent(query)
        return str(response)
    except Exception as e:
        return f"Error in financial analyst assistant: {str(e)}"


# Worker Agent C: Market Researcher
@tool
def market_researcher(query: str) -> str:
    try:
        market_researcher_agent = Agent(
            model="us.amazon.nova-lite-v1:0",
            system_prompt="""You are a market research specialist.
            Analyze market trends, consumer behavior, and competitive landscape.
            Focus on identifying market opportunities and threats."""
        )

        # Call the agent and return its response
        response = market_researcher_agent(query)
        return str(response)
    except Exception as e:
        return f"Error in market researcher assistant: {str(e)}"


# Supervisor Agent that uses worker agents as tools
def supervisor_pattern():
    supervisor_agent = Agent(
        model="us.amazon.nova-pro-v1:0",
        tools=[data_processor, financial_analyst, market_researcher],
        system_prompt="""You are a research manager coordinating a team of specialists.
        You have three specialists on your team that you can use as tools:
        
        1. data_processor: Expert at processing and structuring data
        2. financial_analyst: Expert at analyzing financial metrics
        3. market_researcher: Expert at analyzing market trends and opportunities
        
        When given a complex task, break it down and delegate appropriate subtasks to specialists.
        Then synthesize their responses into a comprehensive answer."""
    )
    
    finance_query = """
        Analyze this quarterly business data and provide strategic recommendations:

        Revenue: $2.45M (up 12% YoY)
        Gross Margin: 42% (down 3% from last quarter)
        Customer Acquisition Cost: $85 (up 10% YoY)
        Customer Lifetime Value: $520 (up 5% YoY)
        Market Share: 23% (up 2% YoY)
        Competitor A growth rate: 15%
        Competitor B growth rate: 8%
        Industry growth rate: 10%
        Product Line A revenue: $1.2M
        Product Line B revenue: $0.85M
        Product Line C revenue: $0.4M
        """

    response = supervisor_agent(finance_query)


def collaborative_content_creation(topic: str, swarm_coordinator: Agent):
    swarm_request = f"""
    Create a swarm of three agents to collaboratively develop content about: {topic}
    
    The swarm should include:
    1. A creative content writer who creates engaging and informative content
    2. An editor who improves content by fixing grammar, enhancing clarity, and improving structure
    3. A fact-checker who identifies potential factual errors and verifies claims
    
    The agents should work collaboratively with 2 iterations of improvements to produce a high-quality final article.
    The content writer creates the initial draft, then the editor improves it, the fact-checker verifies it,
    and the content writer makes a final revision based on all feedback.
    """
    
    result = swarm_coordinator(swarm_request)
    return result

def swarm_pattern():
    swarm_coordinator = Agent(
        model="us.amazon.nova-pro-v1:0",
        tools=[swarm],
        system_prompt="""You are a collaboration coordinator that facilitates peer-to-peer agent swarms.
        Use the swarm tool to create networks of agents that can work together on collaborative tasks."""
    )
    
    collaborative_content_creation("You are a profressional writer, please write a paper about the future of agentic in Automotive Industry",
                                   swarm_coordinator)

def create_research_system(topic: str, graph_coordinator: Agent):
    graph_request = f"""
    Create an agent graph for a comprehensive research system on: {topic}
    
    Design the graph with these specialized agents:
    1. Research Planner - Creates structured research questions and plans
    2. Information Gatherer - Collects relevant information about each research question
    3. Critical Analyzer - Evaluates gathered information and identifies patterns/insights
    4. Information Synthesizer - Combines analyses into a coherent research report
    5. Quality Reviewer - Reviews the final report for completeness and accuracy
    
    Design the information flow between these agents to create a complete research pipeline
    that results in a comprehensive research report on the topic.
    """
    
    result = graph_coordinator(graph_request)
    return result

def graph_pattern():
    graph_coordinator = Agent(
        model="us.amazon.nova-pro-v1:0",
        tools=[agent_graph],
        system_prompt="""You are a system architect specializing in complex agent networks.
        Use the agent_graph tool to design and orchestrate networks of specialized agents."""
    )
    research_system = create_research_system("How to use the Agentic and Generative AI in Healthcare Diagnostics",
                                             graph_coordinator)
    research_system

# Function to run our analysis pipeline
def run_analysis_pipeline(input_text: str, workflow_orchestrator: Agent):
    # We'll use the orchestrator agent to create and run the workflow
    workflow_request = f"""
    Create and execute a business analysis workflow with the following steps:
    
    1. Extract key points from this text as a bulleted list:
    {input_text}
    
    2. Analyze those extracted points to identify patterns, insights, and implications
    
    3. Generate actionable recommendations based on the analysis as a numbered list
    
    Each step should pass its output to the next step in the workflow.
    """
    
    result = workflow_orchestrator(workflow_request)
    return result

def workflow_pattern():
    workflow_orchestrator = Agent(
        model="us.amazon.nova-pro-v1:0",
        tools=[workflow],
        system_prompt="""You are an orchestration specialist that coordinates multi-agent workflows.
        Use the workflow tool to create and execute sequential processing pipelines."""
    )
    query = """
        The company's Q3 sales increased 15% year-over-year, reaching $12.5 million.
        However, profit margins decreased from 35% to 28% due to increased material costs.
        Customer acquisition cost rose to $120 per customer, up from $85 last quarter.
        The new product line contributed 22% of total revenue, exceeding expectations.
        Employee turnover rate was 12%, which is 3% higher than industry average.
        Customer satisfaction scores averaged 4.2/5, a slight decrease from 4.4/5 in Q2.
        The company expanded into two new markets but delayed the planned European expansion.
        R&D spending decreased by 5% compared to the previous quarter.
        """

    results = run_analysis_pipeline(query, workflow_orchestrator)
    
def solve_complex_problem(problem_description: str, sme_orchestrator: Agent):
    orchestration_request = f"""
    Design and implement a multi-agent system to solve this problem:
    
    {problem_description}
    
    Use whatever combination of workflow, swarm, and agent_graph is most appropriate.
    Explain your design choices and show the results from the multi-agent system.
    """
    
    result = sme_orchestrator(orchestration_request)
    return result.message

def multi_agent_sme_system():
    sme_orchestrator = Agent(
        model="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        tools=[workflow, swarm, agent_graph],
        system_prompt="""You are a subject matter expert orchestrator that designs multi-agent systems.
            Use the workflow, swarm, and agent_graph tools to create complex agent networks that solve real-world problems.
            You can create and coordinate multiple patterns of agent collaboration including:
            - Sequential workflows using the workflow tool
            - Peer-to-peer agent swarms using the swarm tool
            - Complex agent networks using the agent_graph tool
            Build the most appropriate multi-agent system based on the task requirements.
            """
    )
    complex_problem = """
        Our company is a automotive car maker in China. Now company is considering expanding into the global market include Europe, South Asia, Middle East.
        We need a comprehensive analysis including:
        - Market size and growth projections for different markets
        - Consumer preferences and trends in electric vehicles
        - Competitive landscape analysis
        - Regulatory considerations in major markets
        - Technology assessment and future trends
        - Investment requirements and ROI projections
        - Recommendations on which specific country in each major markets to enter first
        - Implementation roadmap with key milestones
        """

    solution = solve_complex_problem(complex_problem, sme_orchestrator)
    print(solution)

if __name__ == "__main__":
    # supervisor_pattern()
    # print("\n" + "-"*80 + "\n")
    
    # swarm_pattern()
    # print("\n" + "-"*80 + "\n")
    
    # graph_pattern()
    # print("\n" + "-"*80 + "\n")
    
    # workflow_pattern()
    print("\n" + "-"*80 + "\n")
    
    multi_agent_sme_system()
    
    print("Multi-agent patterns executed successfully.")
    