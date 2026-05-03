# P32 — Todo: Migrazione PIN privato a Supabase (Blocco 8)

> Pacchetto P32 — Blocco 8: PIN privato, algoritmo bcrypt, API AuthContext
> Piano di riferimento: `docs/2 - coding plans/P32-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P32-migrazione-pin-privato-supabase.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-03
> Completato: 2026-05-03

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [x] |
| `npm run test:run` → 5/5 test passed | [x] |
| `npx tsc --noEmit` → 0 errori TypeScript | [x] |
| `grep "handlePrivatePinSubmit" src/context/AuthContext.tsx` → 0 righe | [x] |
| `grep "handlePrivatePinSubmit" src/components/DialogsOverlay.tsx` → 0 righe | [x] |
| `grep "hashPin\|updatePinHash\|getOrCreate" src/components/SecuritySettings.tsx` → 0 righe | [x] |
| `grep "SHA-256\|subtle.digest" src/lib/crypto.ts` → 0 righe (in hashPin/verifyPin) | [x] |
| `grep "@github/spark/hooks" src/context/AuthContext.tsx` → 0 righe (conferma) | [x] |
| `grep "@github/spark/hooks" src/components/SecuritySettings.tsx` → 0 righe (conferma) | [x] |
| `git diff --name-only HEAD \| grep ".github"` → output vuoto | [x] |

---

## Prima di iniziare

- [x] Leggere integralmente il coding plan `docs/2 - coding plans/P32-coding-plan.md`
- [x] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)
- [x] Verificare che `npm run build` sia exit 0 (baseline pre-P32)
- [x] Verificare che `npm run test:run` → 5/5 test passed (baseline pre-P32)

---

## Prerequisiti operativi

> Non iniziare lo Step 1 finché questi prerequisiti non sono verificati.

- [x] **PR0** — Verificare che `bcryptjs` non sia già in package.json:
  ```bash
  grep "bcryptjs" package.json
  ```
  > Atteso: nessun output. Esito PR0: verificato prima dell'installazione.

- [x] **PR1** — Verificare che `updatePinHash` sia disponibile nel repository:
  ```bash
  grep -n "updatePinHash" src/lib/supabase/repositories/impostazioni-utente.ts
  ```
  > Atteso: export `updatePinHash` presente (P26 §7.6). Esito PR1: verificato.

- [x] **PR2** — Baseline build e test pre-P32:
  ```bash
  npm run build && npm run test:run
  ```
  > Atteso: build exit 0; test 5/5 passed. Esito PR2: verificato.

---

## Step 1 — Installazione dipendenze

> Prerequisito: PR0–PR2 verificati.
> Perimetro: `package.json`. Nessun file sorgente modificato.

### S1.1 — Installare `bcryptjs`

- [x] Eseguire nel terminale del progetto sul branch `refactoring-architettura`:
  ```bash
  npm install bcryptjs
  ```
  > Atteso: aggiornamento `package.json` con `bcryptjs` nelle `dependencies`.

### S1.2 — Installare i tipi TypeScript

- [x] Eseguire nel terminale:
  ```bash
  npm install --save-dev @types/bcryptjs
  ```
  > Atteso: aggiornamento `package.json` con `@types/bcryptjs` nelle `devDependencies`.

### Gate 1

- [x] `npm run build` → exit 0

---

## Step 2 — Sostituzione algoritmo `src/lib/crypto.ts`

> Prerequisito: Gate 1 verificato.
> Perimetro: solo le funzioni `hashPin` e `verifyPin`. Le funzioni `encryptData` e `decryptData` (AES-GCM) non vengono toccate.

### S2.1 — Aggiungere import di `bcryptjs`

- [x] Aggiungere `import bcrypt from 'bcryptjs'` in cima a `src/lib/crypto.ts`
- [x] Verificare che l'import non entri in conflitto con il namespace `crypto` di WebCrypto (già usato dalle funzioni AES-GCM nel medesimo file)

### S2.2 — Riscrivere `hashPin`

- [x] Sostituire l'implementazione SHA-256 (`TextEncoder` + `crypto.subtle.digest('SHA-256', ...)` + `Array.from(...).map(...)`) con `return bcrypt.hash(pin, 12)`
- [x] Verificare che la firma rimanga `export async function hashPin(pin: string): Promise<string>`
- [x] Verificare che il salt factor sia 12 (P32 §12)

### S2.3 — Riscrivere `verifyPin`

- [x] Sostituire l'implementazione (chiamata a `hashPin` + comparazione stringa) con `return bcrypt.compare(pin, hash)`
- [x] Verificare che la firma rimanga `export async function verifyPin(pin: string, hash: string): Promise<boolean>`

### Gate 2

- [x] `npm run build` → exit 0
- [x] `npx tsc --noEmit` → 0 errori TypeScript
- [x] `grep "SHA-256\|subtle.digest" src/lib/crypto.ts` → 0 righe nelle funzioni `hashPin`/`verifyPin`
- [x] `grep "encryptData\|decryptData\|AES-GCM" src/lib/crypto.ts` → righe presenti (funzioni AES-GCM intatte)

---

## Step 3 — Refactoring `src/context/AuthContext.tsx`

> Prerequisito: Gate 2 verificato.
> ⚠️ La build sarà rotta dopo S3.7 finché Step 5 (DialogsOverlay.tsx) non è completato. Non eseguire Gate 3 prima di Step 5.

### S3.1 — `isPrivateEnabled` come valore derivato

- [x] Derivare `isPrivateEnabled` da `privatePinHashCache` nel `useMemo` del value: `privatePinHashCache !== null && privatePinHashCache !== undefined && privatePinHashCache !== ''`
- [x] Verificare che non richieda un nuovo `useState` aggiuntivo

### S3.2 — Implementare `unlockPrivate(pin: string): Promise<void>`

- [x] Verificare precondizione: `privatePinHashCache` non null/undefined/vuoto
- [x] Chiamare `verifyPin(pin, privatePinHashCache)` da `src/lib/crypto.ts`
- [x] Se valido: `setIsPrivateUnlocked(true)`, `setShowPrivatePinDialog(false)`, feedback positivo (toast + screenReader + soundSystem + hapticSystem)
- [x] Se non valido: feedback di errore, `throw new Error('PIN non corretto')`
- [x] Nessuna chiamata a Supabase (Decisione B — verifica lato client)

### S3.3 — Implementare `lockPrivate(): void`

- [x] `setIsPrivateUnlocked(false)` — operazione sincrona
- [x] Nessun effetto su Supabase

### S3.4 — Implementare `setPin(pin: string): Promise<void>`

- [x] Verificare precondizione: `isPrivateEnabled = false`
- [x] Calcolare `hashPin(pin)` (ora usa bcrypt internamente)
- [x] Chiamare `updatePinHash(hash)` dal repository `impostazioni-utente`
- [x] Pattern non ottimistico: aggiornare `privatePinHashCache` e impostare `isPrivateUnlocked(true)` solo dopo conferma dal repository
- [x] Feedback positivo: toast + screenReader

### S3.5 — Implementare `changePin(oldPin: string, newPin: string): Promise<void>`

- [x] Verificare il PIN attuale con `verifyPin(oldPin, privatePinHashCache)` — se errato: errore, nessuna scrittura
- [x] Calcolare `hashPin(newPin)`
- [x] Chiamare `updatePinHash(newHash)`
- [x] Pattern non ottimistico: aggiornare `privatePinHashCache` solo dopo conferma

### S3.6 — Implementare `removePin(): Promise<void>`

- [x] Chiamare `updatePinHash(null)` (Decisione A — `null` è il valore canonico per assenza PIN, P25 §3.4)
- [x] Pattern non ottimistico: impostare `privatePinHashCache = null` e `setIsPrivateUnlocked(false)` solo dopo conferma
- [x] Se `updatePinHash` lancia errore: nessuna modifica allo stato in memoria

### S3.7 — Rimuovere `handlePrivatePinSubmit`

- [x] Rimuovere la funzione dall'implementazione di `AuthProvider`
- [x] Rimuovere la voce `handlePrivatePinSubmit` da `AuthContextValue`
- [x] ⚠️ Nota: la build è rotta da questo punto. Procedere con Step 4 e Step 5 prima di verificare.

### S3.8 — Aggiornare `AuthContextValue` e il `useMemo`

- [x] Aggiungere a `AuthContextValue`: `isPrivateEnabled: boolean`, `unlockPrivate: (pin: string) => Promise<void>`, `lockPrivate: () => void`, `setPin: (pin: string) => Promise<void>`, `changePin: (oldPin: string, newPin: string) => Promise<void>`, `removePin: () => Promise<void>`
- [x] Rimuovere `handlePrivatePinSubmit` da `AuthContextValue`
- [x] Aggiornare il `useMemo` del value per includere i nuovi campi

### Gate 3 (eseguire solo dopo Step 5)

- [x] `npx tsc --noEmit` → 0 errori TypeScript
- [x] `grep "handlePrivatePinSubmit" src/context/AuthContext.tsx` → 0 righe
- [x] `grep "isPrivateEnabled\|setPin\|changePin\|removePin\|unlockPrivate\|lockPrivate" src/context/AuthContext.tsx` → righe presenti per tutti i termini

---

## Step 4 — Aggiornamento `src/components/SecuritySettings.tsx`

> Prerequisito: Step 3 completato (build ancora rotta — continuare).
> Perimetro: rimozione dipendenze dirette; delega completa a `useAuth()`. Nessuna modifica al layout o allo stile dei dialog esistenti.

### S4.1 — Aggiornare import e destructuring `useAuth()`

- [x] Rimuovere import `hashPin` da `@/lib/crypto`
- [x] Rimuovere import `getOrCreate`, `updatePinHash` da `@/lib/supabase/repositories/impostazioni-utente`
- [x] Aggiungere al destructuring di `useAuth()`: `isPrivateEnabled`, `setPin`, `changePin`, `removePin`

### S4.2 — Rimuovere `hasPrivatePin` come stato locale

- [x] Rimuovere `const [hasPrivatePin, setHasPrivatePin] = useState(false)`
- [x] Rimuovere il `useEffect` che chiama `getOrCreate()` per inizializzare `hasPrivatePin`
- [x] Sostituire ogni riferimento a `hasPrivatePin` nel JSX e negli handler con `isPrivateEnabled`

### S4.3 — Aggiungere campo vecchio PIN nel dialog

- [x] Aggiungere `useState` locale `currentPin` per raccogliere il vecchio PIN
- [x] Aggiungere campo `<Input>` per il vecchio PIN visibile solo quando `isPrivateEnabled = true` (sopra il campo "Nuovo PIN")
- [x] Questo è il `TODO Blocco 8` già presente nel sorgente — P32 lo implementa

### S4.4 — Aggiornare `handleChangePinSubmit`

- [x] Rimuovere chiamata diretta a `hashPin` e `updatePinHash`
- [x] Se `!isPrivateEnabled`: chiamare `await setPin(newPin)` da `useAuth()`
- [x] Se `isPrivateEnabled`: chiamare `await changePin(currentPin, newPin)` da `useAuth()`
- [x] Mantenere invariato il catch block che imposta `setError`

### S4.5 — Verificare handler di rimozione PIN (se presente)

- [x] Controllare se nel JSX esiste già un pulsante/handler per rimozione PIN
- [x] Se sì: aggiornarlo per chiamare `removePin()` da `useAuth()` invece della logica diretta
- [x] Se no: non aggiungere il pulsante (UI invariata — P32 §3.2)

### Gate 4 (eseguire solo dopo Step 5)

- [x] `npx tsc --noEmit` → 0 errori TypeScript
- [x] `grep "hashPin" src/components/SecuritySettings.tsx` → 0 righe
- [x] `grep "updatePinHash\|getOrCreate" src/components/SecuritySettings.tsx` → 0 righe

---

## Step 5 — Aggiornamento `src/components/DialogsOverlay.tsx`

> Prerequisito: Step 3 e Step 4 completati.
> Perimetro: sostituzione minima di `handlePrivatePinSubmit` con `unlockPrivate`. Nessuna modifica all'interfaccia utente del dialog.

### S5.1 — Aggiornare il destructuring di `useAuth()`

- [x] Rimuovere `handlePrivatePinSubmit` dal destructuring di `useAuth()`
- [x] Aggiungere `unlockPrivate` al destructuring

### S5.2 — Sostituire la chiamata nel dialog del PIN privato

- [x] Sostituire ogni chiamata a `handlePrivatePinSubmit(pin, callback)` con `await unlockPrivate(pin)`
- [x] Se era presente una callback `onUnlocked` inline, invocarla separatamente dopo `await unlockPrivate(pin)` nello stesso blocco try
- [x] Verificare che l'interfaccia utente del dialog (input PIN, bottone conferma, feedback errore, stato loading) rimanga invariata

### Gate finale P32

- [x] `npm run build` → exit 0
- [x] `npm run test:run` → 5/5 test passed
- [x] `npx tsc --noEmit` → 0 errori TypeScript
- [x] `grep "handlePrivatePinSubmit" src/context/AuthContext.tsx` → 0 righe
- [x] `grep "handlePrivatePinSubmit" src/components/DialogsOverlay.tsx` → 0 righe
- [x] `grep "hashPin\|updatePinHash\|getOrCreate" src/components/SecuritySettings.tsx` → 0 righe
- [x] `grep "SHA-256\|subtle.digest" src/lib/crypto.ts` → 0 righe (in hashPin/verifyPin)
- [x] `grep "@github/spark/hooks" src/context/AuthContext.tsx` → 0 righe (conferma)
- [x] `grep "@github/spark/hooks" src/components/SecuritySettings.tsx` → 0 righe (conferma)
- [x] `grep "isPrivateEnabled\|setPin\|changePin\|removePin\|unlockPrivate\|lockPrivate" src/context/AuthContext.tsx` → righe presenti
- [x] `grep "bcryptjs\|bcrypt" src/lib/crypto.ts` → righe presenti
- [x] `git diff --name-only HEAD | grep ".github"` → output vuoto
