# P30 — Coding Plan: Migrazione `budgetPercentages` a `useState`

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P30 — Blocco 6 (rimozione ultima `useKV` da `AppDataContext`)
> Design di riferimento: `docs/1 - projects/P30-migrazione-budgetpercentages-usestate.md`
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md` §4.7 e §6 Blocco 6
> Prerequisito diretto: `docs/1 - projects/P28-migrazione-appdatacontext-supabase.md`
> Pattern di riferimento logout/reset: `docs/2 - coding plans/P29-coding-plan.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-03

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P25, P26, P27, P28, P29, P31, P33.
- ⚠️ **Perimetro stretto — un solo file modificato:** `src/context/AppDataContext.tsx`. Nessun altro file sorgente viene toccato in questo pacchetto.
- ⚠️ **File protetti SCF:** i file sotto `.github/` non devono essere toccati in nessun caso.
- ⚠️ **Nessuna modifica a `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`** né a nessun file in `src/lib/supabase/`, `src/hooks/`, `src/components/`.
- ⚠️ **`budgetPercentages` non va su Supabase:** P24 §4.7 classifica questa voce come cache di sessione, non come preferenza persistente. La migrazione usa `useState` puro. Vedere P30 §4 per il ragionamento completo.
- ⚠️ **`dismissedBudgetAlerts` è fuori perimetro:** è stato migrato in P29 e risiede in `useUserSettings()`. Non toccarlo in P30.
- ⚠️ **`checkBudgetNotifications` rimane invariata:** è funzione privata di `AppDataProvider`. P30 non ne modifica la logica né il trigger. Cambia solo la fonte dello stato (`useKV` → `useState`).

---

## Obiettivo

Rimuovere l'**ultima chiamata `useKV`** presente in `AppDataContext.tsx`, sostituendo:

```ts
const [budgetPercentages, setBudgetPercentages] =
  useKV<Record<string, number>>('budget-percentages', {});
```

con:

```ts
const [budgetPercentages, setBudgetPercentages] =
  useState<Record<string, number>>({});
```

e rimuovendo `budgetPercentages` / `setBudgetPercentages` dalla superficie pubblica del context (`AppDataContextValue`), poiché nessun consumer esterno li utilizza (P30 §3.1 — 9 occorrenze grep, tutte interne al file).

Dopo P30, `AppDataContext.tsx` non conterrà più nessun import da `@github/spark/hooks`. Questo è il traguardo architetturale del Blocco 6.

---

## Contesto e dipendenze

### Collegamento a P28

P28 ha migrato tutti i dati di dominio di `AppDataContext` (account, transazioni, categorie, budget, obiettivi di risparmio) da Spark KV a Supabase, lasciando esplicitamente tre voci non migrate: `visible-categories`, `dismissed-budget-alerts` e `budget-percentages`. Dopo P29 (che ha migrato le prime due), rimane solo `budget-percentages`.

### Stato attuale del file in scope (Spark KV)

| File | Dipendenza attuale | Chiamate da eliminare | Tipo |
|---|---|---|---|
| `src/context/AppDataContext.tsx` | `useKV` da `@github/spark/hooks` | 1 | React hook (`budget-percentages`) |
| **Totale** | — | **1** | — |

### Natura del dato `budgetPercentages`

`budgetPercentages` è un `Record<string, number>` che mappa l'`id` di ogni budget attivo alla percentuale di utilizzo più recente calcolata in sessione. È una **cache di calcolo** derivata da `budgets` e `transactions` (già in memoria): non deve sopravvivere tra sessioni (P30 §4). `useState` è la soluzione corretta.

---

## Decisioni architetturali (vincolanti — non rimesse in discussione)

| ID | Decisione | Fonte | Effetto pratico |
|---|---|---|---|
| **A** | **`budgetPercentages` rimane in `AppDataContext` come `useState` puro** — rimosso dalla superficie pubblica | P30 §5.3 | Modifica di una riga + rimozione di due voci dal tipo. Zero nuovi file. Nessun consumer esterno impattato. |
| **B** | **Reset a `{}` al logout** — nel `useEffect` che osserva `isAuthenticated` | P30 §6.3 | Coerente con il pattern P27 (reset `isPrivateUnlocked`), P28 (reset array dominio), P29 (reset `visibleCategories`, `dismissedBudgetAlerts`). |
| **C** | **Ricalcolo solo su richiesta esplicita** — pattern invariato rispetto allo stato attuale | P30 §7.3 | `checkBudgetNotifications` continua a essere chiamata solo da `handleSaveTransaction` per `transaction.tipo === 'uscita'`. Nessun `useEffect` reattivo su `safeBudgets`/`safeTransactions`. |

