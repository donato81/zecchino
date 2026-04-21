# 2 - Coding Plans

## Scopo

Contiene i **piani di implementazione tecnica** per ogni feature, derivati dai documenti di design in `1 - projects/`.

## Contenuto atteso

Un file per ogni implementazione, con breakdown di task tecnici, ordine di esecuzione e criteri di uscita. Esempio:

```
docs/2 - coding plans/
├── plan-budget-alerts.md
├── plan-savings-goal.md
└── ...
```

## Struttura consigliata per ogni file

```markdown
# Plan: [Nome Feature]

## Riferimento design
Link a `docs/1 - projects/[file].md`

## Breakdown task
- [ ] Task 1 — file/componente coinvolto
- [ ] Task 2
- ...

## Dipendenze tecniche
## Criteri di completamento
## Note implementative
```

## Funzionalità nel sistema di sviluppo

Questa cartella traduce le decisioni di design in **passi tecnici verificabili**.
Ogni piano deve avere un criterio di uscita chiaro per passare alla fase di validazione.
I piani sono collegati ai TODO specifici in `3 - todo lists/`.
