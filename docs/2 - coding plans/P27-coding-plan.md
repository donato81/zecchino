# P27 — Coding Plan: Migrazione AuthContext a Supabase Auth

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: 27 — Blocco 3 migrazione Spark→Supabase (autenticazione)
> Design di riferimento: `docs/1 - projects/P27-migrazione-authcontext-supabase.md`
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-02

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P26.
- ⚠️ **Perimetro dei file modificati:** `src/context/AuthContext.tsx`, `src/components/AuthScreen.tsx`, `src/App.tsx`, `src/components/SecuritySettings.tsx`. Un quinto file — `src/components/DialogsOverlay.tsx` — richiede una modifica minima per eliminare un errore TypeScript residuo (vedi AI5 §Ambiguità). Nessun altro file sorgente esistente viene modificato.
- ⚠️ **File protetti SCF:** i file sotto `.github/instructions/`, `.github/agents/`, `.github/copilot-instructions.md`, `.github/AGENTS.md`, `.github/runtime/`, `.github/skills/`, `.github/prompts/`, `.github/changelogs/` non devono essere toccati in nessun caso.
- ⚠️ **Nessuna modifica a `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`** — salvo aggiornamenti imposti da nuovi import (documentare se accade).
- ⚠️ **PIN privato non completato in P27:** `isPrivateUnlocked`, `setIsPrivateUnlocked`, `showPrivatePinDialog`, `setShowPrivatePinDialog` sopravvivono nella superficie pubblica del context ma la loro logica completa è rimandata al Blocco 8. Non implementare nuova crittografia PIN in questo pacchetto.
- ⚠️ **`handlePrivatePinSubmit` transitorio:** viene mantenuto in `AuthContext` per non rompere `DialogsOverlay`. Non usa più `useKV`; legge `privatePinHash` da un campo cached interno di `AuthContext` (popolato da `impostazioni-utente.getOrCreate()` al bootstrap). La logica completa (nuova primitiva crittografica, flusso bcrypt/argon2) è rimandata al Blocco 8. Dettagli nel Passo C.
- ⚠️ **Il repository `impostazioni-utente`** è già disponibile da P26 in `src/lib/supabase/repositories/impostazioni-utente.ts` — non va riscritto.

---

## File creati

| File | Descrizione |
|---|---|
| `docs/2 - coding plans/P27-coding-plan.md` | Questo documento |
| `docs/3 - todo lists/P27-todo.md` | Todo specifico P27 |
| `src/hooks/use-inactivity-timer.ts` | Hook per il timer di inattività (non esisteva nel codebase — vedi AI2) |
| `src/components/LoadingSpinner.tsx` | Spinner a schermo intero per il gate `!isAuthReady` (non esisteva nel codebase — vedi AI1) |
| `src/components/OnboardingFlow.tsx` | Placeholder minimale per il gate `needsOnboarding` in App.tsx (implementazione completa nel Blocco 9) |

## File modificati

| File | Descrizione |
|---|---|
| `src/context/AuthContext.tsx` | Migrazione completa da Spark KV a Supabase Auth (Passo C) |
| `src/components/AuthScreen.tsx` | Da thin wrapper a schermata completa con tre pannelli (Passo D) |
| `src/App.tsx` | Sostituzione `return null` con `<LoadingSpinner />` + aggiunta gate `needsOnboarding` (Passo F) |
| `src/components/SecuritySettings.tsx` | Rimozione sezione PIN globale e `useKV`; aggiunta sezione "Sicurezza account" (Passo E) |
| `src/components/DialogsOverlay.tsx` | Rimozione `privatePinHash` dalla destrutturazione di `useAuth()` — modifica minima (vedi AI5) |
| `docs/todo.md` | Aggiunta P27 nella tabella attivi |

## File invariati

| File / Area | Motivazione |
|---|---|
| `src/lib/supabase/**` | Creato in P26 — nessuna modifica necessaria |
| `src/context/AppDataContext.tsx`, `src/context/VisibleDataContext.tsx` | Blocchi 4 e 5 — fuori dal perimetro P27 |
| `src/hooks/use-visible-data.ts` | Usa solo `isPrivateUnlocked` da `useAuth()` — valore che sopravvive |
| `src/hooks/use-app-shortcuts.ts` | Usa `isAuthenticated`, `isPrivateUnlocked`, `setShowPrivatePinDialog` — tutti sopravvivono |
| `src/components/DashboardTab.tsx` | Usa `isAuthenticated`, `isPrivateUnlocked`, `setShowPrivatePinDialog` — tutti sopravvivono |
| `src/components/TransactionsTab.tsx` | Usa solo `isAuthenticated` — sopravvive |
| `src/components/PinDialog.tsx` | Riusato da `DialogsOverlay` per il PIN privato — invariato |
| `src/lib/types.ts` | Nessuna modifica ai tipi di dominio necessaria in P27 |
| `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js` | Invariati (salvo aggiornamento automatico tipi — documentare se accade) |
| `.env.local` | Non committato; prerequisito, non output |
| `.github/**` | Protetto da `framework-guard.instructions.md` |

---

## Decisioni vincolanti (da P27 — non rimesse in discussione)

| ID | Decisione | Effetto pratico |
|---|---|---|
| **A** | **Conferma email obbligatoria** (Opzione 1 scelta) | `signUp()` non produce sessione immediata. `AuthScreen` mostra pannello informativo post-signup con pulsante re-invio email. La motivazione determinante è il legame con la recovery password (P24 R17): senza email verificata il link di reset arriverebbe a terzi, rendendo inutile la recovery. |
| **B** | **Timeout inattività su Supabase `preferences` JSONB** (Opzione 2 scelta) | `inactivityTimeout` viene letto da `impostazioni_utente.preferences.session_timeout_minutes` al bootstrap. Coerente su più dispositivi. Fallback a 5 minuti durante il bootstrap race. `setInactivityTimeout` chiama `updatePreference('session_timeout_minutes', N)`. |
| **C** | **Spinner neutro durante bootstrap** (Opzione 1 scelta) | `if (!isAuthReady) return <LoadingSpinner />` sostituisce `return null`. Nessun flash della schermata sbagliata. Coerente con la semantica `isAuthReady = false` = "non so ancora chi sei" (P24 §4.2). |
| **D** | **`handlePrivatePinSubmit` transitorio in P27** | Il metodo legge `privatePinHash` da un campo stato locale privato di `AuthContext` (`privatePinHashCache`), popolato da `getOrCreate()` al bootstrap. Non usa `useKV`. Il refactoring completo (nuova primitiva crittografica) è Blocco 8. |

---

## Schema riepilogativo delle operazioni

```
P27 — Migrazione AuthContext a Supabase Auth
│
├── Prerequisiti
│   ├── PR0: @supabase/supabase-js in package.json (P26)
│   │   └── cat package.json | grep supabase
│   ├── PR1: .env.local con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
│   └── PR2: src/lib/supabase/repositories/ disponibili (P26)
│
├── Passo A — Hook useInactivityTimer (nuovo file)
│   ├── src/hooks/use-inactivity-timer.ts
│   │   ├── timeoutMinutes + onTimeout → resetTimer + showWarning
│   │   ├── Listener: click, keydown, scroll, touchstart (passive)
│   │   └── Warning a 1 minuto dalla scadenza (showWarning = true)
│   └── Gate A: npm run build exit 0; test passed
│
├── Passo B — LoadingSpinner (nuovo componente)
│   ├── src/components/LoadingSpinner.tsx
│   │   ├── role="status", aria-label, aria-live="polite"
│   │   └── prefers-reduced-motion + sfondo coerente con AuthScreen
│   └── Gate B: npm run build exit 0; test passed
│
├── Passo C — Refactoring AuthContext.tsx
│   ├── Rimozione: useKV, window.spark.kv.get, PIN globale, isSetupMode,
│   │   showPinDialog, handleGlobalPinSubmit
│   ├── Aggiunta: client Supabase, getSession, onAuthStateChange,
│   │   signIn/signUp/signOut/resetPassword, loadUserSettings, useInactivityTimer
│   ├── Stato interno privato: privatePinHashCache
│   ├── handlePrivatePinSubmit transitorio: usa privatePinHashCache
│   └── Gate C: build exit 0; test passed; 14 valori formali esposti
│
├── Passo D — Refactoring AuthScreen.tsx
│   ├── Tre pannelli: Login, Signup, Recovery (+ Conferma Signup)
│   ├── Validazione client-side, gestione errori inline, aria-busy
│   └── Gate D: build exit 0; test passed; pannelli visibili su browser
│
├── Passo E — Refactoring SecuritySettings.tsx
│   ├── Rimozione: useKV x2, sezione PIN globale completa
│   ├── Aggiunta: sezione "Sicurezza account" (email + cambio password)
│   └── Gate E: build exit 0; grep @github/spark/hooks → 0
│
└── Passo F — App.tsx + DialogsOverlay.tsx (AI5)
    ├── App.tsx: return null → <LoadingSpinner />
    ├── App.tsx: aggiunta gate needsOnboarding → <OnboardingFlow />
    ├── src/components/OnboardingFlow.tsx (placeholder → null)
    ├── DialogsOverlay.tsx: rimozione privatePinHash dalla destrutturazione
    └── Gate finale F: build exit 0; test passed; grep spark/hooks → 0;
        nessun file .github/** modificato
```

---

## Piano operativo dettagliato

### Prerequisiti — Prima di scrivere codice

#### PR0 — Conferma `@supabase/supabase-js` in `package.json`

P26 ha già installato `@supabase/supabase-js`. Verificare prima di procedere:

```bash
cat package.json | grep supabase
```

Atteso: una riga con `"@supabase/supabase-js": "..."` sotto `"dependencies"`.  
Se mancante, eseguire `npm install @supabase/supabase-js` (ripristino prerequisito P26).

#### PR1 — Variabili `.env.local`

Verificare la presenza di `.env.local` nella root con:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Già verificato in P26 — riconfermarlo prima di qualsiasi test runtime.  
**Non committare `.env.local`** — già in `.gitignore`.

#### PR2 — Repository P26 disponibili

Verificare che `src/lib/supabase/repositories/impostazioni-utente.ts` esista e che esporti `getOrCreate`, `updateField`, `updatePreference`, `updatePinHash`.

---