---

## File creati

| File | Descrizione |
|---|---|
| `docs/2 - coding plans/P30-coding-plan.md` | Questo documento |
| `docs/3 - todo lists/P30-todo.md` | Todo specifico P30 |

## File modificati

| File | Tipo | Descrizione modifica |
|---|---|---|
| `src/context/AppDataContext.tsx` | Modificato | Sostituzione `useKV` → `useState` per `budgetPercentages`; rimozione di `budgetPercentages` e `setBudgetPercentages` dall'interfaccia pubblica (`AppDataContextValue`) e dal valore del context; rimozione dell'import da `@github/spark/hooks`; aggiunta reset `{}` al logout |

## File invariati

| File / Area | Motivazione |
|---|---|
| `src/context/UserSettingsContext.tsx` | Non coinvolto — P30 non tocca `useUserSettings()` |
| `src/context/AuthContext.tsx` | Invariato |
| `src/lib/supabase.ts` | Invariato — P30 non aggiunge chiamate Supabase |
| `src/lib/supabase/**` | Invariato — nessun repository necessario per una cache in-memory |
| `src/hooks/**` | Invariati |
| `src/components/**` | Invariati — nessun componente legge `budgetPercentages` dal context |
| `src/test/**` | Invariati — i 5 smoke test non dipendono da `budgetPercentages` |
| `package.json`, `tsconfig.json`, `vite.config.ts` | Invariati |
| `.github/**` | Protetto da `framework-guard.instructions.md` |

---

## Schema riepilogativo delle operazioni

```
P30 — Migrazione budgetPercentages a useState (Blocco 6)
│
├── Pre-P30 — Baseline
│   ├── npm run build   → exit 0
│   ├── npm run lint    → 0 warning
│   ├── npm run test:run → tutti i test passed
│   └── grep -n "useKV" src/context/AppDataContext.tsx
│       → 1 occorrenza (budget-percentages)
│
└── Passo A — Sostituzione useKV → useState in AppDataContext.tsx
    ├── A1: Sostituire la dichiarazione useKV con useState<Record<string, number>>({})
    ├── A2: Rimuovere budgetPercentages e setBudgetPercentages da AppDataContextValue
    ├── A3: Rimuovere budgetPercentages e setBudgetPercentages dal valore del context
    ├── A4: Aggiungere setBudgetPercentages({}) nel blocco logout (useEffect su isAuthenticated)
    ├── A5: Rimuovere import { useKV } from '@github/spark/hooks' (nessun altro uso nel file)
    └── Gate A:
        ├── npm run build   → exit 0
        ├── npm run lint    → 0 warning
        ├── npm run test:run → tutti i test passed (stessa baseline pre-P30)
        ├── grep -rn "useKV" src/context/AppDataContext.tsx → 0 risultati
        └── grep -rn "@github/spark/hooks" src/context/AppDataContext.tsx → 0 risultati
```

---

## Piano operativo dettagliato

### Prima di scrivere codice

#### BL0 — Baseline build e test pre-P30

```bash
npm run build
```

Atteso: exit 0.

```bash
npm run lint
```

Atteso: 0 warning, 0 errori.

```bash
npm run test:run
```

Atteso: tutti i test passed. Annotare il numero esatto di test passanti.

#### BL1 — Verifica baseline `useKV` in `AppDataContext.tsx`

```bash
grep -n "useKV" src/context/AppDataContext.tsx
```

Atteso: almeno 1 occorrenza per `budget-percentages`. Annotare la riga esatta.

#### BL2 — Verifica ambiguità AI1: superficie pubblica del context

Prima di procedere, leggere l'interfaccia `AppDataContextValue` (o tipo equivalente) in `AppDataContext.tsx` per stabilire:
- Se `budgetPercentages` è esposto come campo pubblico → deve essere rimosso dall'interfaccia.
- Se `setBudgetPercentages` è esposto come campo pubblico → deve essere rimosso dall'interfaccia.
- Documentare l'esito (stato AI1) nel task corrispondente di P30-todo.md.

Secondo P30 §3.1, entrambe le voci erano storicamente esposte nel tipo. La verifica serve a confermare lo stato attuale post-P28/P29.

#### BL3 — Conferma esclusione `dismissedBudgetAlerts` (AI2)

