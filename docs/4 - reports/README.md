# 4 - Reports

## Scopo

Contiene i **report di analisi, audit e validazione** prodotti durante il ciclo di sviluppo di Zecchino.

## Contenuto atteso

```
docs/4 - reports/
├── audit-accessibility-2026-04.md
├── report-performance-build.md
├── security-review-pin-system.md
└── ...
```

## Tipologie di report

| Tipo | Descrizione |
|------|-------------|
| **Accessibility audit** | Verifica conformità TalkBack/VoiceView, ARIA, touch target |
| **Security review** | Analisi PIN, cifratura AES-256, superfici di attacco |
| **Performance** | Metriche build, bundle size, runtime |
| **Validation** | Esito fase Validate del ciclo implementativo |

## Struttura consigliata per ogni file

```markdown
# Report: [Titolo]

**Data**: YYYY-MM-DD  
**Tipo**: accessibility | security | performance | validation  
**Stato**: draft | final

## Sommario
## Risultati
## Problemi rilevati
## Azioni consigliate
```

## Funzionalità nel sistema di sviluppo

I report documentano l'**esito verificabile** di ogni fase di validazione.
Vengono prodotti da Agent-Validate o durante review manuali e referenziati nei TODO di chiusura.
