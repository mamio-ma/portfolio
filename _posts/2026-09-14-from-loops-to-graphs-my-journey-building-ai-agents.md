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

### Stage 3 — Building an Agent with a Skill-Based Agent Loop

By early 2026, the idea of packaging reusable knowledge and capabilities into `skills` was becoming increasingly common in agent systems. As our use cases expanded, we decided to evolve the architecture again.

There were two main motivations:

- We wanted the agent to do more than generate SQL. It now needed to triage on-call alerts, investigate pipeline lag, create reporting schedules, generate reports, and support other operational workflows. As the scope grew, we needed a structured and version-controlled way to organize domain knowledge, procedures, and tools.
- We also wanted that knowledge to improve continuously as engineers worked. Rather than repeatedly encoding the same context into prompts, we started maintaining persistent Markdown-based knowledge that the agent could update over time and later reuse as part of its skills.

Andrej Karpathy’s [llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) later reinforced this idea: instead of rebuilding context from scratch for every request, an LLM can incrementally maintain a persistent knowledge base that becomes richer over time.

Our architecture looks like:

![](/assets/img/uploads/ChatGPT%20Image%20Sep%2017%2C%202026%2C%2004_59_38%20PM.png "Skill based agent loop architecture diagram")

We made a few changes:

- Our knowledge will be stored in skill, and the skill.md looks like:
![](/assets/img/uploads/ChatGPT%20Image%20Sep%2022%2C%202026%2C%2006_58_16%20PM.png "Example skill format")Each `SKILL.md` defined the instructions, domain knowledge, and tools available for a particular class of tasks.
- We refactored our MCP-based tools into CLI-backed capabilities organized through the filesystem. We did it since LLM is great at navigating filesystems. Presenting tools as code on a filesystem allows models to read tool definitions on-demand, rather than reading them all up-front. 
- We remove LangGraph from the agent runtime. since they often create extra layers of abstraction.

### Shifting from loop to graph

We decided to migrate our harness from loop to graph because we find that sometimes there is a dependency via tool selection, but don't want to hard-code everything in skill.md. 

Let me explain more, for example, when we want to query a table, we want our agent to describe the table first, check the schema before actual query the table. Oncall is a more complex usecase, we want our agent to first lookup runbook, check cortex, pods to get more knowledge before doing more heavy lifting work such as querying splunk, replay the api call ... 

So there are actual dependencies via tool, but we don't want to hard-code it in our skill. Because we want to give llm more freedom (llm is getting more and more intelligent), and hard-code everything means if anything changes, we have to update the skill, which is also time-consuming. 

Therefore, we decided to migrate our agent harness from loop to graph, so instead of defining the `allowed_tools` in agent.md file, we will also provide the dependency in the skill:

![](/assets/img/uploads/ChatGPT%20Image%20Sep%2022%2C%202026%2C%2007_43_53%20PM.png "skill with tool dependency")

And we also setup some rules:

- If tool A depends on tool B, then tool B will have to be execute first. 
- If all the predecessor has executed, the tool can be use. 
- Every layer of the graph cannot have tool which have predecessor tool not processed yet. 

Instead of hard-coding the sequence in skill, we only set the `tool dependency` in skill, in that way, llm can reuse the tool as long as it meet with our rules, since each layer it doesn't have tool dependency, each layer can run tool asynchronously.

So this will translate into a DAG, where each node represents a tool, and each edge represents the dependency of the tool. Then a very popular algorithm came into my mind: Topological sort. We will use `Kahn's topological sort` algorithm, where a tool will be released for llm where all the predecessor has been used.

![](/assets/img/uploads/ChatGPT%20Image%20Sep%2022%2C%202026%2C%2007_39_01%20PM.png "Loop vs Graph - code comparison")

<figure class="video">
  <video controls preload="metadata" src="/assets/img/uploads/Untitled%20-%20September%2023%2C%202026%20at%2015.31.16%20%28720p%29.mp4"></video>
  <figcaption>This video visualize the agent graph when I ask our agent to traige an alert</figcaption>
</figure>
