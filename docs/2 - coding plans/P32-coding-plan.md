# P32 — Coding Plan: Migrazione PIN privato a Supabase (Blocco 8)

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P32 — Blocco 8: PIN privato, algoritmo bcrypt, API AuthContext
> Design di riferimento: `docs/1 - projects/P32-migrazione-pin-privato-supabase.md`
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md`
> Pattern di riferimento: `docs/2 - coding plans/P31-coding-plan.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-03

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P31, P33, P34.
- ⚠️ **File protetti SCF:** i file sotto `.github/` non devono essere toccati in nessun caso.
- ⚠️ **Nessuna modifica a `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`** — salvo aggiornamenti automatici imposti dai nuovi tipi `bcryptjs`.
- ⚠️ **Sistema vergine (nessun hash SHA-256 preesistente):** il sistema non ha utenti reali con `pin_privato_hash` in formato SHA-256. Non è necessario alcun meccanismo di migrazione degli hash precedenti. Si parte direttamente con bcrypt su tutti i nuovi PIN (P32 §12 — decisione esplicita).
- ⚠️ **`isPrivateUnlocked` non viene mai persistito:** rimane `useState` locale resettato al logout. Pattern invariato da P27 §9.3.
- ⚠️ **Pattern non ottimistico obbligatorio:** `setPin`, `changePin`, `removePin` aggiornano lo stato in memoria solo dopo conferma da Supabase (P32 §8 punti 6–8).
- ⚠️ **`updatePinHash()` già disponibile:** il repository `impostazioni-utente` (P26 §7.6) espone già `updatePinHash(hash: string | null)`. Non va reimplementato.
- ⚠️ **`DialogsOverlay.tsx` — file aggiuntivo obbligatorio:** P32 design doc non elenca `DialogsOverlay.tsx` tra i file modificati, ma `handlePrivatePinSubmit` viene rimosso dalla superficie di `AuthContext` e `DialogsOverlay.tsx` ne fa uso (P27 §AI5). Il file deve essere aggiornato per usare `unlockPrivate` — pena errore TypeScript e build rotta.
- ⚠️ **Cambio PIN richiede il vecchio PIN:** `changePin(oldPin, newPin)` (P32 §8 punto 7) richiede la verifica del vecchio PIN prima del cambio. Il dialog attuale non raccoglie il vecchio PIN (commento `TODO Blocco 8` nel sorgente). In P32, aggiungere un campo per il vecchio PIN nel dialog esistente quando `isPrivateEnabled = true` — modifica minima al template del dialog, non al layout o allo stile.

---

## Discrepanze tra design P32 e stato attuale del codice

Le seguenti discrepanze sono state rilevate confrontando P32 §2, §3, §10 con i sorgenti reali (post-implementazione P27, P28, P29, P30, P31, P33, P34).

| # | Discrepanza | Impatto sul piano |
|---|---|---|
| **D1** | P32 §10 assume 6 `useKV` pre-P32 (AuthContext: 2, SecuritySettings: 2, CategoryManagement: 1, test/setup: 1). Il codice reale mostra: AuthContext.tsx e SecuritySettings.tsx hanno 0 `useKV` (P27 implementato); CategoryManagement.tsx ha 0 `useKV` (P33 implementato). Conteggio reale pre-P32: **1** (solo mock in `src/test/setup.ts`). | La transizione "6→2" documentata in §10 non si applica al codice attuale. P32 non modifica il conteggio `useKV` — rimane 1. Il Blocco 10 può avanzare appena il mock di test viene rimosso (Blocco 10 invariato). |
| **D2** | P32 §3.1 indica di rimuovere `useKV<string>('private-pin-hash', '')` da AuthContext.tsx (riga 39). Nel codice attuale questa chiamata non esiste: P27 è stato implementato e ha sostituito il pattern con `privatePinHashCache` come `useState` locale popolato da `loadUserSettings()`. | Non rimuovere una chiamata inesistente. Il piano agisce sul codice reale: refactoring della superficie pubblica e rimozione di `handlePrivatePinSubmit`. |
| **D3** | P32 §3.2 indica di rimuovere `useKV<string>('private-pin-hash', '')` da SecuritySettings.tsx (riga 28). Nel codice attuale non esiste `useKV`. SecuritySettings.tsx chiama direttamente `hashPin`, `updatePinHash` e `getOrCreate` dal repository — che sono le dipendenze da eliminare in P32. | Il piano prevede la rimozione di queste dipendenze dirette, non di `useKV`. |
| **D4** | P32 §3.1 e §3.2 indicano di rimuovere `import { useKV } from '@github/spark/hooks'` da entrambi i file. Nei sorgenti attuali, né AuthContext.tsx né SecuritySettings.tsx importano da `@github/spark/hooks`. | Obiettivo già soddisfatto. Il gate di verifica (`grep "@github/spark/hooks"`) è incluso come conferma finale. |
| **D5** | P32 design doc elenca 4 file modificati (package.json, crypto.ts, AuthContext.tsx, SecuritySettings.tsx). La rimozione di `handlePrivatePinSubmit` dalla superficie di `AuthContext` richiede l'aggiornamento di **`DialogsOverlay.tsx`**, che chiama `handlePrivatePinSubmit` (P27 §AI5). | `DialogsOverlay.tsx` viene aggiunto al perimetro del piano come quinto file modificato. |

