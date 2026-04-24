# P16 — Coding Plan: Risoluzione vulnerabilità dipendenze

> Documento operativo. Nessun file di codice sorgente viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 16 — **Terzo passo post-refactoring** — gate di sicurezza dipendenze  
> Design di riferimento: `docs/1 - projects/P16-dependency-audit-design.md`  
> Data: 24 aprile 2026

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P15.
- Questo passo è **esclusivamente di sicurezza dipendenze**: nessun file sotto `src/` viene toccato. Il comportamento dell'app è completamente invariato.
- **File modificati**: `package.json` (constraint di versione di `vite` aggiornato) e `package-lock.json` (aggiornamento automatico conseguente).
- **Nessun nuovo file creato** nel repository eccetto i documenti di questo passo.
- **Strategia adottata**: puntuale e incrementale — una vulnerabilità/gruppo alla volta, con verifica build + lint + audit dopo ogni modifica. `npm audit fix` **non è applicabile** in questo passo (vedi AI3).
- **Aggiornamenti major non autorizzati**: qualsiasi vulnerabilità che richieda un salto di versione major viene accettata temporaneamente con documentazione e proposta di passo separato (design §5.5 e §6).
- `.github/` è protetto da `framework-guard.instructions.md`: nessuna operazione di questo passo lo tocca.

### ⚠️ Nota fondamentale: conteggio vulnerabilità diverso dal design

Il documento di design (e il report diagnostico originale, §3.2) stimava 5 vulnerabilità al momento della diagnosi. L'esecuzione di `npm audit` sul branch `refactoring-architettura` al 24 aprile 2026 ha rilevato **9 vulnerabilità (3 moderate, 6 high)** su 9 librerie distinte. Le librerie citate nel report diagnostico come "probabili candidate" (octokit, @octokit/core, marked, d3/recharts) **non compaiono** nell'output attuale di `npm audit`. Il registro degli advisory npm è aggiornato continuamente: la lista reale da risolvere è sempre e solo quella prodotta da `npm audit` al momento dell'esecuzione, non quella stimata in fase di design.

### File che restano invariati

| File / Area | Categoria |
|---|---|
| Tutto `src/` | Codice applicativo — non toccato |
| `eslint.config.js` | Configurazione ESLint creata in P15 — non toccata |
| `tsconfig.json` | Configurazione TypeScript |
| `tailwind.config.js` | Configurazione stili |
| `components.json`, `theme.json`, `index.html` | Configurazione tool |
| `runtime.config.json`, `spark.meta.json` | Configurazione Spark |
| `README.md`, `CHANGELOG.md`, `SECURITY.md`, `LICENSE` | Documentazione standard repo |
| `.github/` | Protetto da `framework-guard.instructions.md` |

### Tabella riepilogativa

| Operazione | File | Note |
|---|---|---|
| Modificato | `package.json` | Constraint `vite`: `^7.2.6` → `^7.3.2` (minor bump autorizzato) |
| Modificato indirettamente | `package-lock.json` | Aggiornamento automatico dell'installazione |
| Modificati sotto `src/` | — | **0 file** |

---

## Ambiguità rilevate

Le seguenti ambiguità sono state **verificate sul repository reale** sul branch `refactoring-architettura` tramite `npm audit`, `npm audit --json`, `npm audit fix --dry-run` e `npm ls` prima della stesura di questo piano.

---

### AI1 — Fotografia aggiornata di `npm audit`: lista precisa delle vulnerabilità

**Verifica eseguita**: `npm audit --json` sul branch `refactoring-architettura`. Output analizzato campo per campo.

**Snapshot baseline (AI6)**: **9 vulnerabilità — 3 moderate, 6 high, 0 critical, 0 low.**

**Tabella completa delle vulnerabilità rilevate:**

