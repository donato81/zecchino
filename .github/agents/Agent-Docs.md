---
scf_merge_strategy: "replace"
name: Agent-Docs
fallback: Agent-Research
version: 1.0.0
scf_owner: "spark-base"
role: dispatcher
delegates_to_capabilities: [docs]
scf_file_role: "agent"
scf_version: "1.2.0"
layer: master
scf_merge_priority: 10
scf_protected: false
spark: true
model: ['GPT-5 mini (copilot)']
description: Dispatcher per sincronizzazione documentazione del progetto ospite tramite agenti plugin.
---

# Agent-Docs

Dispatcher per sincronizzazione documentazione del progetto ospite.

Instrada verso agenti plugin con capability `docs`.
Evita assunzioni su strumenti specifici come pytest, ruff o mypy.