---

## Obiettivo

Completare il Blocco 8 del piano di migrazione P24:

1. Installare `bcryptjs` e `@types/bcryptjs` come dipendenze del progetto.
2. Sostituire SHA-256 con bcrypt (`bcryptjs`, salt factor 12) in `src/lib/crypto.ts`. Le firme di `hashPin` e `verifyPin` rimangono invariate; solo l'implementazione interna cambia.
3. Aggiornare `src/context/AuthContext.tsx`: rimuovere `handlePrivatePinSubmit` (approccio transitorio P27 §D); esporre l'API definitiva del PIN privato (`isPrivateEnabled`, `setPin`, `changePin`, `removePin`, `unlockPrivate`, `lockPrivate`).
4. Aggiornare `src/components/SecuritySettings.tsx`: rimuovere le dipendenze dirette a `hashPin`, `updatePinHash`, `getOrCreate`; delegare tutte le operazioni PIN a `useAuth()`.
5. Aggiornare `src/components/DialogsOverlay.tsx`: sostituire `handlePrivatePinSubmit` con `unlockPrivate`.

---

## Contesto e dipendenze

### Collegamento a P27

P27 (Blocco 3) ha eseguito la migrazione di AuthContext a Supabase Auth e ha lasciato `handlePrivatePinSubmit` come funzione **transitoria** con commento `TODO Blocco 8`. L'hash del PIN privato è già letto da Supabase al bootstrap tramite `getOrCreate()` → `settings.pinPrivatoHash` → `privatePinHashCache` (`useState`). P32 completa il refactoring: l'approccio transitorio viene sostituito con l'API definitiva descritta in P32 §8 e §9.

### Stato attuale dei file in scope

| File | Dipendenze attuali da modificare | Note |
|---|---|---|
| `src/lib/crypto.ts` | SHA-256 in `hashPin`/`verifyPin` (`crypto.subtle.digest('SHA-256', ...)`) | Le funzioni `encryptData`/`decryptData` (AES-GCM) rimangono invariate |
| `src/context/AuthContext.tsx` | `handlePrivatePinSubmit` (transitoria P27); superficie pubblica incompleta (mancano `isPrivateEnabled`, `setPin`, `changePin`, `removePin`, `unlockPrivate`, `lockPrivate`) | `privatePinHashCache` rimane come `useState` interno |
| `src/components/SecuritySettings.tsx` | Import diretti: `hashPin` da `@/lib/crypto`; `updatePinHash`, `getOrCreate` dal repository `impostazioni-utente`; `useState` locale `hasPrivatePin` con `useEffect getOrCreate()` | Nessun `useKV` presente |
| `src/components/DialogsOverlay.tsx` | Uso di `handlePrivatePinSubmit` da `useAuth()` | Modifica minima: sostituire con `unlockPrivate` |

### Infrastruttura già disponibile

- **`updatePinHash(hash: string | null)`** — già in `src/lib/supabase/repositories/impostazioni-utente.ts` (P26 §7.6). `null` = rimozione. Non va reimplementato.
- **`privatePinHashCache`** — già in `AuthContext` come `useState<string | null | undefined>`, popolato da `loadUserSettings()` al bootstrap.
- **`UserSettings.pinPrivatoHash`** — disponibile nel tipo TypeScript da P26.
- **`hashPin`, `verifyPin`** — già importati in `AuthContext.tsx` da `@/lib/crypto`. Dopo P32, le stesse funzioni useranno bcrypt internamente — nessun cambio di import.

---

## Decisioni architetturali (vincolanti — da P32 design doc)

