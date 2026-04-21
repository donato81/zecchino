---
description: >
scf_protected: false
scf_file_role: "prompt"
name: Help Agente
scf_merge_priority: 10
scf_merge_strategy: "replace"
scf_version: "1.2.0"
spark: true
scf_owner: "spark-base"
---

Spiega come funziona l'agente ${input:Nome agente (es: Agent-Code, Agent-Design...)}.

Leggi il file .github/agents/${input:Nome agente (es: Agent-Code, Agent-Design...)}.md
e produci una spiegazione strutturata:

1. Scopo principale (1 riga)
2. Quando usarlo (trigger tipici)
3. Cosa produce in output
4. Gate di completamento
5. Comando per attivarlo direttamente
