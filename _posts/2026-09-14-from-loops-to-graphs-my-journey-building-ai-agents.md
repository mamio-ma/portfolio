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

My second journey started in October 2025, the background is we have 100+ tables stored in DataBricks Unity Catalog related to payment (contract, license, order, offer ... etc), and we want to build a chatbot for answering question for our customer. 

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

![](/portfolio/assets/img/uploads/ChatGPT%20Image%20Sep%2016%2C%202026%2C%2004_59_10%20PM.png "Example for answering question in slack")

### Building agent with skill-based agent loop

Starting from early 2026, the term "skill" has become more and popular, we decided to migrate based on several reasons:

- We want to enhance our agent to not just generating sql, but also triage oncall alerts, monitoring lag, create schedule and report. So we need a centralized place to manage our knowledge.
- Inspired by Andrej Karpathy's [llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), we build a similar thing: llm will incrementally persist / update a wiki while engineer is  coding without additional effort. And this will act as the skill - for our agent to use. Therefore our architecture need to reflect these changes.

Our architecture looks like:

![](/portfolio/assets/img/uploads/ChatGPT%20Image%20Sep%2017%2C%202026%2C%2004_59_38%20PM.png "Skill based agent loop architecture diagram")

We made a few changes:

- Our knowledges will be stored in skill, and the skill.md looks like:
![](/portfolio/assets/img/uploads/ChatGPT%20Image%20Sep%2019%2C%202026%2C%2006_13_33%20PM.png "Example skill format")Our smallest granularity is skill, which defines the boundary for the llm. In the agent loop, LLM will only orchestrate with the tool listed in the skill. 
- We refactor all our mcp tools into cli, in filesystem format. We did it since Models are great at navigating filesystems. Presenting tools as code on a filesystem allows models to read tool definitions on-demand, rather than reading them all up-front. 
- We remove the agent framework such as langgraph, since they often create extra layers of abstraction.

This is our code looks like:

```python
async def agent_loop(messages, skill_registry, tool_registry, run_context) -> AsyncGenerator[dict]:
      provider = get_llm_provider()
      yield {"type": "start"}

      # 1. ROUTE: one LLM call picks the skills
      skills = route_to_skill(messages, skill_registry)
      yield {"type": "message-metadata", "messageMetadata": {"skills": [s.name for s in skills]}}

      # 2. INJECT: skill bodies become the system prompt, their tools the tool list
      system_prompt = build_system_prompt(skills)
      tools = tool_registry.to_openai_tools(merge_allowed_tools(skills))
      conversation = provider.to_conversation(messages)

      # 3. EXECUTE: model turn -> tools -> model turn ... until no tool calls
      for _ in range(MAX_TOOL_ROUNDS):
          turn = None
          for event in provider.stream(system=system_prompt, conversation=conversation, tools=tools):
              match event:
                  case ReasoningDelta(text=t): yield {"type": "reasoning-delta", "delta": t}
                  case TextDelta(text=t):      yield {"type": "text-delta", "delta": t}
                  case TurnComplete():         turn = event
          yield {"type": "message-metadata", "messageMetadata": {"usage": turn.usage}}

          if not turn.tool_calls:
              break                                               # final answer

          conversation.append(turn.assistant_message)
          results = []
          for tc in turn.tool_calls:
              yield {"type": "tool-input-available", "toolCallId": tc.id, "toolName": tc.name, "input": tc.args}
              result = await run_in_executor(tool_registry.execute, tc.name, tc.args, run_context)
              yield {"type": "tool-output-available", "toolCallId": tc.id, "output": result}
              results.append((tc.id, result))
          conversation.append(provider.tool_results_message(results))
      else:
     
          yield {"type": "text-delta", "delta": MAX_ROUNDS_TEXT}

      yield {"type": "finish", "finishReason": "stop"}
```

### Shifting from loop to graph

We decided to migrate our harness from loop to graph because we find that sometimes there is a dependency via tool selection, but don't want to hard-code everything in skill.md. 

Let me explain more, for example, when we want to query a table, we want our agent to describe the table first, check the schema before actual query the table. Oncall is a more complex usecase, we want our agent to first lookup runbook, check cortex, pods to get more knowledge before doing more heavy lifting work such as querying splunk, replay the api call ... 

So there are actual some dependency via tool, but we don't want to hard-code it in our skill. Because we want to give llm more freedom (llm is getting more and more intelligent), and hard-code everything means if anything changes, we have to update the skill, which is also time-consuming. 

Therefore, we decided to migrate our agent harness from loop to graph, so instead of defining the `allowed_tools` in agent.md file, we will also provide the dependency in the skill:
