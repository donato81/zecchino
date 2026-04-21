---
description: Checklist di reset contesto a inizio sessione per evitare assunzioni stale.
scf_protected: false
scf_file_role: "skill"
name: project-reset
scf_merge_priority: 10
scf_merge_strategy: "replace"
scf_version: "1.2.0"
spark: true
scf_owner: "spark-base"
---

# project-reset

All'inizio di una sessione:
- leggi `scf_get_project_profile()`;
- leggi `scf_get_global_instructions()`;
- controlla stato git in sola lettura;
- leggi solo i file rilevanti per il task corrente.