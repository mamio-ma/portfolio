---
layout: post
title: 'From Loops to Graphs: My Journey Building AI Agents'
date: 2026-09-13T22:45:00
description: How our agent architecture evolved from early prototypes to MCP, LangGraph, agent loops, skills, and graph-based orchestration
tags: []
toc: null
---

### Early prototypes - build deterministic chatbot using prompt chaining workflow

My first journey started in early 2025 because during that time we have a bunch of repeated task, where we need to diagnose batch ingestion failure. So I was thinking maybe we can build a chatbot (that time the word "agent" has not very popular) and help reduce the human effort. 

So I build a `prompt chaining` workflow using [CrewAI](https://crewai.com/) and picked LLama 3 served by OLLaMa:

![](/portfolio/assets/img/uploads/Screenshot%202026-09-13%20at%2011.01.39%20PM.png "Example prompt chaining workflow")

During that time, the model isn't very intelligent, therefore, in order to prevent hallucination, we have to make the workflow deterministic. So therefore, it is not very usefully for handling some very generic or vague use cases.

### Build agent orchestration using Langgraph 

My second journey started in September 2025, the background is we have 100+ tables stored in DataBricks Unity Catalog related to payment (contract, license, order, offer ... etc), and we want to build a chatbot for answering question for our customer. 

At first we are simply want to adopt [Genie](https://docs.databricks.com/aws/en/genie/), for those who doesn't use Genie before, Genie is a DataBricks feature that allows business teams to interact with their data using natural language. You can simply create a Genie space and fill in the table and some instruction and examples sql query which helps Genie generate a better sql query. 

![](/portfolio/assets/img/uploads/Screenshot%202026-09-14%20at%204.10.19%20PM.png "Genie Interface")

However, after I did some exploration, I found a few problems: 

- we can provide some instructions to help Genie understand our business logic, but genie starts to hallucinate when prompt is too much.
- We have so many tables (100+) and it becomes very difficult to help Genie differentiate between them.   

The solution is simple, instead of vertically scale (which means we have only one single Genie that can answer all the questions), we choose to do horizontally scale (which means we break down into multiple Genie, with each Genie focus on one particular business area (e.g. contract, license, order, offer ..))

![](/portfolio/assets/img/uploads/ChatGPT%20Image%20Sep%2016%2C%202026%2C%2003_36_34%20PM.png "Vertical Scale versus Horizontal Scale")

After this change, the answer becomes much better, but it comes with a new problem, how to differentiate between these Genie?

Inspired by Cursor that time, where you can host an [`mcp`](https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro) server, and cursor handles the orchestration. So I am thinking, can we also do the same thing on our end, basically wrapped our Genie api into tools and building an agent which do the  orchestration, and route to the tools.

This is what our code looks like:

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

![](/portfolio/assets/img/uploads/ChatGPT%20Image%20Sep%2016%2C%202026%2C%2004_02_49%20PM.png "Orchestrator - Worker pattern")

Afterwards, we also integrate with our slack channel so that our customer can simply ask question in slack:

![](/portfolio/assets/img/uploads/ChatGPT%20Image%20Sep%2016%2C%202026%2C%2004_18_59%20PM.png "example use case for answering question in slack")

### Building agent with skill-based agent loop
