---
spark: true
scf_file_role: "config"
scf_version: "2.1.0"
scf_merge_strategy: "replace"
scf_protected: false
scf_owner: "scf-master-codecrafter"
scf_merge_priority: 20
---

# Changelog — scf-master-codecrafter

## [2.1.0] - 2026-04-15

### Added

- Ripristinato `Agent-Code` come executor generico del layer master per coprire richieste `code` quando non esiste un plugin linguaggio-specifico.

### Changed

- `Agent-CodeRouter` usa ora `Agent-Code` come fallback implementativo del master prima di ricorrere a `Agent-Research`.

### Compatibility

- Richiede `spark-base >= 1.1.0` e `spark-framework-engine >= 2.1.0`.

## [2.0.0] - 2026-04-15

### Changed

- Nuovo file `.github/AGENTS-master.md` per dichiarare gli agenti CORE-CRAFT del pacchetto.
- Il pacchetto diventa un plugin CORE-CRAFT sopra `spark-base`.
- Il manifest dichiara `dependencies: ["spark-base"]` e mantiene solo design, routing e contesto MCP.

### Removed

- Agenti base, instruction condivise, skill general-purpose e prompt framework migrati a `spark-base`.

### Compatibility

- Richiede `spark-base >= 1.0.0` e `spark-framework-engine >= 1.9.0`.

## [1.0.0] - 2026-04-10

### Added

- Prima release del layer master SCF.
- 7 agenti esecutori: Orchestrator v2.0, Git, Helper, Release, FrameworkDocs, Welcome, Research.
- 6 agenti dispatcher con fallback verso Agent-Research.
- Skill trasversali, instruction condivise e runtime state orchestratore.
- Supporto pattern multi-plugin M1 con `AGENTS-{plugin-id}.md`.

### Notes

- Richiede `spark-framework-engine >= 1.9.0`.