### Passo A — Hook `useInactivityTimer` (nuovo file)

**Verifica ricognizione:** il codebase non contiene nessun hook equivalente in `src/hooks/` (verificato — vedi AI2). Il file va creato da zero.

**File da creare:** `src/hooks/use-inactivity-timer.ts`

**Interfaccia pubblica:**

```ts
interface UseInactivityTimerOptions {
  timeoutMinutes: number
  onTimeout: () => void
}

interface UseInactivityTimerResult {
  resetTimer: () => void
  showWarning: boolean
}

export function useInactivityTimer(options: UseInactivityTimerOptions): UseInactivityTimerResult
```

**Logica implementativa:**

- Riceve `timeoutMinutes: number` e `onTimeout: () => void`.
- Se `timeoutMinutes <= 0`: non avvia nessun timer. `showWarning` rimane `false`. `resetTimer()` è un no-op.
- Se `timeoutMinutes > 0`: calcola `timeoutMs = timeoutMinutes * 60_000`. Calcola `warningMs = (timeoutMinutes - 1) * 60_000` (se `timeoutMinutes === 1`, il warning parte immediatamente a `warningMs = 0`).
- Al mount (e al cambio di `timeoutMinutes`), avvia due timer:
  - Timer warning (a `warningMs`): imposta `showWarning = true`.
  - Timer scadenza (a `timeoutMs`): chiama `onTimeout()` e imposta `showWarning = false`.
- Ascolta `click`, `keydown`, `scroll`, `touchstart` su `document` con `{ passive: true }`. Ad ogni evento: `clearTimeout` su entrambi i timer, riparte con nuovi `setTimeout`, imposta `showWarning = false`.
- `resetTimer()` esposto equivale a un'interazione utente manuale: resetta i timer e imposta `showWarning = false`. Usato dall'azione "Rimani connesso".
- Cleanup al dismount: `clearTimeout` su entrambi i timer; `removeEventListener` su tutti e 4 gli eventi.
- **Nota implementativa:** usare `useRef` per i timer (non `useState`) per evitare re-render spurii; usare `useCallback` per i listener per poterli rimuovere correttamente; usare `useEffect` con `[timeoutMinutes, onTimeout]` come dipendenze.

**Semantica `showWarning`** (P27 §9.2): `showWarning = true` diventa visibile al consumer (tipicamente `AuthProvider`) che mostra il banner "La tua sessione scadrà tra 1 minuto. Vuoi rimanere connesso?" con azioni "Rimani connesso" (chiama `resetTimer()`) e "Esci ora" (chiama `signOut()`).

**Gate intermedio A:**

- `npm run build` exit 0.
- `npm run test:run` → test esistenti passed.

---

### Passo B — `LoadingSpinner` (nuovo componente)

**Verifica ricognizione:** nessun componente `LoadingSpinner`, `Spinner`, `LoadingScreen` o equivalente esiste in `src/components/` (verificato — vedi AI1). Il file va creato da zero.

**File da creare:** `src/components/LoadingSpinner.tsx`

**Requisiti:**

- Contenitore a schermo intero (`min-h-screen`, `flex items-center justify-center`).
- Sfondo coerente con `AuthScreen`: usa la classe `bg-background` come base; opzionalmente il gradiente `from-primary/90 via-secondary/80 to-accent/90` già presente in `AuthScreen.tsx` per continuità visiva durante la transizione bootstrap → login.
- Accessibilità: `role="status"`, `aria-label="Caricamento in corso"`, `aria-live="polite"`.
- Rispetta `prefers-reduced-motion`: usare la classe Tailwind `motion-safe:animate-spin` (oppure `motion-reduce:animate-none`) sull'elemento che ruota, così l'animazione si ferma automaticamente se la media query è attiva.
- Nessuna dipendenza esterna oltre Tailwind e React già presenti nel progetto.

**Struttura JSX indicativa:**

```tsx
<div
  className="min-h-screen flex items-center justify-center bg-background"
  role="status"
  aria-label="Caricamento in corso"
  aria-live="polite"
>
  <div className="motion-safe:animate-spin h-12 w-12 rounded-full border-4 border-primary border-t-transparent" />
</div>
```

**Gate intermedio B:**

- `npm run build` exit 0.
- `npm run test:run` → test esistenti passed.

---

### Passo C — Refactoring `AuthContext.tsx`

**Obiettivo:** sostituire l'autenticazione Spark (PIN globale + `useKV`) con Supabase Auth; mantenere `handlePrivatePinSubmit` in forma transitoria senza `useKV`.

#### Rimozioni (riga per riga)

- `import { useKV } from '@github/spark/hooks'` — riga 2.
- Dalla interfaccia `AuthContextValue`: `globalPinHash`, `setGlobalPinHash`, `privatePinHash`, `setPrivatePinHash`, `isSetupMode`, `setIsSetupMode`, `showPinDialog`, `setShowPinDialog`, `handleGlobalPinSubmit`.
- Dallo stato interno: `[globalPinHash, setGlobalPinHash] = useKV(...)`, `[privatePinHash, setPrivatePinHash] = useKV(...)`, `[isSetupMode, setIsSetupMode]`, `[showPinDialog, setShowPinDialog]`.
- Il workaround `window.spark.kv.get('global-pin-hash')` nell'`useEffect` di bootstrap (righe 51–60 circa).
- La funzione `handleGlobalPinSubmit` (righe 64–85 circa).