| ID | Decisione | Fonte | Effetto pratico |
|---|---|---|---|
| **A** | **`NULL` per rimozione PIN** — `removePin()` chiama `updatePinHash(null)` | P32 §5.3 | `isPrivateEnabled = privatePinHashCache !== null && privatePinHashCache !== ''`. La guardia sulla stringa vuota gestisce hash residui eventualmente presenti. |
| **B** | **Verifica lato client** — `unlockPrivate(pin)` calcola `hashPin(pin)` e confronta con l'hash in memoria | P32 §6.3 | Nessuna chiamata Supabase allo sblocco. Funziona offline. |
| **C** | **Azioni centralizzate in `AuthContext`** — `SecuritySettings.tsx` delega a `setPin`, `changePin`, `removePin` | P32 §7.3 | Split-brain eliminato. `AuthContext` è l'unica autorità sull'hash del PIN privato. |
| **D** | **bcrypt lato client via `bcryptjs`** (salt factor 12) | P32 §12 risolto | `npm install bcryptjs` + `npm install --save-dev @types/bcryptjs`. Sistema vergine: nessuna migrazione hash SHA-256. |

---

## File creati

| File | Descrizione |
|---|---|
| `docs/2 - coding plans/P32-coding-plan.md` | Questo documento |
| `docs/3 - todo lists/P32-todo.md` | Todo specifico P32 |

> **Nota percorsi:** la cartella delle todolist è `docs/3 - todo lists/` (con spazio) e il file segue la convenzione `P##-todo.md`, coerente con P27-todo.md, P31-todo.md, P34-todo.md.

## File modificati

| File | Modifica |
|---|---|
| `package.json` | Aggiunta di `bcryptjs` nelle dependencies e `@types/bcryptjs` nelle devDependencies (tramite npm install) |
| `src/lib/crypto.ts` | Sostituzione SHA-256 con bcrypt (`bcryptjs`, salt factor 12) nelle funzioni `hashPin` e `verifyPin`. Le funzioni `encryptData` e `decryptData` (AES-GCM) rimangono invariate. |
| `src/context/AuthContext.tsx` | Rimozione di `handlePrivatePinSubmit`; aggiunta di `isPrivateEnabled`, `setPin`, `changePin`, `removePin`, `unlockPrivate`, `lockPrivate` nella superficie pubblica; aggiornamento del `useMemo` del value |
| `src/components/SecuritySettings.tsx` | Rimozione di `hashPin`, `updatePinHash`, `getOrCreate` come dipendenze dirette; rimozione `hasPrivatePin` come stato locale con il suo `useEffect`; delega a `isPrivateEnabled`, `setPin`, `changePin`, `removePin` da `useAuth()`; aggiunta campo vecchio PIN nel dialog di cambio (quando `isPrivateEnabled = true`) |
| `src/components/DialogsOverlay.tsx` | Sostituzione di `handlePrivatePinSubmit` con `unlockPrivate` da `useAuth()` |

## File invariati

| File / Area | Motivazione |
|---|---|
| `src/context/AuthContext.tsx` (struttura provider) | `AuthProvider`, `loadUserSettings()`, `privatePinHashCache` (useState), `isPrivateUnlocked` (useState), `setIsPrivateUnlocked`, `showPrivatePinDialog`, `setShowPrivatePinDialog` rimangono; si estende solo la superficie pubblica |
| `src/lib/supabase/repositories/impostazioni-utente.ts` | `updatePinHash()` già disponibile — non modificato |
| `src/hooks/use-user-settings.ts` | Il PIN privato è in `pin_privato_hash` colonna separata (P25 §3.4), non in `preferences JSONB` — non coinvolto |
| `src/context/UserSettingsContext.tsx` | Invariato — nessuna dipendenza dal PIN privato |
| Tutti i consumer di `isPrivateUnlocked` | `isPrivateUnlocked` sopravvive nella superficie pubblica (P32 §9) — `DashboardTab`, `TransactionsTab`, `use-visible-data.ts`, `use-app-shortcuts.ts` restano invariati |
| `src/test/smoke/test-utils.ts` | Verificare se i mock di `useAuth()` necessitano aggiornamento per le nuove funzioni; se i 5 test passano senza modifiche, nessun intervento richiesto |
| `.github/**` | Protetto da `framework-guard.instructions.md` |

---

## Schema riepilogativo delle operazioni

