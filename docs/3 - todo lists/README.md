# 3 - Todo Lists

## Scopo

Contiene i **file TODO specifici per ogni implementazione** del progetto Zecchino.
Ogni file è autonomo e traccia i task di una singola feature o sprint.

## Contenuto atteso

```
docs/3 - todo lists/
├── todo-budget-alerts.md
├── todo-savings-goal.md
├── todo-accessibility-audit.md
└── ...
```

## Struttura consigliata per ogni file

```markdown
# TODO: [Nome Feature / Sprint]

**Data creazione**: YYYY-MM-DD  
**Riferimento plan**: `docs/2 - coding plans/plan-[nome].md`  
**Stato**: in-progress | completed | blocked

## Task
- [ ] Task 1
- [ ] Task 2
- [x] Task completato

## Note
```

## Funzionalità nel sistema di sviluppo

Ogni file TODO è **creato all'avvio di una nuova implementazione** e **chiuso (archiviato) al completamento**.
Il file master `docs/todo.md` nella root di `docs/` aggrega e coordina tutti i TODO attivi in questa cartella.
Non modificare direttamente `docs/todo.md` per task specifici: usa i file individuali qui.