> **Nota:** `import { hashPin, verifyPin } from '@/lib/crypto'` rimane perché viene ancora usato da `handlePrivatePinSubmit` transitorio. Verrà rimosso nel Blocco 8 insieme alla nuova primitiva crittografica.

#### Aggiunte

**Import:**

```ts
import { supabase } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import {
  getOrCreate,
  updatePreference,
  updatePinHash,
} from '@/lib/supabase/repositories/impostazioni-utente'
import { useInactivityTimer } from '@/hooks/use-inactivity-timer'
```

**Nuova interfaccia `AuthContextValue` — 14 valori formali (P27 §4) + `handlePrivatePinSubmit` transitorio (Decisione D):**

```ts
interface AuthContextValue {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isAuthReady: boolean
  needsOnboarding: boolean
  inactivityTimeout: number
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isPrivateUnlocked: boolean
  setIsPrivateUnlocked: (v: boolean) => void
  showPrivatePinDialog: boolean
  setShowPrivatePinDialog: (v: boolean) => void
  setInactivityTimeout: (minuti: number) => Promise<void>
  handlePrivatePinSubmit: (pin: string, onUnlocked?: () => void) => Promise<void>
}
```

**Stato interno (useState):**

```ts
const [user, setUser] = useState<User | null>(null)
const [session, setSession] = useState<Session | null>(null)
const [isAuthReady, setIsAuthReady] = useState(false)
const [isAuthenticated, setIsAuthenticated] = useState(false)
const [isPrivateUnlocked, setIsPrivateUnlocked] = useState(false)
const [showPrivatePinDialog, setShowPrivatePinDialog] = useState(false)
const [needsOnboarding, setNeedsOnboarding] = useState(false)
const [inactivityTimeoutState, setInactivityTimeoutState] = useState(5)
// Campo privato — non esposto nella superficie pubblica:
const [privatePinHashCache, setPrivatePinHashCache] = useState<string | null | undefined>(undefined)
// undefined = "non ancora caricato", null = "non impostato", string = "hash disponibile"
```

**`useEffect` di bootstrap:**

```ts
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
    setUser(session?.user ?? null)
    setIsAuthenticated(!!session)
    setIsAuthReady(true)
    if (session) {
      loadUserSettings()
    }
  })

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsAuthenticated(!!session)
      if (session) {
        loadUserSettings()
      } else {
        setIsPrivateUnlocked(false)
        setNeedsOnboarding(false)
        setPrivatePinHashCache(undefined)
      }
    }
  )

  return () => subscription.unsubscribe()
}, [])
```

**Funzione interna `loadUserSettings` (non esposta):**

```ts
const loadUserSettings = async () => {
  try {
    const settings = await getOrCreate()
    setNeedsOnboarding(!settings.nomeVisualizzato)
    setInactivityTimeoutState(
      (settings.preferences as any)?.session_timeout_minutes ?? 5
    )
    setPrivatePinHashCache(settings.pinPrivatoHash ?? null)
  } catch {
    // fallback: default sicuri, non blocca l'avvio
    setNeedsOnboarding(false)
    setInactivityTimeoutState(5)
    setPrivatePinHashCache(null)
  }
}
```

**Funzioni esposte:**

- `signIn(email, password)`: chiama `supabase.auth.signInWithPassword({ email, password })`. Se `error` è presente nel risultato: lancia l'errore (il componente chiamante lo gestisce). Se successo: l'`onAuthStateChange` aggiornerà gli stati automaticamente.
- `signUp(email, password)`: chiama `supabase.auth.signUp({ email, password })`. Se `error`: rilancia. Se successo (Decisione A — conferma email obbligatoria): la sessione sarà `null` nell'evento `onAuthStateChange`; il componente `AuthScreen` mostra il pannello di conferma.
- `signOut()`: chiama `supabase.auth.signOut()`. Resetta `isPrivateUnlocked = false`. L'`onAuthStateChange` si occupa degli altri stati.
- `resetPassword(email)`: chiama `supabase.auth.resetPasswordForEmail(email)`. **Non rilancia** in caso di email non trovata (semantica P27 §8.3 — no user enumeration).
- `setInactivityTimeout(minuti)`: aggiorna `inactivityTimeoutState(minuti)` e chiama `updatePreference('session_timeout_minutes', minuti)` (Decisione B).

**Integrazione `useInactivityTimer` (dopo i useState, prima del return):**

```ts
const { resetTimer, showWarning } = useInactivityTimer({
  timeoutMinutes: isAuthenticated ? inactivityTimeoutState : 0,
  onTimeout: signOut,
})
```

Il timer parte (`timeoutMinutes > 0`) solo quando `isAuthenticated = true`. Si ferma automaticamente al logout (`timeoutMinutes = 0`). `showWarning` può essere esposto come valore aggiuntivo nel context per il componente che renderizza il banner "Rimani connesso" — se il banner è gestito direttamente in `AuthProvider`, non serve esporlo.

