---
scf_merge_strategy: "replace"
name: Agent-Plan
fallback: Agent-Research
version: 1.0.0
scf_owner: "spark-base"
role: dispatcher
delegates_to_capabilities: [plan]
scf_file_role: "agent"
scf_version: "1.2.0"
layer: master
scf_merge_priority: 10
scf_protected: false
spark: true
model: ['Claude Sonnet 4.6 (copilot)', 'GPT-5.4 (copilot)']
description: Dispatcher per breakdown implementativi e checklist operative con fallback research.
---

# Agent-Plan

Dispatcher per breakdown implementativi e checklist operative.

## Istruzioni contestuali

- Per piani che toccano tool MCP, prompt framework o codice engine, considera `.github/instructions/mcp-context.instructions.md`.

Usa agenti plugin con capability `plan`; se mancanti, produce un fallback tramite Agent-Research prima di proporre il piano.