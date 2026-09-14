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

![](/portfolio/assets/img/uploads/Screenshot%202026-09-14%20at%204.10.19%20PM.png "Genie Interface ")