> **Nota sul banner di warning (P27 §9.2):** il banner "La tua sessione scadrà tra 1 minuto" può essere reso direttamente all'interno di `AuthProvider` (accedendo a `showWarning` e `resetTimer` localmente), oppure esposto nel context per essere renderizzato altrove. In P27 la scelta implementativa è lasciata all'implementatore: entrambe le opzioni sono compatibili con il design. L'importante è che il banner sia accessibile (`role="alertdialog"` o `aria-live="assertive"`) e che le due azioni ("Rimani connesso" → `resetTimer()`, "Esci ora" → `signOut()`) funzionino correttamente.

**`handlePrivatePinSubmit` transitorio:**

- Non usa più `useKV`.
- Legge `privatePinHashCache` dallo stato locale privato.
- Se `privatePinHashCache === undefined`: le impostazioni non sono ancora caricate — il consumer deve aspettare (non chiamare il metodo in questo stato).
- Se `privatePinHashCache === null`: modalità setup — crea l'hash con `hashPin(pin)`, chiama `updatePinHash(hash)` dal repository P26, aggiorna `setPrivatePinHashCache(hash)`, imposta `setIsPrivateUnlocked(true)`, chiama `setShowPrivatePinDialog(false)`.
- Se `privatePinHashCache` è una stringa: verifica con `verifyPin(pin, privatePinHashCache)`. Se valido: `setIsPrivateUnlocked(true)`, `setShowPrivatePinDialog(false)`, chiama `onUnlocked?.()`. Se non valido: lancia errore o gestisce come prima (toast + screenReader).
- Questo adattamento non introduce regression: sostituisce `useKV` con uno stato cached locale senza cambiare il comportamento osservabile. Il refactoring completo è Blocco 8.

**Gate intermedio C:**

- `npm run build` exit 0.
- `npm run test:run` → test esistenti passed.
- `npx tsc --noEmit` → 0 errori TypeScript su tutti i consumer di `useAuth()`.
- `useAuth()` espone i 14 valori formali della tabella P27 §4 + `handlePrivatePinSubmit` transitorio.

---

### Passo D — Refactoring `AuthScreen.tsx`

**Obiettivo:** trasformare il thin wrapper (che rendeva solo `PinDialog`) in una schermata di autenticazione completa con tre pannelli distinti.

#### Stato locale del componente

```ts
type AuthPanel = 'login' | 'signup' | 'recovery' | 'signup-confirm'

const [panel, setPanel] = useState<AuthPanel>('login')
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [confirmPassword, setConfirmPassword] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState('')
const [successMessage, setSuccessMessage] = useState('')

// Refs per focus management:
const emailRef = useRef<HTMLInputElement>(null)
```

#### Sfondo visivo

Le classi `className` del contenitore esterno vengono **mantenute identiche** a quelle dell'attuale `AuthScreen.tsx` (gradiente `from-primary/90 via-secondary/80 to-accent/90`, `radial-gradient`, griglia `linear-gradient`). Solo il contenuto interno del contenitore cambia.

#### Pannello Login (`panel === 'login'`)

