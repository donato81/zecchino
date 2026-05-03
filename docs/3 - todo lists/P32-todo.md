# P32 — Todo: Migrazione PIN privato a Supabase (Blocco 8)

> Pacchetto P32 — Blocco 8: PIN privato, algoritmo bcrypt, API AuthContext
> Piano di riferimento: `docs/2 - coding plans/P32-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P32-migrazione-pin-privato-supabase.md`
> Branch: `refactoring-architettura`
> Data inizio: —
> Completato: —

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [ ] |
| `npm run test:run` → 5/5 test passed | [ ] |
| `npx tsc --noEmit` → 0 errori TypeScript | [ ] |
| `grep "handlePrivatePinSubmit" src/context/AuthContext.tsx` → 0 righe | [ ] |
| `grep "handlePrivatePinSubmit" src/components/DialogsOverlay.tsx` → 0 righe | [ ] |
| `grep "hashPin\|updatePinHash\|getOrCreate" src/components/SecuritySettings.tsx` → 0 righe | [ ] |
| `grep "SHA-256\|subtle.digest" src/lib/crypto.ts` → 0 righe (in hashPin/verifyPin) | [ ] |
| `grep "@github/spark/hooks" src/context/AuthContext.tsx` → 0 righe (conferma) | [ ] |
| `grep "@github/spark/hooks" src/components/SecuritySettings.tsx` → 0 righe (conferma) | [ ] |
| `git diff --name-only HEAD \| grep ".github"` → output vuoto | [ ] |

---

## Prima di iniziare