```
P32 — Blocco 8: PIN privato, bcrypt, API AuthContext
│
├── Prerequisiti
│   ├── PR0: Verifica che `bcryptjs` non sia già in package.json
│   │   └── grep "bcryptjs" package.json  →  nessun output atteso
│   ├── PR1: Verifica `updatePinHash` disponibile nel repository
│   │   └── grep -n "updatePinHash" src/lib/supabase/repositories/impostazioni-utente.ts
│   └── PR2: Baseline build + test pre-P32
│       └── npm run build && npm run test:run
│
├── Step 1 — Installazione dipendenze
│   ├── npm install bcryptjs
│   ├── npm install --save-dev @types/bcryptjs
│   └── Gate 1: npm run build exit 0
│
├── Step 2 — Sostituzione algoritmo (src/lib/crypto.ts)
│   ├── S2.1: Aggiungere import di bcryptjs
│   ├── S2.2: Riscrivere hashPin() con bcrypt.hash(pin, 12)
│   ├── S2.3: Riscrivere verifyPin() con bcrypt.compare(pin, hash)
│   └── Gate 2: npm run build exit 0; npx tsc --noEmit 0 errori
│
├── Step 3 — Refactoring AuthContext.tsx
│   ├── S3.1: Aggiungere `isPrivateEnabled` derivato da privatePinHashCache
│   ├── S3.2: Implementare `unlockPrivate(pin)` (Decisione B — verifica lato client)
│   ├── S3.3: Implementare `lockPrivate()` (sincrono)
│   ├── S3.4: Implementare `setPin(pin)` (non ottimistico — P32 §8 punto 6)
│   ├── S3.5: Implementare `changePin(oldPin, newPin)` (non ottimistico — P32 §8 punto 7)
│   ├── S3.6: Implementare `removePin()` (non ottimistico — P32 §8 punto 8; Decisione A)
│   ├── S3.7: Rimuovere `handlePrivatePinSubmit` dall'implementazione
│   ├── S3.8: Aggiornare `AuthContextValue` (aggiungere 6 nuovi campi; rimuovere handlePrivatePinSubmit)
│   └── ⚠️ Gate 3: eseguire solo dopo Step 5 — la build è rotta finché DialogsOverlay non è aggiornato
│
├── Step 4 — Aggiornamento SecuritySettings.tsx
│   ├── S4.1: Rimuovere import hashPin, updatePinHash, getOrCreate
│   ├── S4.2: Aggiungere isPrivateEnabled, setPin, changePin, removePin al destructuring di useAuth()
│   ├── S4.3: Rimuovere useState hasPrivatePin e il useEffect getOrCreate()
│   ├── S4.4: Aggiornare handleChangePinSubmit (delega a setPin o changePin in base a isPrivateEnabled)
│   ├── S4.5: Aggiungere campo vecchio PIN nel dialog quando isPrivateEnabled = true
│   └── Gate 4: npx tsc --noEmit 0 errori (build ancora rotta — Step 5 richiesto)
│
├── Step 5 — Aggiornamento DialogsOverlay.tsx
│   ├── S5.1: Rimuovere handlePrivatePinSubmit dal destructuring di useAuth()
│   ├── S5.2: Aggiungere unlockPrivate al destructuring
│   ├── S5.3: Sostituire la chiamata handlePrivatePinSubmit(pin, callback) con unlockPrivate(pin)
│   └── Gate 5 (Gate finale P32): build + test + grep
│
└── Gate finale P32
    ├── npm run build exit 0
    ├── npm run test:run → 5/5 test passed
    ├── npx tsc --noEmit → 0 errori TypeScript
    ├── grep "handlePrivatePinSubmit" src/context/AuthContext.tsx → 0 righe
    ├── grep "handlePrivatePinSubmit" src/components/DialogsOverlay.tsx → 0 righe
    ├── grep "hashPin\|updatePinHash\|getOrCreate" src/components/SecuritySettings.tsx → 0 righe
    ├── grep "SHA-256\|subtle.digest" src/lib/crypto.ts → 0 righe (solo nelle funzioni hashPin/verifyPin)
    ├── grep "@github/spark/hooks" src/context/AuthContext.tsx → 0 righe (già 0 — conferma)
    ├── grep "@github/spark/hooks" src/components/SecuritySettings.tsx → 0 righe (già 0 — conferma)
    └── git diff --name-only HEAD | grep ".github" → output vuoto
```

---

## Piano operativo dettagliato

### Prerequisiti — Prima di scrivere codice

#### PR0 — Verifica che `bcryptjs` non sia già in package.json

```bash
grep "bcryptjs" package.json
```

Atteso: nessun output. Confermato dalla verifica pre-piano (bcryptjs assente).

#### PR1 — Verifica `updatePinHash` disponibile nel repository

```bash
grep -n "updatePinHash" src/lib/supabase/repositories/impostazioni-utente.ts
```

Atteso: `updatePinHash` presente come export (P26 §7.6).

#### PR2 — Baseline build e test pre-P32

```bash
npm run build && npm run test:run
```

Atteso: build exit 0; test 5/5 passed.

---

### Step 1 — Installazione dipendenze

Eseguire nel terminale del progetto sul branch `refactoring-architettura`:

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

Effetto: `package.json` aggiunge `bcryptjs` nelle `dependencies` e `@types/bcryptjs` nelle `devDependencies`. `bcryptjs` è pura JavaScript, nessuna dipendenza nativa, compatibile con Vite e bundle browser.

**Gate 1**

```bash
npm run build   # exit 0
```

---

### Step 2 — Sostituzione algoritmo in `src/lib/crypto.ts`

