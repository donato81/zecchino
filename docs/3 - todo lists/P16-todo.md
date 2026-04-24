# P16 — Todo List: Risoluzione vulnerabilità dipendenze

> Checklist operativa sequenziale per il Pacchetto 16 — Risoluzione vulnerabilità dipendenze.  
> Coding Plan di riferimento: `docs/2 - coding plans/P16-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P16-dependency-audit-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [x] Leggere `docs/2 - coding plans/P16-coding-plan.md` per intero
- [x] ⚠️ **Questo passo modifica SOLO `package.json` e `package-lock.json`** — nessun file sotto `src/`; `eslint.config.js` non toccato
- [x] ⚠️ **`.github/` è protetto** — non aprire, non modificare nulla sotto `.github/`
- [x] ⚠️ **Aggiornamenti major NON autorizzati** in questo passo — se una vulnerabilità richiede un salto major, documentare come fuori perimetro e aprire proposta passo separato
- [x] Verificare di essere sul branch `refactoring-architettura`:
  ```
  git branch --show-current
  ```
  Atteso: `refactoring-architettura`
- [x] Eseguire `git status` per confermare lo stato iniziale del repository (solo file documento P16 attesi come nuovi)
- [x] Prendere nota delle ambiguità già verificate nel coding plan:
  - [x] **AI1**: 9 vulnerabilità totali (3 moderate + 6 high) — diverso dalla stima del design (5)
  - [x] **AI2**: solo `uuid@11.1.0` è genuinamente a versione non sicura; le altre 8 hanno versioni installate già fuori dal range vulnerabile
  - [x] **AI3**: `npm audit fix --dry-run` → "up to date" — zero modifiche automatiche. `npm audit fix` **non è applicabile**
  - [x] **AI4**: `uuid` richiede salto major v11→v14 — non autorizzato
  - [x] **AI5**: `uuid` accettata temporaneamente; le 7 transitive da investigare con npm install + overrides se necessario
  - [x] **AI6**: snapshot baseline = 9 vuln (3 mod + 6 high)
- [x] Prendere nota dei rischi critici:
  - [x] **R5 🔴**: `git status` finale non deve mostrare nessun file sotto `src/` come modificato
  - [x] **R4 🟡**: se si usano gli overrides e `npm run build` si rompe → rollback override immediato, non correggere `src/`

---

## Passo unico — Sotto-operazione 1: Analisi e classificazione (PRE-COMPILATA)

> ⚠️ **Questa sotto-operazione è già stata eseguita dall'Agent-Plan** per produrre il coding plan. I dati reali di `npm audit` sono documentati nelle sezioni AI del coding plan. Eseguire i comandi di conferma per verificare che nulla sia cambiato tra la produzione del piano e l'esecuzione.

- [x] Confermare lo snapshot baseline:
  ```
  npm audit
  ```
  Atteso: 9 vulnerabilità (3 moderate, 6 high) — se il conteggio è diverso, rileggere il coding plan per capire i delta e adeguare la strategia
- [x] ⚠️ **Dry-run obbligatorio** — eseguire prima di qualsiasi modifica:
  ```
  npm audit fix --dry-run
  ```
  Atteso: "up to date" — zero pacchetti modificati. Se il dry-run mostra modifiche, interrompere e rileggere la strategia nel coding plan (AI3)
- [x] ⚠️ **Compilare la tabella di strategia** prima di passare alla Sotto-operazione 2 — non procedere senza aver classificato ogni vulnerabilità con la strategia adottata. La tabella è pre-compilata nel coding plan; verificare che corrisponda all'output reale di `npm audit`

### Verifica intermedia 1

- [x] Snapshot baseline confermato: 9 vuln (o aggiornato se diverso)
- [x] Dry-run confermato: zero modifiche automatiche
- [x] Tabella di strategia verificata o aggiornata
- [x] `uuid` classificato come "non aggiornabile in P16" (major jump v11→v14) — confermato

---

## Passo unico — Sotto-operazione 2: Aggiornamenti

> ⚠️ **Verificare `npm run build` e `npm run lint` dopo ogni singolo aggiornamento — non solo alla fine di tutti.**  
> ⚠️ Se build o lint si rompono → **rollback immediato** della modifica appena fatta. Non correggere `src/`.  
> ⚠️ **Nessun aggiornamento major** — se richiesto, documentare come fuori perimetro.  
> ⚠️ **Nessun file sotto `src/` deve essere modificato** in nessuna fase di questa sotto-operazione.

### 2.1 — Gruppo A: `vite` — aggiornamento constraint (autorizzato)

- [x] In `package.json`, sezione `devDependencies`, aggiornare il constraint di `vite`:
  - Da: `"vite": "^7.2.6"`
  - A: `"vite": "^7.3.2"`
- [x] Eseguire:
  ```
  npm install
  ```
- [x] ⚠️ Verificare build:
  ```
  npm run build
  ```
  Atteso: exit code 0. **Se si rompe → rollback (`"vite": "^7.2.6"` + npm install) e documentare come fuori perimetro.**
- [x] ⚠️ Verificare lint:
  ```
  npm run lint
  ```
  Atteso: exit code 0, comportamento invariato rispetto a P15 (59 warning)
- [x] Verificare audit:
  ```
  npm audit
  ```
  Annotare: `vite` è ancora segnalata? Il conteggio è sceso?

### Verifica intermedia 2.1

- [x] `npm run build` → exit 0
- [x] `npm run lint` → exit 0 (59 warning, invariato)
- [x] `npm audit` rieseguito — annotare nuovo conteggio

### 2.2 — Gruppo B: vulnerabilità transitive — refresh lockfile

- [x] Il `npm install` del Gruppo A ha gia rigenerato il lockfile. Eseguire nuovamente `npm audit` per vedere se le 7 vulnerabilità transitive sono ancora presenti
- [x] ⚠️ Annotare quali vulnerabilità sono sparite e quali persistono:
  - `flatted`: ancora segnalata? ☑ Sì / ☐ No
  - `lodash`: ancora segnalata? ☑ Sì / ☐ No
  - `minimatch`: ancora segnalata? ☑ Sì / ☐ No
  - `path-to-regexp`: ancora segnalata? ☑ Sì / ☐ No
  - `picomatch`: ancora segnalata? ☑ Sì / ☐ No
  - `ajv`: ancora segnalata? ☑ Sì / ☐ No
  - `brace-expansion`: ancora segnalata? ☑ Sì / ☐ No

### 2.3 — Gruppo B: overrides per vulnerabilità transitive persistenti (se necessario)

> ⚠️ Eseguire questa sezione SOLO per le vulnerabilità ancora segnalate dopo la 2.2.  
> ⚠️ Aggiungere gli overrides UNO ALLA VOLTA, verificando build e lint dopo ognuno.  
> ⚠️ Non aggiungere overrides per librerie non più segnalate in 2.2.

Per ogni libreria ancora segnalata, aggiungere (o integrare) una voce in `"overrides"` in `package.json`:

```json
"overrides": {
  // Aggiungere solo le voci per le librerie ancora segnalate:
  "flatted": "^3.4.2",
  "lodash": "^4.17.24",
  "minimatch": "^3.1.4",
  "path-to-regexp": "^8.4.0",
  "picomatch": "^4.0.4",
  "ajv": "^6.14.0",
  "brace-expansion": "^1.1.13"
}
```

Per ogni override aggiunto:

- [x] Modificare `package.json` aggiungendo/integrando la sezione `overrides`
- [x] Eseguire `npm install`
- [x] ⚠️ Verificare build: `npm run build` → exit 0. **Se si rompe → rimuovere l'override e documentare la libreria come non correggibile con override in P16**
- [x] ⚠️ Verificare lint: `npm run lint` → exit 0
- [x] Verificare audit: `npm audit` → la vulnerabilità oggetto dell'override è sparita?

> ⚠️ Se una vulnerabilità persiste nonostante l'override: documentare con advisory URL e motivazione nella Tabella risultato finale del coding plan. Accettazione documentata è la risposta corretta.

### Verifica intermedia 2.3

- [x] Per ogni override aggiunto: `npm run build` → exit 0
- [x] Per ogni override aggiunto: `npm run lint` → exit 0
- [x] `npm audit` dopo tutti gli overrides: conteggio ridotto rispetto al baseline

### 2.4 — Gruppo C: `uuid` — accettazione documentata

- [x] Non modificare la versione di `uuid` in `package.json` (rimane `^11.1.0`)
- [x] ⚠️ **Documentare nella Tabella risultato finale** del coding plan:
  - [x] Advisory: [https://github.com/advisories/GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
  - [x] Motivazione: fix richiede `uuid@14.0.0`, salto major v11→v14, non autorizzato in P16
  - [x] Valutazione rischio: nessun import diretto di `uuid` in `src`; gli ID sono generati tramite `generateId()`
  - [x] Proposta: passo separato per aggiornamento a `uuid@14.x` con analisi changelog
- [x] ⚠️ Non lasciare l'accettazione implicita — deve essere esplicitamente documentata con advisory URL nel coding plan

---

## Verifica finale

### Sicurezza

- [x] `npm audit` non segnala le vulnerabilità risolte in questo passo
- [x] Le vulnerabilità accettate sono documentate nel coding plan con:
  - [x] Advisory URL
  - [x] Motivazione dell'accettazione
  - [x] Valutazione del rischio concreto
  - [x] Proposta di risoluzione futura
- [x] `uuid`: accettazione esplicitamente documentata con GHSA-w5hq-g745-h8pq

### Build e lint

- [x] `npm run build` passa (exit code 0)
- [x] `npm run lint` passa (exit code 0, comportamento invariato rispetto a P15 — stessi 59 warning o meno)

### Integrità repository

- [x] Nessun file sotto `src/` è stato modificato
- [x] `eslint.config.js` non è stato modificato
- [x] `git status` mostra solo `package.json` e `package-lock.json` come modificati (oltre ai file di documentazione di questo passo)
- [x] ⚠️ R5 verificato: zero file sotto `src/` in `git status`

### Tabelle del coding plan

- [x] **Tabella risultato finale** compilata con versioni prima/dopo per ogni libreria
- [x] **Conteggio finale `npm audit`** compilato (baseline vs. dopo P16, delta)

---

> **Nota finale**: il passo è completato correttamente anche se `uuid` rimane segnalato in `npm audit`, purché l'accettazione sia documentata con advisory URL e motivazione nel coding plan. Un `npm audit` con sole vulnerabilità documentate e accettate è un risultato valido per P16.

***

**Completato il 2026-04-24.**
**Gate di sicurezza dipendenze: vulnerabilita risolte/documentate.**