| # | Libreria | Versione installata | Range vulnerabile | Gravità | isDirect | Advisory URL principali |
|---|---|---|---|---|---|---|
| 1 | `vite` | `7.3.2` | `7.0.0 – 7.3.1` | high (3 advisory) | false | GHSA-4w7w-66w2-5vf9, GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583 |
| 2 | `flatted` | `3.4.2` | `<=3.4.1` | high (2 advisory) | false | GHSA-25h7-pfq9-p65f, GHSA-rf6f-7fwh-wjgh |
| 3 | `lodash` | `4.18.1` | `<=4.17.23` | high (2 advisory) | false | GHSA-r5fr-rjxr-66jc, GHSA-f23m-r3pf-42rh |
| 4 | `minimatch` | `3.1.5` / `9.0.9` | `<=3.1.3 \|\| 9.0.0–9.0.6` | high (6 advisory) | false | GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74 |
| 5 | `path-to-regexp` | `8.4.2` | `8.0.0 – 8.3.0` | high (2 advisory) | false | GHSA-j3q9-mxjg-w52f, GHSA-27v5-c462-wpq7 |
| 6 | `picomatch` | `4.0.4` | `4.0.0 – 4.0.3` | high (2 advisory) | false | GHSA-3v7f-55p6-f55p, GHSA-c2c7-rcm5-vvqj |
| 7 | `ajv` | `6.15.0` | `<6.14.0` | moderate | false | GHSA-2g4f-4pwh-qvx6 |
| 8 | `brace-expansion` | `1.1.14` / `2.1.0` | `<1.1.13 \|\| >=2.0.0 <2.0.3` | moderate | false | GHSA-f886-m6hf-6m8v |
| 9 | `uuid` | `11.1.0` | `<14.0.0` | moderate | **true** | GHSA-w5hq-g745-h8pq |

**Osservazione critica — "paradosso delle versioni installate"**: per 8 delle 9 vulnerabilità (tutte tranne `uuid`), la versione attualmente installata in `node_modules` (verificata con `npm ls`) si trova **già fuori dal range vulnerabile**. Ad esempio, `vite@7.3.2` è installato, ma il range vulnerabile è `7.0.0 – 7.3.1` (7.3.2 è la versione che risolve). Questo è probabilmente dovuto a entrate stale nel `package-lock.json` per versioni nested che npm audit rileva ma `npm ls` non mostra nel percorso principale. La sola vulnerabilità **genuinamente a una versione non sicura** è `uuid@11.1.0` (inferiore a 14.0.0).

---

### AI2 — Classificazione dipendenza diretta vs. transitiva

**Verifica eseguita**: `npm ls <pacchetto> --depth=3` per ogni libreria vulnerabile. Catene documentate.

| Libreria | Tipo | Catena di dipendenza completa |
|---|---|---|
| `vite` | Pseudo-diretta — `isDirect: false` per npm audit, ma `"vite": "^7.2.6"` è in `devDependencies` | `vite@^7.2.6` (devDep diretta) — anche: `@tailwindcss/vite` → `vite@7.3.2`, `@vitejs/plugin-react-swc` → `vite@7.3.2`, `@github/spark` → `vite@7.3.2` |
| `flatted` | Transitiva | `eslint@^9.28.0` → `file-entry-cache@8.0.0` → `flat-cache@4.0.1` → `flatted@3.4.2` |
| `lodash` | Transitiva | `recharts@^2.15.1` → `lodash@4.18.1` |
| `minimatch` | Transitiva (due istanze) | `eslint@^9.28.0` → `@eslint/config-array`, `@eslint/eslintrc` → `minimatch@3.1.5`; `typescript-eslint@^8.38.0` → `@typescript-eslint/typescript-estree` → `minimatch@9.0.9`; `eslint-plugin-jsx-a11y@6.10.2` → `minimatch@3.1.5` |
| `path-to-regexp` | Transitiva | `@github/spark@>=0.43.1` → `express@5.2.1` → `router@2.2.0` → `path-to-regexp@8.4.2` |
| `picomatch` | Transitiva | `vite@7.3.2` → `fdir@6.5.0` → `picomatch@4.0.4`; `vite@7.3.2` → `tinyglobby@0.2.15` → `picomatch@4.0.4` |
| `ajv` | Transitiva | `eslint@^9.28.0` → `@eslint/eslintrc@3.3.3` → `ajv@6.15.0` |
| `brace-expansion` | Transitiva (due istanze) | `minimatch@3.1.5` → `brace-expansion@1.1.14`; `minimatch@9.0.9` → `brace-expansion@2.1.0` |
| `uuid` | **Diretta** — `"uuid": "^11.1.0"` in `dependencies` | `uuid@11.1.0` — nessuna catena, dipendenza diretta del progetto |

