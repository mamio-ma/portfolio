---
layout: post
title: 'From Loops to Graphs: My Journey Building AI Agents'
date: 2026-09-13T22:45:00
description: How my agent architecture evolved from early prototypes to MCP, LangGraph, tool loops, skills, and graph-based orchestration
tags: []
toc: null
---

My first journey started in early 2025 because during that time we have a bunch of repeated task, where we need to diagnose batch ingestion failure. So I was thinking maybe we can build a chatbot (that time the word "agent" has not very popular) and help reduce the human effort. 

So I build a `prompt chaining` workflow using [CrewAI](https://crewai.com/) and picked LLama 3 served by OLLaMa:

![](/portfolio/assets/img/uploads/Screenshot%202026-09-13%20at%2011.01.39%20PM.png "Example prompt chaining workflow")