`dismissedBudgetAlerts` è già in `useUserSettings()` dopo P29. Non è in perimetro per P30. Nessuna modifica.

---

### Passo A — Sostituzione `useKV` → `useState` in `AppDataContext.tsx`

#### Razionale

Il Passo A è l'unico passo operativo di P30. È un intervento chirurgico su un solo file: sostituisce 1 chiamata `useKV`, rimuove 2 voci da un tipo TypeScript, aggiunge 1 riga di reset al logout e rimuove 1 import. Il comportamento dell'app rimane identico.

#### File coinvolto

| File | Ruolo | Modifiche |
|---|---|---|
| `src/context/AppDataContext.tsx` | Provider dati dominio — aggiornare | Sostituzione `useKV` → `useState`; pulizia interfaccia pubblica; reset logout |

#### Sotto-passi A1–A5

**A1 — Sostituire la dichiarazione `useKV` con `useState`**

Localizzare la riga:
```ts
const [budgetPercentages, setBudgetPercentages] =
  useKV<Record<string, number>>('budget-percentages', {});
```

Sostituire con:
```ts
const [budgetPercentages, setBudgetPercentages] =
  useState<Record<string, number>>({});
```

Il tipo e il valore iniziale sono identici. `checkBudgetNotifications` usa già `budgetPercentages` e `setBudgetPercentages` per nome — nessuna modifica alla funzione privata.

**A2 — Rimuovere `budgetPercentages` dall'interfaccia pubblica**

Nell'interfaccia `AppDataContextValue` (o tipo equivalente), rimuovere:
- La voce `budgetPercentages: Record<string, number>`.
- La voce `setBudgetPercentages: ReturnType<typeof useKV<Record<string, number>>>[1]` (o tipo equivalente).

Se `setBudgetPercentages` aveva un tipo derivato da `useKV`, il nuovo tipo sarà `React.Dispatch<React.SetStateAction<Record<string, number>>>` — ma poiché la voce viene **rimossa** dall'interfaccia pubblica, non è necessario cambiare il tipo: è sufficiente eliminare la riga dall'interfaccia.

**A3 — Rimuovere `budgetPercentages` e `setBudgetPercentages` dal valore del context**