**Nota su `vite` e `isDirect: false`**: npm audit marca `vite` come `isDirect: false` perché individua il percorso vulnerabile attraverso le dipendenze transitive (`@tailwindcss/vite`, `@vitejs/plugin-react-swc`, `@github/spark`) piuttosto che attraverso la dichiarazione diretta. Questa è una particolarità del campo `isDirect` nel JSON di audit. La risoluzione rimane la stessa.

---

### AI3 — Dry-run prima di qualsiasi aggiornamento

**Verifica eseguita**: `npm audit fix --dry-run`.

**Risultato**: `up to date, audited 579 packages in 2s` — **zero pacchetti verrebbero modificati.**

**Analisi**: il dry-run dice "up to date" perché:
- Le 8 vulnerabilità transitive/pseudo-dirette (vite, flatted, lodash, minimatch, path-to-regexp, picomatch, ajv, brace-expansion) hanno le versioni installate già fuori dal range vulnerabile. npm considera il lockfile come aggiornato al massimo del range consentito dalle constraint in `package.json` e non trova nulla da cambiare.
- `uuid` richiederebbe `npm audit fix --force` (salto da v11 a v14, che è un breaking change dichiarato). Il dry-run senza `--force` non lo include.

**Conclusione (design §3.2 e §5.3)**: `npm audit fix` (senza `--force`) **non è applicabile** in questo passo. Il dry-run mostra aggiornamenti su zero pacchetti. L'approccio automatico è scartato; si procede con quello puntuale manuale (design §3.2).

---

### AI4 — Verifica breaking change

**Verifica eseguita**: analisi del tipo di aggiornamento richiesto per ogni libreria.

| Libreria | Da | A | Tipo di salto | Breaking change attesi |
|---|---|---|---|---|
| `vite` | constraint `^7.2.6` | constraint `^7.3.2` | Minor (7.2.x → 7.3.x) | Nessuno: `7.3.2` è già installato; la modifica è solo del range nel contratto dichiarato |
| `uuid` | `^11.1.0` | `14.0.0` | **Major (v11 → v14)** | Non verificabili in P16 — salto di 3 versioni major, richiede analisi del changelog dedicata |
| Tutte le altre | già alle versioni safe | — | — | Non applicabile: nessun aggiornamento da eseguire |

**Decisione per `uuid`**: poiché la correzione richiede un salto di versione major (11 → 14), l'aggiornamento è classificato come **fuori perimetro di P16** (design §5.5 e §6). L'aggiornamento major richiede: verifica del changelog v11→v12→v13→v14, analisi degli usi di `uuid` in `src/`, e un passo dedicato. `uuid` viene accettato temporaneamente con documentazione (vedi AI5).

---

### AI5 — Vulnerabilità non risolvibili: identificazione e documentazione

**Verifica eseguita**: analisi combinata di AI1, AI2, AI3, AI4.

**Vulnerabilità accettata temporaneamente:**