#### Razionale

SHA-256 puro è classificato come inadeguato in P24 §8 (Rischio R10): algoritmo di hashing generico, computazionalmente veloce, privo di salt intrinseco — caratteristiche che lo rendono vulnerabile ad attacchi bruteforce su PIN brevi. bcrypt risolve entrambi i problemi: è progettato per password e PIN, include il salt nel formato dell'hash, e il costo computazionale è controllato dal work factor. Salt factor 12 è il bilanciamento raccomandato sicurezza/performance su dispositivi mobili per un PIN a 4–6 cifre (P32 §12).

#### File coinvolti

| File | Ruolo | Modifiche |
|---|---|---|
| `src/lib/crypto.ts` | Algoritmo di hashing — aggiornare | Sostituzione SHA-256 con bcrypt nelle sole funzioni `hashPin` e `verifyPin` |

#### Passi Step 2

**S2.1 — Aggiungere import `bcryptjs`**

1. Aggiungere `import bcrypt from 'bcryptjs'` in cima al file.
2. L'import di `bcryptjs` sostituisce il ricorso a `crypto.subtle` solo nelle funzioni `hashPin` e `verifyPin`.
3. Le funzioni `encryptData` e `decryptData` (più in basso nel file) usano `crypto.subtle` per cifratura AES-GCM — **non modificarle, non rimuovere la loro logica**.

**S2.2 — Riscrivere `hashPin(pin: string): Promise<string>`**

1. La firma rimane identica: `export async function hashPin(pin: string): Promise<string>`.
2. L'implementazione diventa: `return bcrypt.hash(pin, 12)`.
3. Il salt factor 12 è il valore definito in P32 §12.
4. `bcrypt.hash` include il salt nell'output — nessuna gestione salt separata necessaria.
5. Rimuovere l'implementazione SHA-256 precedente (`TextEncoder`, `crypto.subtle.digest('SHA-256', ...)`, `Array.from` + `.map`).

**S2.3 — Riscrivere `verifyPin(pin: string, hash: string): Promise<boolean>`**

1. La firma rimane identica: `export async function verifyPin(pin: string, hash: string): Promise<boolean>`.
2. L'implementazione diventa: `return bcrypt.compare(pin, hash)`.
3. `bcrypt.compare` estrae il salt dall'hash e lo usa nella comparazione — compatibile con gli hash prodotti da `bcrypt.hash`.
4. Rimuovere l'implementazione precedente (chiamata ricorsiva a `hashPin` + comparazione stringa).

**Gate 2**

```bash
npm run build          # exit 0
npx tsc --noEmit       # 0 errori TypeScript
```

---

### Step 3 — Refactoring `src/context/AuthContext.tsx`

#### Razionale

P27 ha lasciato `handlePrivatePinSubmit` come funzione transitoria che unifica in un'unica entry-point sia il caso "primo impostazione PIN" (PIN non esiste) sia il caso "sblocco PIN" (PIN già impostato). Questo design transitorio era necessario per non rompere `DialogsOverlay` durante P27 ma non riflette la semantica corretta. P32 separa le responsabilità nell'API definitiva (P32 §8 e §9).

#### Stato attuale del file (post-P27)

- `AuthContextValue` interface: espone `handlePrivatePinSubmit`, `isPrivateUnlocked`, `setIsPrivateUnlocked`, `showPrivatePinDialog`, `setShowPrivatePinDialog`. **Non** espone `isPrivateEnabled`, `setPin`, `changePin`, `removePin`, `unlockPrivate`, `lockPrivate`.
- Implementazione: `privatePinHashCache` è `useState<string | null | undefined>` popolato da `loadUserSettings()`. `hashPin` e `verifyPin` già importati da `@/lib/crypto`. `updatePinHash` già importato dal repository `impostazioni-utente`.

#### Passi Step 3

**S3.1 — `isPrivateEnabled` come valore derivato**

1. `isPrivateEnabled` è un valore booleano derivato da `privatePinHashCache`: `true` se il cache non è `null`, non è `undefined` e non è stringa vuota.
2. Può essere calcolato direttamente nel `useMemo` del value — non richiede stato aggiuntivo.
3. Formula: `isPrivateEnabled = privatePinHashCache !== null && privatePinHashCache !== undefined && privatePinHashCache !== ''` (P32 §8 punto 2 — guardia composita per gestire eventuali hash residui).

**S3.2 — Implementare `unlockPrivate(pin: string): Promise<void>`**