- Logo/nome app in alto (invariato rispetto all'attuale).
- Campo email: `type="email"`, `autoComplete="email"`, `aria-label="Indirizzo email"`, `ref={emailRef}`.
- Campo password: `type="password"`, `autoComplete="current-password"`, `aria-label="Password"`.
- Pulsante "Accedi": `disabled={isLoading}`, `aria-busy={isLoading}`. Testo durante caricamento: "Accesso in corso…".
- Link "Hai dimenticato la password?" → `setPanel('recovery')`.
- Link "Non hai un account? Registrati" → `setPanel('signup')`.
- Area errori: `<p role="alert" aria-live="assertive">` visibile se `error !== ''`. Messaggi specifici:
  - Credenziali errate (`invalid_credentials` o codice 400): "Email o password non corretti."
  - Email non verificata (`email_not_confirmed`): "Controlla la tua email e clicca il link di conferma prima di accedere."
  - Rate limit (429): "Troppi tentativi. Attendi qualche minuto prima di riprovare."
  - Rete assente (errore fetch/network): "Impossibile connettersi. Controlla la connessione."

**Gestione submit Login:**

```ts
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')
  setIsLoading(true)
  try {
    await signIn(email, password)
  } catch (err) {
    const msg = normalizeAuthError(err)
    setError(msg)
    screenReader.announceError(msg)
    emailRef.current?.focus()
  } finally {
    setIsLoading(false)
  }
}
```

`normalizeAuthError` è una funzione privata al file che mappa i codici di errore Supabase ai messaggi UI.

#### Pannello Signup (`panel === 'signup'`)

- Campo email: `type="email"`, `autoComplete="email"`.
- Campo password: `type="password"`, `autoComplete="new-password"`.
- Campo conferma password: `type="password"`, `autoComplete="new-password"`.
- Pulsante "Registrati": `disabled={isLoading}`, `aria-busy={isLoading}`. Testo caricamento: "Registrazione in corso…".
- Link "Hai già un account? Accedi" → `setPanel('login')`.
- Validazione client-side (senza chiamata API):
  - Password < 6 caratteri: `setError('La password deve avere almeno 6 caratteri.')`.
  - Password ≠ conferma: `setError('Le due password non coincidono.')`.
- Errori API:
  - Email già registrata (`user_already_exists` o `23505`): "Questa email è già in uso. Accedi o reimposta la password."
- Dopo `signUp()` riuscito (Decisione A): `setPanel('signup-confirm')`.

#### Pannello Conferma Signup (`panel === 'signup-confirm'`)

- Messaggio: "Registrazione completata! Controlla la tua email e clicca il link di conferma per attivare l'account."
- Pulsante "Re-invia email di conferma": chiama `supabase.auth.resend({ type: 'signup', email })`. Il client Supabase può essere importato direttamente in `AuthScreen` da `@/lib/supabase/client` per questo caso d'uso, oppure `resend` può essere esposto da `AuthContext` — scelta dell'implementatore.
- Link "Torna al login" → `setPanel('login')`, reset di `email`, `password`, `confirmPassword`, `error`.

#### Pannello Recovery (`panel === 'recovery'`)

- Testo introduttivo: "Inserisci il tuo indirizzo email. Ti invieremo un link per reimpostare la password."
- Campo email: `type="email"`, `autoComplete="email"`.
- Pulsante "Invia link di recupero": `disabled={isLoading}`.
- Link "Torna al login" → `setPanel('login')`.
- Dopo `resetPassword()` riuscito: mostrare inline "Se l'email è associata a un account, riceverai un link per reimpostare la password entro pochi minuti." — **messaggio volutamente ambiguo** (sicurezza — no user enumeration). Si può usare `setSuccessMessage(...)` per mostrarlo nell'area messaggi del pannello.
- Errori di rete: visibili nell'area errori come negli altri pannelli.

#### Accessibilità trasversale

- Tutti i messaggi di errore: `role="alert"`, `aria-live="assertive"`.
- Tutti i messaggi di successo: `aria-live="polite"`.
- Pulsanti di submit durante caricamento: `aria-busy="true"`.
- Focus management: al cambio pannello spostare il focus sul campo email (tramite `useEffect([panel])` + `emailRef.current?.focus()`).
- `screenReader.announceError()` per ogni errore; `screenReader.announce()` per messaggi di successo.

**Gate intermedio D:**

- `npm run build` exit 0.
- `npm run test:run` → test passed.
- AuthScreen visivamente funzionante su browser in modalità sviluppo (verifica manuale del rendering dei tre pannelli e navigazione tra essi).

---

### Passo E — Refactoring `SecuritySettings.tsx`

**Obiettivo:** rimuovere il PIN globale e i due `useKV` (righe 27–28); aggiungere sezione "Sicurezza account"; mantenere sezione "PIN privato" senza `useKV`.

#### Rimozioni

- `import { useKV } from '@github/spark/hooks'` — riga 2.
- `const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')` — riga 27.
- `const [privatePinHash, setPrivatePinHash] = useKV<string>('private-pin-hash', '')` — riga 28.
- Tutta la sezione UI "Cambio PIN globale" e la logica associata: `handleOpenPinChange('global')`, la validazione `verifyPin(currentPin, globalPinHash)`, `hashPin(newPin)`, `setGlobalPinHash(hash)`, i messaggi toast e screenReader relativi al PIN globale.
- Il tipo `'global'` da `PinChangeMode` (lasciare solo `'private' | null`).
- `import { hashPin, verifyPin } from '@/lib/crypto'` — rimosso se non usato dalla sezione PIN privato rimanente (verificare usage nel file prima di rimuovere).

#### Aggiunte

**Import:**

```ts
import { useAuth } from '@/context/AuthContext'
import { updatePinHash } from '@/lib/supabase/repositories/impostazioni-utente'
```

**Valori dal context:**

```ts
const { user, resetPassword } = useAuth()
```

**Nuova sezione "Sicurezza account"** (in cima alla lista delle sezioni):

- `Card` con `CardHeader` e `CardTitle`: "Sicurezza account".
- Email dell'utente corrente (read-only): `<p className="text-sm text-muted-foreground">{user?.email}</p>` con label "Email account" (o equivalente accessibile).
- Pulsante "Cambia password": al click chiama `resetPassword(user?.email ?? '')`. Mostra messaggio inline di conferma: "Ti abbiamo inviato un link via email per reimpostare la password." Il pulsante ha stato `isChangingPassword` locale mentre la chiamata è in corso.

**Sezione "PIN privato" mantenuta senza `useKV`:**

- Il dialog di cambio PIN privato (già presente nell'attuale `SecuritySettings`) viene mantenuto.
- **Scrittura dell'hash:** invece di `setPrivatePinHash(hash)` via KV, chiamare `updatePinHash(hash)` dal repository P26.
- **Verifica del PIN attuale nel transitorio P27:** `privatePinHash` non è più disponibile via `useKV` né via `useAuth()` (rimosso dalla superficie pubblica). Soluzione transitoria: il dialog di cambio PIN privato accetta direttamente nuovo PIN + conferma **senza verifica del PIN attuale**. Aggiungere commento nel codice: `// TODO Blocco 8: aggiungere verifica PIN attuale con nuova primitiva crittografica`.

**Sezione "Consigli sicurezza"** (se presente nell'attuale `SecuritySettings`): rimuovere riferimenti al PIN globale; aggiungere consigli relativi alla password (es. "Usa una password lunga e unica. Puoi cambiarla in qualsiasi momento tramite il link in questa sezione.").

**Gate intermedio E:**

- `npm run build` exit 0.
- `npm run test:run` → test passed.
- `grep -r "@github/spark/hooks" src/` → 0 risultati (nessun import residuo in nessun file `src/`).

---

### Passo F — Aggiornamento `App.tsx` + fix `DialogsOverlay.tsx`

**Obiettivo:** aggiornare i gate di rendering in `AppContent`, aggiungere il placeholder `OnboardingFlow`, risolvere il TypeScript error in `DialogsOverlay.tsx` (AI5).

#### `App.tsx` — modifiche in `AppContent`

**1. Aggiunta import:**

```tsx
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { OnboardingFlow } from '@/components/OnboardingFlow'
```

**2. Aggiunta `needsOnboarding` alla destrutturazione:**

```tsx
const { isAuthenticated, isAuthReady, needsOnboarding } = useAuth()
```

**3. Sostituzione gate 1 (riga ~120):**

```tsx
// Prima:
if (!isAuthReady) return null
// Dopo:
if (!isAuthReady) return <LoadingSpinner />
```

**4. Aggiunta gate 3 (riga ~122, dopo il gate `!isAuthenticated`):**

```tsx
if (!isAuthReady) return <LoadingSpinner />
if (!isAuthenticated) return <AuthScreen />
if (needsOnboarding) return <OnboardingFlow />
// altrimenti: dashboard completa
```

L'ordine è vincolante (P27 §3.3): `!isAuthReady` → `!isAuthenticated` → `needsOnboarding` → dashboard.

#### Nuovo file: `src/components/OnboardingFlow.tsx`

Placeholder minimale — il Blocco 9 lo implementerà:

```tsx
// PLACEHOLDER — implementazione completa in Blocco 9
export function OnboardingFlow() {
  return null
}
```

#### `src/components/DialogsOverlay.tsx` — fix AI5

Rimuovere `privatePinHash` dalla destrutturazione di `useAuth()` (riga 62 circa):

```tsx
// Prima:
const {
  privatePinHash,
  showPrivatePinDialog,
  setShowPrivatePinDialog,
  handlePrivatePinSubmit,
} = useAuth()

// Dopo:
const {
  showPrivatePinDialog,
  setShowPrivatePinDialog,
  handlePrivatePinSubmit,
} = useAuth()
```

Verificare che `privatePinHash` non sia usato altrove in `DialogsOverlay.tsx` (es. come flag condizionale nel JSX). Se usato: sostituire con logica alternativa (es. `handlePrivatePinSubmit !== undefined` o rimuovere il condizionale se non necessario con la nuova architettura).

#### Gate finale F (= gate P27)

- `npm run build` exit 0.
- `npm run test:run` → tutti i test passed.
- `grep -r "@github/spark/hooks" src/` → 0 risultati.
- `grep -r "window\.spark" src/` → 0 risultati.
- `npx tsc --noEmit` → 0 errori TypeScript.
- `App.tsx` ha tutti e tre i gate nell'ordine corretto (verificare a vista).
- `git diff --name-only HEAD | grep ".github"` → output vuoto.

---

## Ambiguità e punti da verificare prima dell'implementazione

### AI1 — Esistenza `LoadingSpinner`

**Esito verifica (ricognizione pre-piano):** il codebase non contiene nessun componente `LoadingSpinner`, `Spinner`, `LoadingScreen` o equivalente in `src/components/`. Il file `src/components/LoadingSpinner.tsx` va creato da zero (Passo B). Nessun riuso possibile.

### AI2 — Esistenza hook inattività

**Esito verifica (ricognizione pre-piano):** il codebase non contiene nessun hook `useInactivityTimer`, `useInactivity`, `useTimeout` o equivalente in `src/hooks/`. Il file `src/hooks/use-inactivity-timer.ts` va creato da zero (Passo A). Nessun riuso possibile.

### AI3 — Struttura attuale di `App.tsx`

**Esito verifica (ricognizione pre-piano — riga per riga):**

- **Gate 1** (dentro `AppContent`, riga ~120): `if (!isAuthReady) return null` — schermo vuoto durante il bootstrap. Da sostituire con `<LoadingSpinner />` (Passo F).
- **Gate 2** (riga ~121): `if (!isAuthenticated) return <AuthScreen />` — mostra `AuthScreen`. Invariato.
- **Terzo gate:** NON esiste. Il gate `needsOnboarding` va aggiunto ex novo (Passo F).
- **Valori destrutturati da `useAuth()`** (riga 32): attualmente solo `{ isAuthenticated, isAuthReady }`. In P27 aggiungere `needsOnboarding`.
- **Provider nesting** (riga 130): `<AuthProvider><AppDataProvider><VisibleDataProvider><AppContent /></VisibleDataProvider></AppDataProvider></AuthProvider>`. Invariato — `AuthProvider` rimane la radice.

### AI4 — Comportamento di `handlePrivatePinSubmit` nel transitorio

**Situazione:** `privatePinHash` viene rimosso dalla superficie pubblica di `AuthContext`. `handlePrivatePinSubmit` lo usava (tramite `useKV`) per verificare il PIN privato. In P27 il metodo usa un campo stato locale privato `privatePinHashCache` (non esposto nel context), popolato da `impostazioni-utente.getOrCreate()` al bootstrap.

**`privatePinHash` è disponibile via `getOrCreate()`?** Sì: `getOrCreate()` restituisce un oggetto `UserSettings` con campo `pinPrivatoHash: string | null`. Se l'utente non ha ancora impostato un PIN privato il valore sarà `null` (setup mode). Se lo ha impostato, sarà l'hash in formato stringa.

**Rischio bootstrap race:** durante il breve intervallo tra login e completamento di `getOrCreate()`, `privatePinHashCache` è `undefined`. Se l'utente apre il dialog PIN privato in questo momento, entrerebbe in setup mode e sovrascriverebbe un PIN esistente. **Mitigazione:** distinguere `undefined` (non ancora caricato) da `null` (non impostato, setup mode); bloccare il submit del dialog PIN privato se `privatePinHashCache === undefined`.

### AI5 — Consumer di `useAuth()` con valori rimossi

**Valori rimossi dalla superficie pubblica in P27:**
`globalPinHash`, `setGlobalPinHash`, `privatePinHash`, `setPrivatePinHash`, `isSetupMode`, `setIsSetupMode`, `showPinDialog`, `setShowPinDialog`, `handleGlobalPinSubmit`.

**Analisi per file:**

| File | Valori rimossi usati | Risoluzione in P27 |
|---|---|---|
| `src/components/AuthScreen.tsx` | `showPinDialog`, `isSetupMode`, `handleGlobalPinSubmit` (riga 6) | **Nel perimetro** — risolto automaticamente dalla riscrittura completa (Passo D) |
| `src/components/SecuritySettings.tsx` | `useKV('global-pin-hash')`, `useKV('private-pin-hash')` (righe 27–28) — chiamate dirette, non da `useAuth()` | **Nel perimetro** — risolto automaticamente dalla riscrittura (Passo E) |
| `src/components/DialogsOverlay.tsx` | `privatePinHash` da `useAuth()` (riga 62) | **NON nel perimetro originale** → estensione del perimetro con modifica minima → rimozione `privatePinHash` dalla destrutturazione (Passo F) |

**File non impattati:**

| File | Valori usati da `useAuth()` | Esito |
|---|---|---|
| `src/App.tsx` | `isAuthenticated`, `isAuthReady` | Sopravvivono; aggiunta di `needsOnboarding` |
| `src/components/DashboardTab.tsx` | `isAuthenticated`, `isPrivateUnlocked`, `setShowPrivatePinDialog` | Tutti sopravvivono — nessuna modifica |
| `src/components/TransactionsTab.tsx` | `isAuthenticated` | Sopravvive — nessuna modifica |
| `src/hooks/use-visible-data.ts` | `isPrivateUnlocked` | Sopravvive — nessuna modifica |
| `src/hooks/use-app-shortcuts.ts` | `isAuthenticated`, `isPrivateUnlocked`, `setShowPrivatePinDialog` | Tutti sopravvivono — nessuna modifica |

**Dopo la modifica di `DialogsOverlay.tsx` (Passo F): nessun errore TypeScript residuo.**

---

## Criteri di uscita — Definition of Done

- [ ] `npm run build` exit 0.
- [ ] `npm run test:run` → tutti i test passed.
- [ ] `grep -r "@github/spark/hooks" src/` → 0 risultati in nessun file `src/`.
- [ ] `grep -r "window\.spark" src/` → 0 risultati in nessun file `src/`.
- [ ] `AuthContext.tsx` espone esattamente 14 valori formali come da tabella P27 §4 + `handlePrivatePinSubmit` transitorio (Decisione D).
- [ ] `SecuritySettings.tsx` non contiene `useKV`.
- [ ] `App.tsx` ha tutti e tre i gate nell'ordine: `!isAuthReady` → `<LoadingSpinner />`; `!isAuthenticated` → `<AuthScreen />`; `needsOnboarding` → `<OnboardingFlow />`.
- [ ] `AuthScreen.tsx` ha tutti e tre i pannelli: Login, Signup, Recovery (+ pannello Conferma Signup post-iscrizione con re-invio email).
- [ ] `DialogsOverlay.tsx` non destruttura `privatePinHash` da `useAuth()`.
- [ ] `npx tsc --noEmit` → 0 errori TypeScript su tutti i consumer di `useAuth()` (punto AI5 risolto).
- [ ] `src/components/LoadingSpinner.tsx` creato, accessibilità-compliant (`role="status"`, `aria-label`, `prefers-reduced-motion`).
- [ ] `src/hooks/use-inactivity-timer.ts` creato con logica warning a 1 minuto (`showWarning`) e `resetTimer()` esposto.
- [ ] `src/components/OnboardingFlow.tsx` placeholder creato (export `OnboardingFlow` → `null`).
- [ ] Nessun file `.github/**` modificato (verificare con `git diff --name-only HEAD | grep ".github"` → output vuoto).

---

*Fine documento. Nessun file sorgente preesistente viene modificato da questo piano durante la fase Plan.*