**`uuid@11.1.0` — GHSA-w5hq-g745-h8pq**
- Advisory: [https://github.com/advisories/GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- Titolo: "uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided"
- Versione vulnerabile installata: `11.1.0` (inferiore a `14.0.0`, che è la versione che risolve)
- Tipo: dipendenza **diretta** in `dependencies` (`"uuid": "^11.1.0"`)
- Motivo di non aggiornabilità in P16: il fix richiede un salto da v11 a v14 — tre salti di versione major. Non autorizzato in P16.
- Valutazione del rischio concreto per Zecchino: la vulnerabilità riguarda un buffer overflow nel metodo `v3`, `v5` o `v6` dell'API quando viene passato un argomento `buf` esplicito (es. `uuid.v4(null, buffer, offset)`). L'uso standard senza `buf` (`uuidv4()`, `uuidv7()`) **non è influenzato**. Zecchino usa uuid per la generazione di ID locali; la verifica dell'uso specifico in `src/` è delegata al Code agent. Il rischio operativo è basso.
- Proposta: aprire **P16b — Aggiornamento dipendenze non di sicurezza** o includere uuid nell'aggiornamento major v14 come passo dedicato dopo P16.

**Vulnerabilità transitive con versioni già safe (da investigare):**

Le seguenti 8 vulnerabilità mostrano versioni installate già fuori dal range vulnerabile (confermate con `npm ls`), ma npm audit le segnala ancora. Sono state investigate nella Sotto-operazione 1. La strategia è:

1. Eseguire `npm install` per rigenerare il lockfile → re-run `npm audit`
2. Se ancora presenti, aggiungere `overrides` in `package.json` per forzare le versioni sicure
3. Se ancora presenti dopo gli overrides, accettare con documentazione

| Libreria | Versione installata | Range vulnerabile | Versione safe | Motivazione del persist |
|---|---|---|---|---|
| `vite` | `7.3.2` | `7.0.0–7.3.1` | `7.3.2`+ | Constraint `^7.2.6` include il range vulnerabile; aggiornare a `^7.3.2` + npm install |
| `flatted` | `3.4.2` | `<=3.4.1` | `3.4.2`+ | Stale lockfile entry per versione nested |
| `lodash` | `4.18.1` | `<=4.17.23` | `4.17.24`+ | Stale lockfile entry per versione nested |
| `minimatch` | `3.1.5` / `9.0.9` | `<=3.1.3 \|\| 9.0.0–9.0.6` | `3.1.4`+ / `9.0.7`+ | Stale lockfile entry |
| `path-to-regexp` | `8.4.2` | `8.0.0–8.3.0` | `8.4.0`+ | Stale lockfile entry nested in `@github/spark` |
| `picomatch` | `4.0.4` | `4.0.0–4.0.3` | `4.0.4`+ | Stale lockfile entry nested in vite deps |
| `ajv` | `6.15.0` | `<6.14.0` | `6.14.0`+ | Stale lockfile entry nested in eslint |
| `brace-expansion` | `1.1.14` / `2.1.0` | `<1.1.13 \|\| >=2.0.0 <2.0.3` | `1.1.13`+ / `2.0.3`+ | Stale lockfile entry nested |

---

### AI6 — Snapshot pre-aggiornamento

Già documentato in AI1. Riepilogo:

| Livello | Conteggio |
|---|---|
| `critical` | 0 |
| `high` | 6 |
| `moderate` | 3 |
| `low` | 0 |
| **Totale** | **9** |

---

## Rischi

### R1 — Breaking change da aggiornamento `vite` — 🟢 Basso

L'unico aggiornamento effettivo a `package.json` è il constraint di `vite` da `^7.2.6` a `^7.3.2`. Poiché `vite@7.3.2` è già installato e in uso, questo aggiornamento non cambia la versione in uso. Non ci sono breaking change attesi.

**Mitigazione**: `npm run build` dopo `npm install` — deve passare esattamente come prima.

### R2 — `npm audit fix` che modifica più del previsto — 🟢 Non applicabile

Il dry-run (AI3) ha confermato che `npm audit fix` farebbe zero modifiche. Il rischio di scope creep da `npm audit fix` è neutralizzato: non si usa l'approccio automatico.

### R3 — Interruzione del lint dopo aggiornamento — 🟢 Basso

L'unica modifica a `package.json` riguarda `vite`, che non è un plugin ESLint. La configurazione ESLint creata in P15 non è influenzata. `npm run lint` deve restituire exit code 0 con gli stessi 59 warning del baseline P15.

**Mitigazione**: `npm run lint` dopo ogni modifica — nessun errore di configurazione atteso.

### R4 — Vulnerabilità transitive non risolvibili → persist nel lockfile — 🟡 Medio

Se dopo `npm install` le 8 vulnerabilità transitive persistono in `npm audit`, le opzioni disponibili sono `overrides` in `package.json` oppure accettazione documentata. Gli overrides forzano versioni che le dipendenze dirette non hanno necessariamente testato.

**Mitigazione**: se si usano gli overrides, verificare che `npm run build` passi dopo ogni override aggiunto. Se build si rompe, rimuovere l'override e accettare la vulnerabilità con documentazione.

### R5 — Modifica accidentale di file sotto `src/` — 🔴 Alto

P16 non deve toccare nessun file sotto `src/`. Qualsiasi modifica a `src/` invaliderebbe la premessa del passo.

**Mitigazione**: `git status` al termine delle operazioni — nessun file sotto `src/` deve apparire come modificato.

### R6 — `uuid` richiede major jump — 🟡 Medio

`uuid` è l'unica vulnerabilità genuinamente non risolta in P16. Il rischio operativo è basso (design §3.1, tabella livelli), ma la vulnerabilità resterà segnalata in `npm audit` dopo il passo.

**Mitigazione**: accettazione documentata con advisory e valutazione del rischio. Il passo è completato anche con questa vulnerabilità residua documentata.

---

## Passo unico — Risoluzione vulnerabilità dipendenze

### Rischio prevalente: 🔴 (R5, integrità repository) — 🟡 (R4, transitive)
### Prerequisito: P01–P15 completati; branch `refactoring-architettura`

---

### Schema riepilogativo

```
Passo 16 — Risoluzione vulnerabilità dipendenze
│
├── Sotto-operazione 1 — Analisi e classificazione
│   ├── npm audit (snapshot baseline: 9 vuln, 3 mod + 6 high)
│   ├── npm audit --json (classificazione per ogni vuln)
│   ├── npm audit fix --dry-run (risultato: "up to date" — zero modifiche)
│   ├── npm ls per ogni libreria (catene di dipendenza)
│   └── Tabella di strategia compilata
│
├── Sotto-operazione 2 — Aggiornamenti
│   ├── Gruppo A: vite — constraint ^7.2.6 → ^7.3.2 + npm install
│   │   └── Verifica: build ✓ lint ✓ audit (vite non più segnalata?)
│   ├── Gruppo B: 7 transitive — npm install + re-check
│   │   ├── Se persistono: overrides puntuali
│   │   └── Se persistono nonostante overrides: accettazione documentata
│   └── uuid — non aggiornabile in P16 (major) → accettazione documentata
│
└── Sotto-operazione 3 — Verifica finale e documentazione
    ├── npm audit (confronto con baseline)
    ├── Documentazione risultati (risolte + accettate)
    ├── npm run build → exit 0
    ├── npm run lint → exit 0
    └── git status → solo package.json e package-lock.json
```

---

### Sotto-operazione 1 — Analisi e classificazione (COMPLETATA)

> **Nota**: questa sotto-operazione è già stata eseguita dall'Agent-Plan per produrre questo coding plan. I dati reali di `npm audit` sono documentati nelle sezioni AI1–AI6. Il Code agent può saltare le verifiche di analisi e procedere direttamente alla Sotto-operazione 2, usando le tabelle di questo piano come riferimento.

I comandi eseguiti e i loro output sono documentati nelle sezioni AI sopra. In sintesi:

```
npm audit                       → 9 vulnerabilità (3 moderate, 6 high)
npm audit --json                → classificazione completa con catene
npm audit fix --dry-run         → "up to date" — zero modifiche automatiche
npm ls <pacchetto> --depth=3    → catene di dipendenza verificate
```

**Tabella di strategia:**

| Libreria | Versione attuale | Versione sicura | Gravità | Tipo | Strategia adottata |
|---|---|---|---|---|---|
| `vite` | `7.3.2` (installed), constraint `^7.2.6` | `7.3.2`+ | high | Pseudo-diretta | Aggiornare constraint in `package.json`: `^7.2.6` → `^7.3.2`; `npm install` |
| `flatted` | `3.4.2` (installed, safe) | `3.4.2`+ | high | Transitiva | `npm install` per refresh lockfile; se persiste → override; se ancora → accettazione |
| `lodash` | `4.18.1` (installed, safe) | `4.17.24`+ | high | Transitiva | `npm install`; se persiste → override; se ancora → accettazione |
| `minimatch` | `3.1.5` / `9.0.9` (installed, safe) | `3.1.4`+ / `9.0.7`+ | high | Transitiva | `npm install`; se persiste → override; se ancora → accettazione |
| `path-to-regexp` | `8.4.2` (installed, safe) | `8.4.0`+ | high | Transitiva | `npm install`; se persiste → override; se ancora → accettazione |
| `picomatch` | `4.0.4` (installed, safe) | `4.0.4`+ | high | Transitiva | `npm install`; se persiste → override; se ancora → accettazione |
| `ajv` | `6.15.0` (installed, safe) | `6.14.0`+ | moderate | Transitiva | `npm install`; se persiste → override; se ancora → accettazione |
| `brace-expansion` | `1.1.14` / `2.1.0` (installed, safe) | `1.1.13`+ / `2.0.3`+ | moderate | Transitiva | `npm install`; se persiste → override; se ancora → accettazione |
| `uuid` | `11.1.0` (**VULNERABILE**, < 14.0.0) | `14.0.0` (major) | moderate | Diretta | **Non aggiornabile in P16** — major jump v11→v14. Accettata con documentazione. Advisory: GHSA-w5hq-g745-h8pq |

**Verifica intermedia 1:**
- Tabella di strategia compilata ✓
- Snapshot baseline documentato ✓ (9 vuln: 3 mod + 6 high)
- Dry-run letto ✓ ("up to date", zero modifiche automatiche)

---

### Sotto-operazione 2 — Aggiornamenti

> ⚠️ **Principio fondamentale**: verificare `npm run build` e `npm run lint` dopo ogni gruppo di modifiche — mai alla fine di tutte le modifiche in blocco.  
> ⚠️ **Nessun file sotto `src/`** deve essere modificato in nessuna fase di questa sotto-operazione.  
> ⚠️ **Nessun aggiornamento major**: se un aggiornamento richiede un salto major, documentarlo come fuori perimetro e procedere.

#### Gruppo A — `vite`: aggiornamento constraint (autorizzato)

`vite` è dichiarata in `devDependencies` con constraint `"^7.2.6"`. Il range `^7.2.6` include versioni da `7.2.6` a `7.3.1` che sono vulnerabili (GHSA-4w7w-66w2-5vf9, GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583). La versione installata è già `7.3.2` (sicura), ma il constraint dichiarato ammette versioni vulnerabili.

**Azione**: aggiornare il constraint di `vite` in `package.json` da `^7.2.6` a `^7.3.2`:

```json
// In devDependencies di package.json — modificare questo valore:
"vite": "^7.3.2"
```

Poi eseguire:
```
npm install
```

Poiché `7.3.2` è già l'ultima disponibile nel range `^7`, `npm install` non cambierà la versione installata ma aggiornerà il lockfile per riflettere il nuovo constraint.

Verificare dopo:
```
npm run build    // atteso: exit 0
npm run lint     // atteso: exit 0, stessi 59 warning di P15
npm audit        // verificare: vite non più segnalata?
```

> ⚠️ Se `npm run build` si rompe dopo questa modifica: rollback di `vite` al constraint originale `^7.2.6` e documentare come fuori perimetro.

#### Gruppo B — 7 vulnerabilità transitive: refresh lockfile + overrides se necessario

**Step B1: refresh del lockfile**

Dopo il Gruppo A, eseguire un nuovo `npm install` (potrebbe già essere stato fatto). Poi:
```
npm audit
```

Verificare se le 7 vulnerabilità transitive (flatted, lodash, minimatch, path-to-regexp, picomatch, ajv, brace-expansion) sono ancora segnalate. Come documentato in AI1, le versioni installate sono già sicure — il persist potrebbe essere dovuto a entrate stale nel lockfile che `npm install` ha risolto.

**Caso B1a — vulnerabilità sparite dopo npm install**: documentare nella Tabella risultato finale come "risolte da lockfile refresh". Procedere alla Sotto-operazione 3.

**Caso B1b — vulnerabilità ancora presenti**: procedere con Step B2.

**Step B2: overrides per vulnerabilità transitive persistenti**

Se le vulnerabilità transitive persistono nonostante le versioni installate siano sicure, aggiungere una sezione `overrides` in `package.json` per ogni libreria ancora segnalata. Questo forza npm a usare le versioni sicure in tutti i contesti della catena di dipendenza.

```json
// Aggiungere in package.json (SOLO per le librerie ancora segnalate):
"overrides": {
  "flatted": "^3.4.2",
  "lodash": "^4.17.24",
  "minimatch": "^3.1.4",
  "path-to-regexp": "^8.4.0",
  "picomatch": "^4.0.4",
  "ajv": "^6.14.0",
  "brace-expansion": "^1.1.13"
}
```

> ⚠️ Aggiungere SOLO gli overrides per le librerie ancora segnalate dopo B1, non tutti in blocco. Se B1 ha già risolto alcune, non aggiungere i loro overrides.  
> ⚠️ Ogni override inserito va documentato nel coding plan con il motivo.

Dopo ogni override aggiunto:
```
npm install
npm run build    // exit 0 obbligatorio
npm run lint     // exit 0 obbligatorio
npm audit        // verificare riduzione vulnerabilità
```

> ⚠️ Se `npm run build` si rompe dopo un override: rimuovere quell'override specifico e documentare la libreria come "non correggibile con override in P16" con motivazione.

**Caso B2a — overrides risolvono il problema**: documentare nella Tabella risultato finale. Rimuovere gli overrides che non sono stati necessari (non lasciare overrides inutili).

**Caso B2b — alcune vulnerabilità persistono nonostante overrides**: accettare con documentazione. Vedere il trattamento di uuid per il formato di accettazione.

**Verifica intermedia 2** (dopo ogni aggiornamento del Gruppo B):
- `npm run build` exit 0
- `npm run lint` exit 0 (comportamento invariato rispetto a P15)
- la vulnerabilità oggetto della modifica non più presente in `npm audit` (o documentata come accettata)

#### Gruppo C — `uuid`: accettazione documentata

`uuid@11.1.0` è una dipendenza diretta dichiarata come `"^11.1.0"`. La vulnerabilità GHSA-w5hq-g745-h8pq richiede la versione `14.0.0` come fix — tre salti di versione major (v11→v12→v13→v14). Non autorizzato in P16 (design §5.5 e §6).

**Accettazione documentata:**
- Advisory: [https://github.com/advisories/GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- Titolo: "Missing buffer bounds check in v3/v5/v6 when buf is provided"
- Motivazione dell'accettazione: fix richiede major version jump v11→v14, fuori perimetro P16
- Rischio concreto: basso — la vulnerabilità è attivabile solo se l'API viene chiamata con il parametro `buf` esplicito. Verifica finale eseguita: nessun import diretto di `uuid` in `src/`; gli ID applicativi sono generati tramite `generateId()` in `src/lib/helpers.ts` e consumati da `src/context/AppDataContext.tsx`.
- Proposta: passo dedicato per l'aggiornamento a `uuid@14.x` con analisi del changelog e verifica degli usi in `src/`.

---

### Sotto-operazione 3 — Verifica finale e documentazione

> Eseguire dopo che tutti gli aggiornamenti del Gruppo A, B e C sono stati completati.

**3.1 — Confronto con baseline**

```
npm audit
```

Confrontare con il baseline (9 vulnerabilità, 3 moderate + 6 high). Compilare la Tabella risultato finale qui sotto con i dati reali.

**3.2 — Documentazione vulnerabilità residue**

Per ogni vulnerabilità ancora segnalata, documentare:
- Advisory URL
- Motivazione dell'accettazione
- Valutazione del rischio concreto per Zecchino
- Proposta di risoluzione futura

**3.3 — Verifica build e lint**

```
npm run build    // atteso: exit 0
npm run lint     // atteso: exit 0, comportamento identico a P15 (59 warning)
```

**3.4 — Verifica integrità repository**

```
git status
```

Atteso: solo `package.json` e `package-lock.json` come modificati. **Nessun file sotto `src/`.**

---

## Tabelle di tracking

### Tabella snapshot baseline (pre-aggiornamento)

Compilata dall'Agent-Plan tramite `npm audit` sul branch `refactoring-architettura`:

| Livello | Conteggio baseline (24 aprile 2026) |
|---|---|
| `critical` | 0 |
| `high` | 6 |
| `moderate` | 3 |
| `low` | 0 |
| **Totale** | **9** |

### Tabella risultato finale

| Libreria | Versione prima | Versione dopo | Esito | Note |
|---|---|---|---|---|
| `vite` | constraint `^7.2.6` | constraint `^7.3.2` | ✅ Risolta | `npm audit` non segnala piu `vite`; lockfile aggiornato a `vite@7.3.2` |
| `flatted` | `3.4.2` (safe) | `3.4.2` (override) | ⚠️ Accettata | Override aggiunto, ma `npm audit` continua a segnalarla nonostante la versione installata sia gia sicura |
| `lodash` | `4.18.1` (safe) | `4.18.1` (override) | ⚠️ Accettata | Override aggiunto, ma `npm audit` continua a segnalarla nonostante la versione installata sia gia sicura |
| `minimatch` | `3.1.5` / `9.0.9` (safe) | `3.1.5` / `9.0.9` (override anche nested) | ⚠️ Accettata | Override generale piu override nested per `@typescript-eslint/typescript-estree`; advisory ancora presenti in `npm audit` |
| `path-to-regexp` | `8.4.2` (safe) | `8.4.2` (override) | ⚠️ Accettata | Override aggiunto, ma `npm audit` continua a segnalarla |
| `picomatch` | `4.0.4` (safe) | `4.0.4` (override) | ⚠️ Accettata | Override aggiunto, ma `npm audit` continua a segnalarla |
| `ajv` | `6.15.0` (safe) | `6.15.0` (override) | ⚠️ Accettata | Override aggiunto, ma `npm audit` continua a segnalarla |
| `brace-expansion` | `1.1.14` / `2.1.0` (safe) | `1.1.14` (override) | ⚠️ Accettata | Lockfile riallineato su versione sicura, ma advisory ancora presenti in `npm audit` |
| `uuid` | `11.1.0` (vulnerabile) | `11.1.0` (non aggiornato) | ⚠️ Accettata | Major jump v11→v14 fuori perimetro P16; nessun uso diretto di `uuid` in `src/`; advisory: GHSA-w5hq-g745-h8pq |

### Note di chiusura

- `npm run build` finale: PASS (exit code 0)
- `npm run lint` finale: PASS (exit code 0, 59 warning, 0 error, comportamento invariato rispetto a P15)
- `npm audit` finale: 8 vulnerabilita residue (5 high, 3 moderate)
- Vulnerabilita residue documentate: `ajv`, `brace-expansion`, `flatted`, `lodash`, `minimatch`, `path-to-regexp`, `picomatch`, `uuid`
- Motivazione delle residue transitive: `npm audit` continua a segnalarle nonostante versioni installate/forzate gia fuori dal range vulnerabile; accettazione documentata in P16, con riferimento agli advisory elencati in AI1

### Conteggio finale `npm audit`

| Livello | Baseline | Dopo P16 | Delta |
|---|---|---|---|
| `critical` | 0 | 0 | 0 |
| `high` | 6 | 5 | -1 |
| `moderate` | 3 | 3 | 0 |
| **Totale** | **9** | **8** | **-1** |
