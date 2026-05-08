# Template — Agent-Code

Usa questo template ogni volta che vuoi attivare **Agent-Code** (executor generico di implementazione) o **Agent-CodeRouter** (dispatcher che smista tra code e code-ui).

Copia il blocco sotto, compila le sezioni e incollalo nella chat con l'agente.

---

## Agente target

<!-- Scegli uno: Agent-CodeRouter (se non sei sicuro del tipo di task) | Agent-Code (logica, backend, algoritmi, strutture dati) | Agent-CodeUI (UI, accessibilità, ARIA, componenti visivi) -->
**Agente**: Agent-CodeRouter

---

## Tipo di task

<!-- Scegli uno: code | code-ui | routing (misto) -->
**Tipo**: code

---

## File coinvolti

<!-- Elenca i file esistenti da leggere prima di qualsiasi modifica. Usa percorsi relativi alla root del repo. -->
- `src/components/...`
- `src/context/...`
- `src/lib/types.ts`

---

## Obiettivo

<!-- Descrizione precisa e delimitata di cosa deve essere implementato.
     Sii specifico: cosa cambia, dove, perché. Niente scope aperto. -->

---

## Comportamento atteso

<!-- Come si comporta il sistema dopo il cambiamento. Include casi limite rilevanti. -->

---

## Vincoli obbligatori

<!-- Spunta solo quelli applicabili a questo task. -->

- [ ] Nessun refactor non richiesto — cambia solo il perimetro indicato
- [ ] Accessibilità: `aria-label`, `role`, `aria-live` dove serve; touch target ≥ 48×48 px
- [ ] TypeScript strict — nessun `any` implicito
- [ ] Nessun `console.log` (contesto MCP)
- [ ] Sicurezza: non esporre dati PIN/AES né logica di cifratura fuori da `src/lib/crypto*`
- [ ] Mobile-first, NVDA-friendly (output screen reader leggibile)

---

## Trade-off da dichiarare

<!-- Se esistono più approcci validi, indica quale preferisci oppure lascia che l'agente esponga le opzioni. -->
Lascia che l'agente dichiari il trade-off principale prima di procedere.

---

## Output atteso dall'agente

<!-- Cosa ti aspetti come risultato della sessione. -->
1. Diff minimo e coerente dei file modificati
2. Dichiarazione esplicita di cosa NON è stato toccato
3. Eventuali test o controlli da eseguire manualmente
4. Segnalazione di gap residui o dipendenze non coperte

---

## Note aggiuntive

<!-- Qualsiasi contesto extra: issue di riferimento, comportamento attuale da preservare, dipendenze critiche. -->
