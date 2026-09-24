---
layout: post
title: 'From Prompt Chains to Agent Graphs: How Our Agent Architecture Evolved'
date: 2026-09-13T22:45:00
description: |-
  Over the past two years, our agent architecture evolved through four stages: deterministic prompt chains, LangGraph-based orchestration, a lightweight skill-based agent loop, and finally agent graph.

  This post walks through that evolution and explains why we eventually chose to use a graph to represent our agent orchestration.
tags: []
toc: null
---

### Stage 1 - Build chatbot using prompt chaining workflow

The first iteration began in early 2025, when we frequently had to diagnose batch-ingestion failures. Much of the troubleshooting process was repetitive, so I started wondering whether we could build a chatbot to automate parts of the diagnosis and reduce the amount of manual effort involved.

At the time, we still thought of the system primarily as a chatbot rather than an agent.

I built a `prompt-chaining` workflow using [CrewAI](https://crewai.com/) and selected Llama 3, served locally through Ollama:

![](/assets/img/uploads/Screenshot%202026-09-13%20at%2011.01.39%20PM.png "Example prompt chaining workflow")

Compared with today's models, the models available to us at the time were less reliable at multi-step reasoning and following complex instructions. To make the system more predictable and reduce the risk of hallucinations, we kept the workflow largely deterministic: each step had a predefined responsibility, and the execution path was explicitly orchestrated rather than decided dynamically by the model.

### Stage 2 — LangGraph-Based Tool Orchestration

The second iteration began in October 2025. At the time, we had more than 100 tables in Databricks Unity Catalog spanning different commerce domains, such as contracts, licenses, orders, and offers. We wanted to build a chatbot that could answer users' questions across these datasets.

Initially, we considered adopting [Databricks Genie](https://docs.databricks.com/aws/en/genie/). For those unfamiliar with Genie, it provides a natural-language interface for querying data in Databricks. You can create a Genie space, add relevant tables, and provide business context through instructions and example SQL queries to improve the accuracy of the generated queries.

![](/assets/img/uploads/Screenshot%202026-09-14%20at%204.10.19%20PM.png "Genie Interface")

However, after some experimentation, I found two challenges:

- As the semantic scope expanded across increasingly heterogeneous business domains, it became harder for a single Genie space to consistently apply the right business context. Adding more instructions did not necessarily solve the problem and sometimes made query generation less reliable.
- With more than 100 tables across different domains, selecting the correct tables and distinguishing between similar concepts became increasingly difficult.

Rather than putting heterogeneous business domains behind a single generalist Genie space, we partitioned the system into multiple domain-specialized spaces, with each one responsible for a narrower business area.

![](/assets/img/uploads/ChatGPT%20Image%20Sep%2024%2C%202026%2C%2004_15_54%20PM.png "Single generalist vs. domain-specialized Genie spaces")

In our internal testing, this domain specialization reduced table-selection errors, but it introduced a new problem: **how should we route each request to the appropriate Genie space?**

At the time, I was inspired by the way Cursor integrated with MCP servers: external systems could expose capabilities as tools, and Cursor's agent could decide when to invoke them. That led me to a similar design idea: what if we wrapped each domain-specific Genie API as a tool and placed an LLM-based orchestrator in front of them?

This is what the architecture looked like:

![](/assets/img/uploads/ChatGPT%20Image%20Sep%2016%2C%202026%2C%2004_02_49%20PM.png "LLM orchestrator with domain-specialized Genie tools")

We implemented this orchestration layer with LangGraph. At its core, the graph formed a simple model–tool loop: the model decided whether a tool call was needed, LangGraph executed the selected tool, and the result was fed back to the model for the next step.

```python
from langgraph.graph import END, StateGraph
workflow = StateGraph(AgentState)

workflow.add_node("agent", RunnableLambda(call_model))
workflow.add_node("tools", ToolNode(tools))

workflow.set_entry_point("agent")
workflow.add_conditional_edges(
  "agent",
  should_continue,
  {
     "continue": "tools",
     "end": END,
  },
)
workflow.add_edge("tools", "agent")

return workflow.compile()
```

We later integrated the agent with Slack, allowing users to ask data questions directly from their existing workflow.

### Building an Agent with a Skill-Based Agent Loop

By early 2026, the idea of packaging reusable knowledge and capabilities into `skills` was becoming increasingly common in agent systems. As our use cases expanded, we decided to evolve the architecture again.

There were two main motivations:

- We wanted the agent to do more than generate SQL. It now needed to triage on-call alerts, investigate pipeline lag, create reporting schedules, generate reports, and support other operational workflows. As the scope grew, we needed a structured and version-controlled way to organize domain knowledge, procedures, and tools.
- We also wanted that knowledge to improve continuously as engineers worked. Rather than repeatedly encoding the same context into prompts, we started maintaining persistent Markdown-based knowledge that the agent could update over time and later reuse as part of its skills.

Andrej Karpathy’s [llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) later reinforced this idea: instead of rebuilding context from scratch for every request, an LLM can incrementally maintain a persistent knowledge base that becomes richer over time.

Our architecture looks like:

![](/assets/img/uploads/ChatGPT%20Image%20Sep%2017%2C%202026%2C%2004_59_38%20PM.png "Skill based agent loop architecture diagram")

We made a few changes:

- Our knowledge will be stored in skill, and the skill.md looks like:
![](/assets/img/uploads/ChatGPT%20Image%20Sep%2024%2C%202026%2C%2004_28_50%20PM.png "Example skill format")Each `SKILL.md` defined the instructions, domain knowledge, and tools available for a particular class of tasks.
- We refactored our MCP-based tools into CLI-backed capabilities organized through the filesystem. We did it since LLM is great at navigating filesystems. Presenting tools as code on a filesystem allows models to read tool definitions on-demand, rather than reading them all up-front. 
- We remove LangGraph from the agent runtime. since they often create extra layers of abstraction.

### From a Flat Agent Loop to a Dependency-Aware Graph

As our skills became more complex, we started seeing another limitation of the flat agent loop: **not every tool should be available at every point in the investigation**. Some tools naturally depend on information produced by others.

Let me explain more. For example, when querying an unfamiliar table, we usually want the agent to inspect the table description and schema before issuing the actual query. On-call investigation is even more dependency-heavy: we may want the agent to consult the runbook and inspect lightweight signals such as Cortex metrics or pod status before moving on to more expensive or invasive actions such as searching Splunk or replaying an API request.

We could encode these procedures directly as step-by-step instructions in `SKILL.md`, but that would make the execution path unnecessarily rigid.

What we actually cared about was not the exact sequence of operations, but the **constraints between them**.

For example:

```plain
lookup_runbook
├── query_cortex
├── search_splunk
└── check_pods

search_splunk
└── call_upstream_api
```

The model should still be free to decide whether it needs `query_cortex`, `search_splunk`, `check_pods`, or some combination of them. We only need to guarantee that a tool is not made available until its prerequisites have completed.

So instead of hard-coding an execution sequence, we added declarative **tool dependencies** to the skill definition:

![](/assets/img/uploads/ChatGPT%20Image%20Sep%2022%2C%202026%2C%2007_43_53%20PM.png "skill with tool dependency")

This gave us a few simple execution rules:

- A tool becomes eligible only after all of its prerequisite tools have completed successfully.
- Tools whose prerequisites are already satisfied can be exposed to the model as the current **eligible frontier**.
- Tools in the same frontier have no dependency relationship with one another, so independent calls can be executed concurrently when it is safe to do so.
- Dependency definitions must remain acyclic; otherwise the graph contains no valid execution order.

This turns the tool constraints into a `directed acyclic graph (DAG)`, where nodes represent tool capabilities and directed edges represent prerequisite relationships.

The agent loop still decides **what to do next**, but the graph determines **what it is currently allowed to do**.

To maintain this eligible frontier efficiently, we use the same indegree-based idea behind `Kahn's Topological Sort`. Tools with an indegree of zero are initially eligible. When a prerequisite completes, we decrement the indegree of its dependents. Once a tool's remaining indegree reaches zero, it becomes available to the model.

This gave us a useful separation of responsibilities:

**The skill defines the constraints.**
**The graph manages eligibility.**
**The LLM chooses the path.**

The code looks like:

![](/assets/img/uploads/ChatGPT%20Image%20Sep%2022%2C%202026%2C%2007_39_01%20PM.png "Loop vs Graph - code comparison")

<figure class="video">
  <video controls preload="metadata" src="/assets/img/uploads/Untitled%20-%20September%2023%2C%202026%20at%2015.31.16%20%28720p%29.mp4"></video>
  <figcaption>This video visualize the agent graph when I ask our agent to traige an alert</figcaption>
</figure>