- [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P32-coding-plan.md`
- [ ] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)
- [ ] Verificare che `npm run build` sia exit 0 (baseline pre-P32)
- [ ] Verificare che `npm run test:run` → 5/5 test passed (baseline pre-P32)

---

## Prerequisiti operativi

> Non iniziare lo Step 1 finché questi prerequisiti non sono verificati.

- [ ] **PR0** — Verificare che `bcryptjs` non sia già in package.json:
  ```bash
  grep "bcryptjs" package.json
  ```
  > Atteso: nessun output. Esito PR0: ___

- [ ] **PR1** — Verificare che `updatePinHash` sia disponibile nel repository:
  ```bash
  grep -n "updatePinHash" src/lib/supabase/repositories/impostazioni-utente.ts
  ```
  > Atteso: export `updatePinHash` presente (P26 §7.6). Esito PR1: ___

- [ ] **PR2** — Baseline build e test pre-P32:
  ```bash
  npm run build && npm run test:run
  ```
  > Atteso: build exit 0; test 5/5 passed. Esito PR2: ___

---

## Step 1 — Installazione dipendenze

> Prerequisito: PR0–PR2 verificati.
> Perimetro: `package.json`. Nessun file sorgente modificato.

### S1.1 — Installare `bcryptjs`

- [ ] Eseguire nel terminale del progetto sul branch `refactoring-architettura`:
  ```bash
  npm install bcryptjs
  ```
  > Atteso: aggiornamento `package.json` con `bcryptjs` nelle `dependencies`.

### S1.2 — Installare i tipi TypeScript

- [ ] Eseguire nel terminale:
  ```bash
  npm install --save-dev @types/bcryptjs
  ```
  > Atteso: aggiornamento `package.json` con `@types/bcryptjs` nelle `devDependencies`.

### Gate 1

- [ ] `npm run build` → exit 0

---

## Step 2 — Sostituzione algoritmo `src/lib/crypto.ts`

> Prerequisito: Gate 1 verificato.
> Perimetro: solo le funzioni `hashPin` e `verifyPin`. Le funzioni `encryptData` e `decryptData` (AES-GCM) non vengono toccate.

### S2.1 — Aggiungere import di `bcryptjs`

- [ ] Aggiungere `import bcrypt from 'bcryptjs'` in cima a `src/lib/crypto.ts`
- [ ] Verificare che l'import non entri in conflitto con il namespace `crypto` di WebCrypto (già usato dalle funzioni AES-GCM nel medesimo file)

### S2.2 — Riscrivere `hashPin`

- [ ] Sostituire l'implementazione SHA-256 (`TextEncoder` + `crypto.subtle.digest('SHA-256', ...)` + `Array.from(...).map(...)`) con `return bcrypt.hash(pin, 12)`
- [ ] Verificare che la firma rimanga `export async function hashPin(pin: string): Promise<string>`
- [ ] Verificare che il salt factor sia 12 (P32 §12)

### S2.3 — Riscrivere `verifyPin`

- [ ] Sostituire l'implementazione (chiamata a `hashPin` + comparazione stringa) con `return bcrypt.compare(pin, hash)`
- [ ] Verificare che la firma rimanga `export async function verifyPin(pin: string, hash: string): Promise<boolean>`

### Gate 2

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] `grep "SHA-256\|subtle.digest" src/lib/crypto.ts` → 0 righe nelle funzioni `hashPin`/`verifyPin`
- [ ] `grep "encryptData\|decryptData\|AES-GCM" src/lib/crypto.ts` → righe presenti (funzioni AES-GCM intatte)

---

## Step 3 — Refactoring `src/context/AuthContext.tsx`

> Prerequisito: Gate 2 verificato.
> ⚠️ La build sarà rotta dopo S3.7 finché Step 5 (DialogsOverlay.tsx) non è completato. Non eseguire Gate 3 prima di Step 5.

### S3.1 — `isPrivateEnabled` come valore derivato

- [ ] Derivare `isPrivateEnabled` da `privatePinHashCache` nel `useMemo` del value: `privatePinHashCache !== null && privatePinHashCache !== undefined && privatePinHashCache !== ''`
- [ ] Verificare che non richieda un nuovo `useState` aggiuntivo

### S3.2 — Implementare `unlockPrivate(pin: string): Promise<void>`

- [ ] Verificare precondizione: `privatePinHashCache` non null/undefined/vuoto
- [ ] Chiamare `verifyPin(pin, privatePinHashCache)` da `src/lib/crypto.ts`
- [ ] Se valido: `setIsPrivateUnlocked(true)`, `setShowPrivatePinDialog(false)`, feedback positivo (toast + screenReader + soundSystem + hapticSystem)
- [ ] Se non valido: feedback di errore, `throw new Error('PIN non corretto')`
- [ ] Nessuna chiamata a Supabase (Decisione B — verifica lato client)

### S3.3 — Implementare `lockPrivate(): void`

- [ ] `setIsPrivateUnlocked(false)` — operazione sincrona
- [ ] Nessun effetto su Supabase

### S3.4 — Implementare `setPin(pin: string): Promise<void>`

- [ ] Verificare precondizione: `isPrivateEnabled = false`
- [ ] Calcolare `hashPin(pin)` (ora usa bcrypt internamente)
- [ ] Chiamare `updatePinHash(hash)` dal repository `impostazioni-utente`
- [ ] Pattern non ottimistico: aggiornare `privatePinHashCache` e impostare `isPrivateUnlocked(true)` solo dopo conferma dal repository
- [ ] Feedback positivo: toast + screenReader

### S3.5 — Implementare `changePin(oldPin: string, newPin: string): Promise<void>`

- [ ] Verificare il PIN attuale con `verifyPin(oldPin, privatePinHashCache)` — se errato: errore, nessuna scrittura
- [ ] Calcolare `hashPin(newPin)`
- [ ] Chiamare `updatePinHash(newHash)`
- [ ] Pattern non ottimistico: aggiornare `privatePinHashCache` solo dopo conferma

### S3.6 — Implementare `removePin(): Promise<void>`

- [ ] Chiamare `updatePinHash(null)` (Decisione A — `null` è il valore canonico per assenza PIN, P25 §3.4)
- [ ] Pattern non ottimistico: impostare `privatePinHashCache = null` e `setIsPrivateUnlocked(false)` solo dopo conferma
- [ ] Se `updatePinHash` lancia errore: nessuna modifica allo stato in memoria

### S3.7 — Rimuovere `handlePrivatePinSubmit`

- [ ] Rimuovere la funzione dall'implementazione di `AuthProvider`
- [ ] Rimuovere la voce `handlePrivatePinSubmit` da `AuthContextValue`
- [ ] ⚠️ Nota: la build è rotta da questo punto. Procedere con Step 4 e Step 5 prima di verificare.

### S3.8 — Aggiornare `AuthContextValue` e il `useMemo`

- [ ] Aggiungere a `AuthContextValue`: `isPrivateEnabled: boolean`, `unlockPrivate: (pin: string) => Promise<void>`, `lockPrivate: () => void`, `setPin: (pin: string) => Promise<void>`, `changePin: (oldPin: string, newPin: string) => Promise<void>`, `removePin: () => Promise<void>`
- [ ] Rimuovere `handlePrivatePinSubmit` da `AuthContextValue`
- [ ] Aggiornare il `useMemo` del value per includere i nuovi campi

### Gate 3 (eseguire solo dopo Step 5)

- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] `grep "handlePrivatePinSubmit" src/context/AuthContext.tsx` → 0 righe
- [ ] `grep "isPrivateEnabled\|setPin\|changePin\|removePin\|unlockPrivate\|lockPrivate" src/context/AuthContext.tsx` → righe presenti per tutti i termini

---

## Step 4 — Aggiornamento `src/components/SecuritySettings.tsx`

> Prerequisito: Step 3 completato (build ancora rotta — continuare).
> Perimetro: rimozione dipendenze dirette; delega completa a `useAuth()`. Nessuna modifica al layout o allo stile dei dialog esistenti.

### S4.1 — Aggiornare import e destructuring `useAuth()`

- [ ] Rimuovere import `hashPin` da `@/lib/crypto`
- [ ] Rimuovere import `getOrCreate`, `updatePinHash` da `@/lib/supabase/repositories/impostazioni-utente`
- [ ] Aggiungere al destructuring di `useAuth()`: `isPrivateEnabled`, `setPin`, `changePin`, `removePin`

### S4.2 — Rimuovere `hasPrivatePin` come stato locale

- [ ] Rimuovere `const [hasPrivatePin, setHasPrivatePin] = useState(false)`
- [ ] Rimuovere il `useEffect` che chiama `getOrCreate()` per inizializzare `hasPrivatePin`
- [ ] Sostituire ogni riferimento a `hasPrivatePin` nel JSX e negli handler con `isPrivateEnabled`

### S4.3 — Aggiungere campo vecchio PIN nel dialog

- [ ] Aggiungere `useState` locale `currentPin` per raccogliere il vecchio PIN
- [ ] Aggiungere campo `<Input>` per il vecchio PIN visibile solo quando `isPrivateEnabled = true` (sopra il campo "Nuovo PIN")
- [ ] Questo è il `TODO Blocco 8` già presente nel sorgente — P32 lo implementa

### S4.4 — Aggiornare `handleChangePinSubmit`

- [ ] Rimuovere chiamata diretta a `hashPin` e `updatePinHash`
- [ ] Se `!isPrivateEnabled`: chiamare `await setPin(newPin)` da `useAuth()`
- [ ] Se `isPrivateEnabled`: chiamare `await changePin(currentPin, newPin)` da `useAuth()`
- [ ] Mantenere invariato il catch block che imposta `setError`

### S4.5 — Verificare handler di rimozione PIN (se presente)

- [ ] Controllare se nel JSX esiste già un pulsante/handler per rimozione PIN
- [ ] Se sì: aggiornarlo per chiamare `removePin()` da `useAuth()` invece della logica diretta
- [ ] Se no: non aggiungere il pulsante (UI invariata — P32 §3.2)

### Gate 4 (eseguire solo dopo Step 5)

- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] `grep "hashPin" src/components/SecuritySettings.tsx` → 0 righe
- [ ] `grep "updatePinHash\|getOrCreate" src/components/SecuritySettings.tsx` → 0 righe

---

## Step 5 — Aggiornamento `src/components/DialogsOverlay.tsx`

> Prerequisito: Step 3 e Step 4 completati.
> Perimetro: sostituzione minima di `handlePrivatePinSubmit` con `unlockPrivate`. Nessuna modifica all'interfaccia utente del dialog.

### S5.1 — Aggiornare il destructuring di `useAuth()`

- [ ] Rimuovere `handlePrivatePinSubmit` dal destructuring di `useAuth()`
- [ ] Aggiungere `unlockPrivate` al destructuring

### S5.2 — Sostituire la chiamata nel dialog del PIN privato

- [ ] Sostituire ogni chiamata a `handlePrivatePinSubmit(pin, callback)` con `await unlockPrivate(pin)`
- [ ] Se era presente una callback `onUnlocked` inline, invocarla separatamente dopo `await unlockPrivate(pin)` nello stesso blocco try
- [ ] Verificare che l'interfaccia utente del dialog (input PIN, bottone conferma, feedback errore, stato loading) rimanga invariata

### Gate finale P32

- [ ] `npm run build` → exit 0
- [ ] `npm run test:run` → 5/5 test passed
- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] `grep "handlePrivatePinSubmit" src/context/AuthContext.tsx` → 0 righe
- [ ] `grep "handlePrivatePinSubmit" src/components/DialogsOverlay.tsx` → 0 righe
- [ ] `grep "hashPin\|updatePinHash\|getOrCreate" src/components/SecuritySettings.tsx` → 0 righe
- [ ] `grep "SHA-256\|subtle.digest" src/lib/crypto.ts` → 0 righe (in hashPin/verifyPin)
- [ ] `grep "@github/spark/hooks" src/context/AuthContext.tsx` → 0 righe (conferma)
- [ ] `grep "@github/spark/hooks" src/components/SecuritySettings.tsx` → 0 righe (conferma)
- [ ] `grep "isPrivateEnabled\|setPin\|changePin\|removePin\|unlockPrivate\|lockPrivate" src/context/AuthContext.tsx` → righe presenti
- [ ] `grep "bcryptjs\|bcrypt" src/lib/crypto.ts` → righe presenti
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto
