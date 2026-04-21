# 1 - Projects

## Scopo

Contiene i **documenti di design** per ogni nuova implementazione o feature del progetto Zecchino.

## Contenuto atteso

Un file per ogni implementazione significativa, con nome descrittivo. Esempio:

```
docs/1 - projects/
├── budget-alerts.md
├── savings-goal-tracking.md
├── encrypted-account-design.md
└── ...
```

## Struttura consigliata per ogni file

```markdown
# [Nome Feature]

## Obiettivo
## User stories
## Wireframe / flusso
## Vincoli e requisiti
## Decisioni architetturali
## Dipendenze
```

## Funzionalità nel sistema di sviluppo

Questa cartella è il punto di ingresso del ciclo **Design → Plan → Code → Validate**.
Ogni file qui deve esistere **prima** che inizi l'implementazione corrispondente.
I documenti di design vengono referenziati dai file in `2 - coding plans/` e nei TODO specifici in `3 - todo lists/`.