1. Verificare che `privatePinHashCache` non sia `null`/`undefined`/`''` (PIN non impostato — errore se chiamato senza PIN attivo).
2. Chiamare `verifyPin(pin, privatePinHashCache)` da `src/lib/crypto.ts` (ora basato su `bcrypt.compare`).
3. Se valido: `setIsPrivateUnlocked(true)`, `setShowPrivatePinDialog(false)`, feedback positivo (toast + screenReader + soundSystem + hapticSystem — stesso pattern della sezione "else" dell'attuale `handlePrivatePinSubmit`).
4. Se non valido: feedback di errore (toast + screenReader + soundSystem + hapticSystem), `throw new Error('PIN non corretto')` — stesso pattern attuale.
5. Nessuna chiamata a Supabase (Decisione B — verifica lato client).

**S3.3 — Implementare `lockPrivate(): void`**

1. `setIsPrivateUnlocked(false)` — operazione sincrona.
2. Nessun effetto su Supabase (P32 §8 punto 5).

**S3.4 — Implementare `setPin(pin: string): Promise<void>`**

1. Precondizione: `isPrivateEnabled = false` (nessun PIN attivo). Lanciare errore se PIN già presente.
2. Calcolare `hashPin(pin)` (ora `bcrypt.hash`, salt 12).
3. Chiamare `updatePinHash(hash)` dal repository.
4. Pattern non ottimistico (P32 §8 punto 6): solo dopo conferma dal repository aggiornare `privatePinHashCache` con il nuovo hash, poi `setIsPrivateUnlocked(true)`.
5. Feedback positivo: toast + screenReader (stesso pattern attuale del ramo `privatePinHashCache === null` in `handlePrivatePinSubmit`).
6. Se `updatePinHash` lancia errore: nessuna modifica allo stato in memoria; propagare l'errore.

**S3.5 — Implementare `changePin(oldPin: string, newPin: string): Promise<void>`**

1. Precondizione: `isPrivateEnabled = true`.
2. Verificare il PIN attuale: `verifyPin(oldPin, privatePinHashCache)`. Se errato: errore inline, nessuna scrittura.
3. Calcolare `hashPin(newPin)`.
4. Chiamare `updatePinHash(newHash)`.
5. Pattern non ottimistico (P32 §8 punto 7): solo dopo conferma aggiornare `privatePinHashCache` con il nuovo hash.
6. Feedback coerente con il pattern toast/screenReader.

**S3.6 — Implementare `removePin(): Promise<void>`**

1. Precondizione: `isPrivateEnabled = true`.
2. Chiamare `updatePinHash(null)` (Decisione A — `null` è il valore canonico per "assenza PIN", come definito in P25 §3.4 e P26 §7.6).
3. Pattern non ottimistico (P32 §8 punto 8): solo dopo conferma impostare `privatePinHashCache = null`, poi `setIsPrivateUnlocked(false)`.
4. Se `updatePinHash` lancia errore: nessuna modifica allo stato in memoria.

**S3.7 — Rimuovere `handlePrivatePinSubmit`**

1. Rimuovere la funzione dall'implementazione di `AuthProvider`.
2. Rimuovere la voce `handlePrivatePinSubmit` da `AuthContextValue`.
3. ⚠️ La build sarà rotta dopo questo passo finché `DialogsOverlay.tsx` non viene aggiornato (Step 5). Proseguire con Step 4 prima di verificare la build.

**S3.8 — Aggiornare `AuthContextValue` e il `useMemo` del value**

1. Aggiungere a `AuthContextValue`: `isPrivateEnabled: boolean`, `unlockPrivate: (pin: string) => Promise<void>`, `lockPrivate: () => void`, `setPin: (pin: string) => Promise<void>`, `changePin: (oldPin: string, newPin: string) => Promise<void>`, `removePin: () => Promise<void>`.
2. Rimuovere da `AuthContextValue`: `handlePrivatePinSubmit`.
3. Aggiornare il `useMemo` del value per includere i nuovi campi e rimuovere `handlePrivatePinSubmit`.
4. `isPrivateUnlocked`, `setIsPrivateUnlocked`, `showPrivatePinDialog`, `setShowPrivatePinDialog` rimangono nella superficie (P32 §9 — invariati).

**Gate 3** (eseguire solo dopo Step 5)

```bash
npx tsc --noEmit   # 0 errori TypeScript
```

---

### Step 4 — Aggiornamento `src/components/SecuritySettings.tsx`

#### Razionale

`SecuritySettings.tsx` gestisce attualmente il PIN privato tramite dipendenze dirette: `hashPin` da `crypto.ts` e `updatePinHash`, `getOrCreate` dal repository. Questo schema configura uno split-brain documentato in P27 §3.4. Dopo P32, `SecuritySettings.tsx` è un componente UI puro che delega tutta la logica di business ad `AuthContext` (Decisione C). L'hash non è mai visibile fuori da `AuthContext`.

#### Stato attuale del file

- Import `hashPin` da `@/lib/crypto`
- Import `getOrCreate`, `updatePinHash` da `@/lib/supabase/repositories/impostazioni-utente`
- `useState` locale `hasPrivatePin` inizializzato da `useEffect` → `getOrCreate()`
- `handleChangePinSubmit`: chiama `hashPin` + `updatePinHash` direttamente
- Nessun campo per il vecchio PIN nel dialog (commento `TODO Blocco 8` nel sorgente)

#### Passi Step 4

**S4.1 — Aggiornare la dipendenza da `useAuth()`**

1. Aggiungere al destructuring di `useAuth()`: `isPrivateEnabled`, `setPin`, `changePin`, `removePin`.
2. Rimuovere `hashPin` dagli import.
3. Rimuovere `getOrCreate`, `updatePinHash` dagli import del repository.

**S4.2 — Rimuovere `hasPrivatePin` come stato locale**

1. Rimuovere `const [hasPrivatePin, setHasPrivatePin] = useState(false)`.
2. Rimuovere il `useEffect` che chiama `getOrCreate()` per inizializzare `hasPrivatePin`.
3. Sostituire ogni riferimento a `hasPrivatePin` con `isPrivateEnabled` da `useAuth()`.

**S4.3 — Aggiungere campo vecchio PIN nel dialog di cambio**

1. Quando `isPrivateEnabled = true` (cambio PIN, non prima impostazione), il dialog deve raccogliere il vecchio PIN per passarlo a `changePin(oldPin, newPin)`.
2. Aggiungere `useState` locale `currentPin` e un campo `<Input>` per il vecchio PIN visibile solo quando `isPrivateEnabled = true`. Questo è il `TODO Blocco 8` già presente nel sorgente — P32 lo implementa.
3. Layout e stile del dialog rimangono invariati: il campo si aggiunge sopra il campo "Nuovo PIN" seguendo il medesimo pattern visuale.

**S4.4 — Aggiornare `handleChangePinSubmit`**

1. Rimuovere `hashPin` e `updatePinHash` diretti.
2. Logica aggiornata:
   - Se `!isPrivateEnabled`: chiamare `await setPin(newPin)` da `useAuth()`.
   - Se `isPrivateEnabled`: chiamare `await changePin(currentPin, newPin)` da `useAuth()`.
3. Il catch block esistente (`setError`) rimane invariato: propagare l'errore dal metodo di `useAuth()`.
4. `hasPrivatePin` sostituito con `isPrivateEnabled` nei toast/feedback esistenti.

**S4.5 — Verifica handler `removePin` (se pulsante già presente)**

1. Verificare la struttura completa del componente: se esiste già un pulsante/handler per rimozione PIN, aggiornarlo per chiamare `removePin()` da `useAuth()` invece della logica diretta.
2. Se non esiste un pulsante di rimozione nella UI attuale, non aggiungerlo (UI invariata — perimetro P32 §3.2). La funzione `removePin()` sarà comunque disponibile in AuthContext per uso futuro.

**Gate 4** (eseguire solo dopo Step 5)

```bash
npx tsc --noEmit   # 0 errori TypeScript
```

---

### Step 5 — Aggiornamento `src/components/DialogsOverlay.tsx`

#### Razionale

`DialogsOverlay.tsx` usa `handlePrivatePinSubmit` da `useAuth()` per gestire il dialog di sblocco del PIN privato (P27 §AI5). Dopo P32, questa funzione viene rimossa dalla superficie di `AuthContext`. Il comportamento di sblocco è ora in `unlockPrivate(pin)`.

#### Passi Step 5

**S5.1 — Aggiornare il destructuring di `useAuth()`**

1. Rimuovere `handlePrivatePinSubmit` dal destructuring.
2. Aggiungere `unlockPrivate`.

**S5.2 — Aggiornare la chiamata nel dialog del PIN privato**

1. Sostituire ogni chiamata a `handlePrivatePinSubmit(pin, callback)` con `await unlockPrivate(pin)`.
2. Se era presente una callback `onUnlocked` inline, invocarla separatamente dopo `await unlockPrivate(pin)` nello stesso blocco try.
3. L'interfaccia utente del dialog (input PIN, bottone conferma, feedback errore, stato loading) rimane invariata.

**Gate finale P32**

```bash
npm run build                    # exit 0
npm run test:run                 # 5/5 test passed
npx tsc --noEmit                 # 0 errori TypeScript
grep "handlePrivatePinSubmit" src/context/AuthContext.tsx          # 0 righe
grep "handlePrivatePinSubmit" src/components/DialogsOverlay.tsx    # 0 righe
grep "hashPin\|updatePinHash\|getOrCreate" src/components/SecuritySettings.tsx  # 0 righe
grep "SHA-256\|subtle.digest" src/lib/crypto.ts                   # 0 righe (solo in hashPin/verifyPin)
grep "@github/spark/hooks" src/context/AuthContext.tsx             # 0 righe (già 0 — conferma)
grep "@github/spark/hooks" src/components/SecuritySettings.tsx     # 0 righe (già 0 — conferma)
git diff --name-only HEAD | grep ".github"                         # output vuoto
```

---

## Criteri di accettazione

### Algoritmo

- [ ] `grep "SHA-256\|subtle.digest" src/lib/crypto.ts` → 0 righe nelle funzioni `hashPin`/`verifyPin`
- [ ] `grep "bcryptjs\|bcrypt" src/lib/crypto.ts` → righe presenti
- [ ] `grep "bcryptjs" package.json` → riga presente
- [ ] `grep "encryptData\|decryptData\|AES-GCM" src/lib/crypto.ts` → righe presenti (funzioni AES-GCM intatte)

### Superficie AuthContext

- [ ] `grep "handlePrivatePinSubmit" src/context/AuthContext.tsx` → 0 righe
- [ ] `grep "isPrivateEnabled" src/context/AuthContext.tsx` → righe presenti
- [ ] `grep "setPin\|changePin\|removePin\|unlockPrivate\|lockPrivate" src/context/AuthContext.tsx` → righe presenti per tutti i 5 termini

### Aggiornamento DialogsOverlay

- [ ] `grep "handlePrivatePinSubmit" src/components/DialogsOverlay.tsx` → 0 righe
- [ ] `grep "unlockPrivate" src/components/DialogsOverlay.tsx` → righe presenti

### Dipendenze SecuritySettings

- [ ] `grep "hashPin" src/components/SecuritySettings.tsx` → 0 righe
- [ ] `grep "updatePinHash\|getOrCreate" src/components/SecuritySettings.tsx` → 0 righe
- [ ] `grep "isPrivateEnabled\|setPin\|changePin" src/components/SecuritySettings.tsx` → righe presenti

### Protezioni

- [ ] `grep "@github/spark/hooks" src/context/AuthContext.tsx` → 0 righe (conferma)
- [ ] `grep "@github/spark/hooks" src/components/SecuritySettings.tsx` → 0 righe (conferma)

### Qualità

- [ ] `npm run build` → exit 0
- [ ] `npm run test:run` → 5/5 test passed
- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## Nota di conformità con P24, P27, P29, P31

- **P24**: Blocco 8 completato. Rischio R10 (SHA-256 inadeguato) risolto con bcrypt salt factor 12. `pin_privato_hash` su colonna separata dal JSONB (P25 §3.4) — confermato.
- **P27**: `handlePrivatePinSubmit` transitorio (P27 Decisione D) rimosso. API definitiva (`setPin`, `changePin`, `removePin`, `unlockPrivate`, `lockPrivate`, `isPrivateEnabled`) aggiunta. `privatePinHashCache` (`useState`) rimane — è la struttura interna che P27 ha introdotto e P32 non modifica. `isPrivateUnlocked` resta `useState` locale — coerente con P27 §9.3.
- **P29**: `useUserSettings()` e `preferences JSONB` non coinvolti. `pin_privato_hash` è una colonna separata (P25 §3.4) — nessuna sovrapposizione con le 8 preferenze P29.
- **P31**: `useUserSettings()` non modificato. Le 28 preferenze P31 (Display, Audio, ScreenReader, TalkBack) non sono coinvolte in P32.

---

## File di riferimento

| File | Percorso | Ruolo in P32 |
|---|---|---|
| Design P32 | `docs/1 - projects/P32-migrazione-pin-privato-supabase.md` | Documento di design vincolante |
| Design P24 | `docs/1 - projects/P24-architettura-migrazione-supabase.md` | Architettura di riferimento (Blocco 8, R10) |
| Coding plan P31 | `docs/2 - coding plans/P31-coding-plan.md` | Formato e struttura di riferimento |
| Coding plan P27 | `docs/2 - coding plans/P27-coding-plan.md` | Contesto stato pre-P32 AuthContext |
| Repository impostazioni | `src/lib/supabase/repositories/impostazioni-utente.ts` | `updatePinHash()` disponibile — non modificato |
| Cripto | `src/lib/crypto.ts` | Da aggiornare con bcrypt |
| AuthContext | `src/context/AuthContext.tsx` | Da estendere con API definitiva |
| SecuritySettings | `src/components/SecuritySettings.tsx` | Da semplificare a delegazione pura |
| DialogsOverlay | `src/components/DialogsOverlay.tsx` | Da aggiornare per uso `unlockPrivate` |
| Schema database | `docs/schema database supabase.md` | Consultazione — colonna `pin_privato_hash` |