Nel valore passato a `<AppDataContext.Provider value={...}>`, rimuovere le voci `budgetPercentages` e `setBudgetPercentages`. Verificare che non causino errori TypeScript (l'interfaccia `AppDataContextValue` non le include più dopo A2).

**A4 — Aggiungere reset al logout**

Nel `useEffect` che osserva `isAuthenticated` (già presente da P28 per il reset degli altri stati), aggiungere:
```ts
setBudgetPercentages({});
```

nella posizione coerente con gli altri reset (dopo il reset degli array di dominio, prima della fine del blocco `if (!isAuthenticated)`). Il pattern è identico a P27 (reset `isPrivateUnlocked`), P28 (reset array dominio), P29 (reset `visibleCategories`).

**A5 — Rimuovere l'import da `@github/spark/hooks`**

Verificare che `useKV` sia l'unica voce importata da `@github/spark/hooks` in questo file. Dopo la rimozione della chiamata in A1, l'import non è più usato: eliminarlo.

```bash
grep -n "@github/spark/hooks" src/context/AppDataContext.tsx
```

Atteso prima di A5: 1 occorrenza. Atteso dopo A5: 0 occorrenze.

#### Gate A (= gate finale P30)

```bash
npm run build            # exit 0
npm run lint             # 0 warning
npm run test:run         # tutti i test passed — stessa baseline pre-P30
grep -rn "useKV" src/context/AppDataContext.tsx             # 0 risultati
grep -rn "@github/spark/hooks" src/context/AppDataContext.tsx   # 0 risultati
grep -rn "budgetPercentages" src/context/AppDataContext.tsx     # solo occorrenze useState (nessuna useKV)
```

---

## Ambiguità rilevate

### AI1 — Superficie pubblica di `budgetPercentages`

**Domanda:** `budgetPercentages` e `setBudgetPercentages` sono attualmente esposti nell'interfaccia `AppDataContextValue` o usati solo internamente?

**Come risolvere:** leggere l'interfaccia `AppDataContextValue` in `AppDataContext.tsx` e cercare le voci `budgetPercentages` e `setBudgetPercentages`.

**Scenario A:** entrambe le voci sono nell'interfaccia → rimuoverle (A2 si applica nella forma completa).

**Scenario B:** le voci non sono nell'interfaccia (già rimosse in P28 o P29) → A2 è un no-op; procedere direttamente ad A3.

**Riferimento:** P30 §3.1 documenta che storicamente erano nell'interfaccia. La verifica pre-P30 (BL2) determina lo stato attuale.

### AI2 — Perimetro di `dismissedBudgetAlerts`

**Domanda:** `dismissedBudgetAlerts` rientra nel perimetro P30?

**Risposta definitiva:** **No.** Secondo P30 §2 e P29 §10, `dismissedBudgetAlerts` è già stato migrato in P29 verso `useUserSettings()`. Il Blocco 6 non tocca `dismissedBudgetAlerts`. Non modificare alcun codice relativo a questa voce.

---

## Rischi e mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| **R1** — TypeScript: il tipo del setter `setBudgetPercentages` nel valore del context è inferito da `useKV` (tipo non standard) → dopo la sostituzione con `useState` il tipo cambia | Media | Basso | Il tipo `ReturnType<typeof useKV<...>>[1]` nell'interfaccia viene rimosso (non convertito). Nessun consumer esterno lo usa. TypeScript compilerà senza errori. |
| **R2** — `checkBudgetNotifications` usa `setBudgetPercentages` con pattern incompatibile con `useState` | Bassa | Alto | Il setter di `useState` ha la stessa firma del setter di `useKV` per utilizzi sincroni. `checkBudgetNotifications` chiama `setBudgetPercentages(newValue)` — pattern compatibile con `useState`. Verificare con `grep -n "setBudgetPercentages" src/context/AppDataContext.tsx`. |
| **R3** — Il `useEffect` di logout non esiste o ha struttura diversa da P28 | Bassa | Basso | Leggere il file prima di A4 per identificare la posizione esatta del reset logout. Se il pattern differisce (es. `useEffect` separato per ogni reset), aggiungere il reset `budgetPercentages` nel blocco più appropriato. |
| **R4** — `@github/spark/hooks` è importato per altre voci oltre a `useKV` in `AppDataContext.tsx` | Molto bassa | Basso | BL1 verifica con `grep -n "useKV" src/context/AppDataContext.tsx`. Prima di rimuovere l'import (A5), verificare con `grep -n "@github/spark/hooks" src/context/AppDataContext.tsx` che `useKV` sia l'unica voce importata. |

---

## Criteri di accettazione (Definition of Done)

- [ ] `src/context/AppDataContext.tsx` non contiene più nessuna chiamata a `useKV`
- [ ] `src/context/AppDataContext.tsx` non contiene più l'import da `@github/spark/hooks`
- [ ] `budgetPercentages` è dichiarato con `useState<Record<string, number>>({})` nel corpo del provider
- [ ] `budgetPercentages` e `setBudgetPercentages` sono rimossi dalla superficie pubblica di `AppDataContextValue`
- [ ] Il reset `setBudgetPercentages({})` è presente nel blocco logout, coerente con il pattern P27/P28/P29
- [ ] `checkBudgetNotifications` funziona invariata (nessuna modifica alla logica interna)
- [ ] `npm run build` exit 0
- [ ] `npm run lint` 0 warning
- [ ] `npm run test:run` → tutti i test passed (stessa baseline pre-P30)
- [ ] `grep -rn "useKV" src/context/AppDataContext.tsx` → 0 risultati
- [ ] `grep -rn "@github/spark/hooks" src/context/AppDataContext.tsx` → 0 risultati
- [ ] Nessun file in `src/lib/supabase/` modificato
- [ ] Nessun file in `.github/` modificato
- [ ] `dismissedBudgetAlerts` non toccato

---

## File di riferimento

| File | Percorso | Ruolo in P30 |
|---|---|---|
| Design P30 | `docs/1 - projects/P30-migrazione-budgetpercentages-usestate.md` | Documento di design vincolante |
| Architettura | `docs/1 - projects/P24-architettura-migrazione-supabase.md` §4.7 e §6 | Classificazione `budget-percentages` come cache di sessione |
| Design P28 | `docs/1 - projects/P28-migrazione-appdatacontext-supabase.md` | Stato di `AppDataContext.tsx` post-P28 (punto di partenza) |
| Design P29 | `docs/1 - projects/P29-migrazione-usersettings-preferenze-ui.md` §8 e §10 | Pattern di reset al logout; conferma esclusione P30 da P29 |
| Coding plan P29 | `docs/2 - coding plans/P29-coding-plan.md` | Formato e pattern operativi di riferimento |
| Target | `src/context/AppDataContext.tsx` | Unico file modificato |
