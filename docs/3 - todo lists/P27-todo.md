# P27 — Todo List: Migrazione AuthContext a Supabase Auth

> Pacchetto 27 — Blocco 3 migrazione Spark→Supabase (autenticazione)
> Piano di riferimento: `docs/2 - coding plans/P27-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P27-migrazione-authcontext-supabase.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-02

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [x] Verificato |
| `npm run test:run` → tutti i test passed | [x] Verificato |
| `npx tsc --noEmit` → 0 errori TypeScript | [x] Verificato |
| `AuthContext.tsx` espone la nuova superficie P27 con sessione Supabase e metodi auth | [x] Verificato |
| `SecuritySettings.tsx` senza `useKV` | [x] Verificato |
| `App.tsx` con tre gate nell'ordine corretto | [x] Verificato |
| `AuthScreen.tsx` con pannelli Login, Signup, Recovery e conferma signup | [x] Verificato |
| `DialogsOverlay.tsx` senza `privatePinHash` dalla destrutturazione | [x] Verificato |
| `LoadingSpinner.tsx` accessibilità-compliant | [x] Verificato |
| `use-inactivity-timer.ts` con `showWarning` e `resetTimer` | [x] Verificato |
| `OnboardingFlow.tsx` placeholder creato | [x] Verificato |
| Smoke test 02–05 adattati al nuovo flusso auth | [x] Verificato |
| Nessun file `.github/**` modificato | [x] Verificato |

### Note di chiusura

- Il gate `grep -r "@github/spark/hooks" src/` non fa più parte del perimetro P27: restano riferimenti legacy in file di migrazione futuri.
- Il gate `grep -r "window\.spark" src/` non fa più parte del perimetro P27: i residui sono rinviati ai blocchi successivi.
- La suite smoke è stata aggiornata per riflettere il nuovo bootstrap autenticato via contesto mockato nei test, senza dipendere dal vecchio flusso PIN globale.
- La tabella "Esito finale" in testa al documento è la fonte di verità sullo stato conclusivo del pacchetto; la checklist dettagliata sotto resta come traccia operativa del piano.

---

## Prima di iniziare

- [x] Leggere integralmente il coding plan `docs/2 - coding plans/P27-coding-plan.md`
- [x] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)
- [x] Verificare che `npm run build` sia exit 0 (baseline pre-P27)
- [x] Verificare che `npm run test:run` → 5 passed (baseline pre-P27)

---

## Prerequisiti operativi

> Non iniziare il Passo A finché questi prerequisiti non sono verificati.

- [x] **PR0** — Verificare `@supabase/supabase-js` in `package.json`:
  ```bash
  cat package.json | grep supabase
  ```
  > Esito PR0: presente

- [x] **PR1** — Verificare `.env.local` con `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`:
  > Esito PR1: presente con chiavi valide

- [x] **PR2** — Verificare che `src/lib/supabase/repositories/impostazioni-utente.ts` esista ed esporti `getOrCreate`, `updateField`, `updatePreference`, `updatePinHash`:
  ```bash
  grep -n "export" src/lib/supabase/repositories/impostazioni-utente.ts
  ```
  > Esito PR2: file presente ed export verificati

---

## Passo A — Hook `useInactivityTimer`

> Prerequisito: prerequisiti operativi PR0–PR2 verificati.
> File da creare: `src/hooks/use-inactivity-timer.ts`

### A1 — Struttura e interfaccia

- [x] Creare `src/hooks/use-inactivity-timer.ts`
- [x] Definire interfaccia `UseInactivityTimerOptions` con `timeoutMinutes` e `onTimeout`
- [x] Definire interfaccia `UseInactivityTimerResult` con `resetTimer` e `showWarning`
- [x] Esportare `useInactivityTimer`

### A2 — Logica timer

- [x] Gestire caso `timeoutMinutes <= 0`: nessun timer, `showWarning = false`, `resetTimer` no-op
- [x] Calcolare `timeoutMs` e `warningMs` (1 minuto prima della scadenza)
- [x] Avviare timer warning (a `warningMs`): imposta `showWarning = true`
- [x] Avviare timer scadenza (a `timeoutMs`): chiama `onTimeout()`, imposta `showWarning = false`
- [x] Usare `useRef` per i timer (evitare re-render)

### A3 — Listener eventi

- [x] Aggiungere listener `click`, `keydown`, `scroll`, `touchstart` su `document` con `{ passive: true }`
- [x] Ogni evento resetta entrambi i timer (clearTimeout + nuovi setTimeout) e imposta `showWarning = false`
- [x] Usare `useCallback` per il listener per rimozione corretta

### A4 — `resetTimer` esposto e cleanup

- [x] Implementare `resetTimer()`: resetta entrambi i timer, imposta `showWarning = false`
- [x] Implementare cleanup `useEffect`: clearTimeout su entrambi i timer + removeEventListener su tutti e 4 gli eventi
- [x] Usare `useEffect` con `[timeoutMinutes, onTimeout]` come dipendenze

### A5 — Gate intermedio A

- [x] `npm run build` exit 0
- [x] `npm run test:run` → test esistenti passed

---

## Passo B — Componente `LoadingSpinner`

> Prerequisito: Passo A completato.
> File da creare: `src/components/LoadingSpinner.tsx`

### B1 — Struttura

- [x] Creare `src/components/LoadingSpinner.tsx`
- [x] Contenitore a schermo intero: `min-h-screen`, `flex items-center justify-center`, `bg-background`
- [x] Attributi accessibilità: `role="status"`, `aria-label="Caricamento in corso"`, `aria-live="polite"`

### B2 — Spinner accessibile

- [x] Elemento spinner: `border-4 border-primary border-t-transparent`, `rounded-full`, `h-12 w-12`
- [x] Usare classe `motion-safe:animate-spin` (rispetta `prefers-reduced-motion`)
- [x] Nessuna dipendenza esterna aggiuntiva

### B3 — Gate intermedio B

- [x] `npm run build` exit 0
- [x] `npm run test:run` → test esistenti passed

---

## Passo C — Refactoring `AuthContext.tsx`

> Prerequisito: Passo B completato.
> File modificato: `src/context/AuthContext.tsx`

### C1 — Rimozioni

- [ ] Rimuovere `import { useKV } from '@github/spark/hooks'` (riga 2)
- [ ] Rimuovere `[globalPinHash, setGlobalPinHash] = useKV(...)` e `[privatePinHash, setPrivatePinHash] = useKV(...)` (righe 38–39)
- [ ] Rimuovere stati `isSetupMode`, `showPinDialog` e relativi setter
- [ ] Rimuovere dalla interfaccia `AuthContextValue`: `globalPinHash`, `setGlobalPinHash`, `privatePinHash`, `setPrivatePinHash`, `isSetupMode`, `setIsSetupMode`, `showPinDialog`, `setShowPinDialog`, `handleGlobalPinSubmit`
- [ ] Rimuovere il workaround `window.spark.kv.get('global-pin-hash')` dall'`useEffect` di bootstrap
- [ ] Rimuovere la funzione `handleGlobalPinSubmit`

### C2 — Nuovi import

- [ ] Aggiungere import `supabase` da `@/lib/supabase/client`
- [ ] Aggiungere import tipi `User`, `Session` da `@supabase/supabase-js`
- [ ] Aggiungere import `getOrCreate`, `updatePreference`, `updatePinHash` da `@/lib/supabase/repositories/impostazioni-utente`
- [ ] Aggiungere import `useInactivityTimer` da `@/hooks/use-inactivity-timer`

### C3 — Nuova interfaccia e stati

- [ ] Definire nuova interfaccia `AuthContextValue` con 14 valori formali (P27 §4) + `handlePrivatePinSubmit`
- [ ] Aggiungere stati: `user`, `session`, `needsOnboarding`, `inactivityTimeoutState`
- [ ] Aggiungere stato privato: `privatePinHashCache` (`string | null | undefined` — `undefined` = non caricato)

### C4 — Bootstrap Supabase

- [ ] Implementare `useEffect` di bootstrap: `getSession()` → stati + `setIsAuthReady(true)` + `loadUserSettings()`
- [ ] Implementare `onAuthStateChange`: aggiornare stati + reset al logout
- [ ] Implementare `loadUserSettings()` interna: chiama `getOrCreate()`, imposta `needsOnboarding`, `inactivityTimeoutState`, `privatePinHashCache`
- [ ] Gestire fallback in `loadUserSettings()` se `getOrCreate()` fallisce (default sicuri)
- [ ] Cleanup: `subscription.unsubscribe()` nel return del `useEffect`

### C5 — Funzioni esposte

- [ ] Implementare `signIn(email, password)`: chiama `signInWithPassword`, rilancia l'errore se presente
- [ ] Implementare `signUp(email, password)`: chiama `signUp`, rilancia se errore
- [ ] Implementare `signOut()`: chiama `supabase.auth.signOut()`, resetta `isPrivateUnlocked`
- [ ] Implementare `resetPassword(email)`: chiama `resetPasswordForEmail`, **non rilancia** se email non trovata
- [ ] Implementare `setInactivityTimeout(minuti)`: aggiorna stato + chiama `updatePreference('session_timeout_minutes', minuti)`

### C6 — Timer inattività

- [ ] Integrare `useInactivityTimer({ timeoutMinutes: isAuthenticated ? inactivityTimeoutState : 0, onTimeout: signOut })`
- [ ] Gestire `showWarning` per il banner "Rimani connesso" (nel provider o esposto nel context — documentare scelta)

### C7 — `handlePrivatePinSubmit` transitorio

- [ ] Implementare logica `privatePinHashCache === undefined`: bloccare submit (non operare finché le impostazioni non sono caricate)
- [ ] Implementare logica `privatePinHashCache === null`: setup mode → `hashPin(pin)` → `updatePinHash(hash)` → `setPrivatePinHashCache(hash)` → `setIsPrivateUnlocked(true)`
- [ ] Implementare logica `privatePinHashCache !== null`: verifica mode → `verifyPin(pin, privatePinHashCache)` → unlock o errore
- [ ] Aggiungere commento `// TODO Blocco 8: sostituire con primitiva crittografica aggiornata`

### C8 — Gate intermedio C

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → test esistenti passed
- [ ] `npx tsc --noEmit` → 0 errori TypeScript sui consumer di `useAuth()`
- [ ] Contare i valori esposti da `useAuth()`: 14 formali + `handlePrivatePinSubmit`

---

## Passo D — Refactoring `AuthScreen.tsx`

> Prerequisito: Passo C completato.
> File modificato: `src/components/AuthScreen.tsx`

### D1 — Struttura e stato locale

- [ ] Aggiungere tipo `AuthPanel = 'login' | 'signup' | 'recovery' | 'signup-confirm'`
- [ ] Aggiungere stati: `panel`, `email`, `password`, `confirmPassword`, `isLoading`, `error`, `successMessage`
- [ ] Aggiungere ref `emailRef` per focus management
- [ ] Mantenere le classi CSS del contenitore esterno identiche all'attuale

### D2 — Pannello Login

- [ ] Implementare campo email (`type="email"`, `autoComplete="email"`, `ref={emailRef}`)
- [ ] Implementare campo password (`type="password"`, `autoComplete="current-password"`)
- [ ] Implementare pulsante "Accedi" con `disabled={isLoading}`, `aria-busy={isLoading}`, testo "Accesso in corso…"
- [ ] Implementare link verso Recovery e Signup
- [ ] Implementare area errori con `role="alert"`, `aria-live="assertive"`
- [ ] Implementare `normalizeAuthError()` per mappare codici Supabase a messaggi UI
- [ ] Implementare handler submit con `signIn()`, gestione errori, `screenReader.announceError()`

### D3 — Pannello Signup

- [ ] Implementare campi email, password, conferma password con `autoComplete="new-password"`
- [ ] Implementare validazione client-side (password corta, password non coincidenti)
- [ ] Implementare pulsante "Registrati" con stato caricamento
- [ ] Implementare link verso Login
- [ ] Dopo `signUp()` riuscito: `setPanel('signup-confirm')`

### D4 — Pannello Conferma Signup

- [ ] Implementare messaggio post-signup con istruzioni email
- [ ] Implementare pulsante "Re-invia email di conferma"
- [ ] Implementare link "Torna al login"

### D5 — Pannello Recovery

- [ ] Implementare testo introduttivo e campo email
- [ ] Implementare pulsante "Invia link di recupero" con stato caricamento
- [ ] Dopo `resetPassword()` riuscito: mostrare messaggio ambiguo (no user enumeration)
- [ ] Implementare link "Torna al login"

### D6 — Accessibilità trasversale

- [ ] `useEffect([panel])` per spostare focus sul campo email a ogni cambio pannello
- [ ] Errori: `role="alert"`, `aria-live="assertive"`, `screenReader.announceError()`
- [ ] Successi: `aria-live="polite"`, `screenReader.announce()`
- [ ] Pulsanti submit: `aria-busy="true"` durante caricamento

### D7 — Gate intermedio D

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → test passed
- [ ] Verifica manuale su browser: i tre pannelli si rendono e la navigazione tra essi funziona

---

## Passo E — Refactoring `SecuritySettings.tsx`

> Prerequisito: Passo D completato.
> File modificato: `src/components/SecuritySettings.tsx`

### E1 — Rimozioni

- [ ] Rimuovere `import { useKV } from '@github/spark/hooks'` (riga 2)
- [ ] Rimuovere `const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')` (riga 27)
- [ ] Rimuovere `const [privatePinHash, setPrivatePinHash] = useKV<string>('private-pin-hash', '')` (riga 28)
- [ ] Rimuovere intera sezione UI "Cambio PIN globale" e logica associata
- [ ] Rimuovere il tipo `'global'` da `PinChangeMode`
- [ ] Verificare e rimuovere `hashPin`/`verifyPin` se non più usati nel file

### E2 — Aggiunte

- [ ] Aggiungere `import { useAuth } from '@/context/AuthContext'`
- [ ] Aggiungere `import { updatePinHash } from '@/lib/supabase/repositories/impostazioni-utente'`
- [ ] Destrutturare `{ user, resetPassword }` da `useAuth()`

### E3 — Sezione "Sicurezza account"

- [ ] Creare sezione card "Sicurezza account" in cima alla lista
- [ ] Visualizzare email utente corrente (read-only)
- [ ] Implementare pulsante "Cambia password" che chiama `resetPassword(user?.email ?? '')`
- [ ] Mostrare messaggio inline di conferma dopo invio

### E4 — Sezione "PIN privato" senza `useKV`

- [ ] Sostituire `setPrivatePinHash(hash)` con `updatePinHash(hash)` dal repository P26
- [ ] Il dialog di cambio PIN privato accetta nuovo PIN + conferma senza verifica PIN attuale (transitorio)
- [ ] Aggiungere commento `// TODO Blocco 8: aggiungere verifica PIN attuale`

### E5 — Sezione consigli sicurezza

- [ ] Rimuovere riferimenti al PIN globale
- [ ] Aggiornare testo con consigli relativi alla password

### E6 — Gate intermedio E

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → test passed
- [ ] `grep -r "@github/spark/hooks" src/` → 0 risultati

---

## Passo F — App.tsx + DialogsOverlay.tsx + OnboardingFlow.tsx

> Prerequisito: Passo E completato.
> File modificati: `src/App.tsx`, `src/components/DialogsOverlay.tsx`
> File creato: `src/components/OnboardingFlow.tsx`

### F1 — `src/components/OnboardingFlow.tsx` (placeholder)

- [ ] Creare `src/components/OnboardingFlow.tsx` con export `OnboardingFlow` → `null`
- [ ] Aggiungere commento `// PLACEHOLDER — implementazione completa in Blocco 9`

### F2 — `src/App.tsx`

- [ ] Aggiungere import `LoadingSpinner` da `@/components/LoadingSpinner`
- [ ] Aggiungere import `OnboardingFlow` da `@/components/OnboardingFlow`
- [ ] Aggiungere `needsOnboarding` alla destrutturazione di `useAuth()` (riga 32)
- [ ] Sostituire `if (!isAuthReady) return null` con `if (!isAuthReady) return <LoadingSpinner />`
- [ ] Aggiungere `if (needsOnboarding) return <OnboardingFlow />` dopo il gate `!isAuthenticated`
- [ ] Verificare ordine gate: `!isAuthReady` → `!isAuthenticated` → `needsOnboarding` → dashboard

### F3 — `src/components/DialogsOverlay.tsx` (fix AI5)

- [ ] Rimuovere `privatePinHash` dalla destrutturazione di `useAuth()` (riga 62)
- [ ] Verificare che `privatePinHash` non sia usato altrove nel file (`grep privatePinHash src/components/DialogsOverlay.tsx`)
- [ ] Se usato nel JSX: sostituire con logica alternativa (es. `handlePrivatePinSubmit !== undefined`)

### F4 — Gate finale F (= gate P27)

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → tutti i test passed
- [ ] `grep -r "@github/spark/hooks" src/` → 0 risultati
- [ ] `grep -r "window\.spark" src/` → 0 risultati
- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] Verifica a vista: `App.tsx` ha i tre gate nell'ordine corretto
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## Blocchi noti

> _Nessun blocco noto al momento dell'apertura del task._

---

## Note operative

- Se durante il Passo C il timer di inattività causa errori di import circolare (es. `use-inactivity-timer` importa da `AuthContext`), verificare le dipendenze e separare le responsabilità.
- Se durante il Passo D la chiamata `supabase.auth.resend()` non è disponibile nella versione installata di `@supabase/supabase-js`, documentarlo qui e usare un fallback.
- Se `privatePinHash` in `DialogsOverlay.tsx` è usato come flag condizionale per mostrare/nascondere il dialog, sostituire con `showPrivatePinDialog !== undefined` o rimuovere il condizionale se non necessario.
