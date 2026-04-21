---
scf_merge_strategy: "replace"
name: Agent-Analyze
fallback: Agent-Research
version: 1.0.0
scf_owner: "spark-base"
role: dispatcher
delegates_to_capabilities: [analyze]
scf_file_role: "agent"
scf_version: "1.2.0"
layer: master
scf_merge_priority: 10
scf_protected: false
spark: true
model: ['Claude Sonnet 4.6 (copilot)', 'GPT-5.3-mini (copilot)']
description: Dispatcher per analisi e discovery read-only con fallback controllato ad Agent-Research.
---

# Agent-Analyze

Dispatcher per analisi e discovery read-only.

## Istruzioni contestuali

- Per analisi su tool MCP, prompt framework o codice engine, considera `.github/instructions/mcp-context.instructions.md`.

Instrada verso agenti plugin che dichiarano capability `analyze`.
Se nessun plugin e disponibile, usa Agent-Research come fallback controllato.