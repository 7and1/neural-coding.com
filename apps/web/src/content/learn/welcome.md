---
title: "Welcome: From Brain to Code"
description: "What this project is building, and how to use the simulators + pipeline."
publishedAt: "2026-02-03"
tags: ["neural-coding", "snn", "tooling"]
---

## What is neural coding?

**Neural coding** is the study of how information is represented and transmitted by neurons. Practically, we care about:

1. What the *inputs* are (stimuli / upstream spikes / currents)
2. What the *outputs* are (spike trains, rates, timing patterns)
3. What is *preserved* (features, uncertainty, invariants)

## What you'll find here

- `/playground`: interactive simulators (LIF neuron, Hebbian synapse dynamics)
- `/learn`: article library that emphasizes reproducible steps and code
- `/api`: a stable interface for simulator runs + paper/post ingestion

## Reproducibility principle

If an explanation cannot be expressed as:

```json
{ "model": "lif", "params": { "R": 1e7, "C": 1e-9, "V_th": -0.05 }, "seed": 42 }
```

...then it is not done yet.

