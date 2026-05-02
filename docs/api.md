# API — Zecchino

> Documentazione delle strutture dati, hook, utility e contratti interni dell'applicazione.
> Questo file non descrive un'API REST: Zecchino è una SPA client-side senza backend.

---

## Tipi principali (`src/lib/types.ts`)

### `AccountType`
```ts
type AccountType =
  | 'bancario' | 'prepagata' | 'contanti' | 'salvadanaio'
  | 'privato'  | 'investimenti' | 'credito' | 'paypal'
  | 'crypto'   | 'pensione'
```

### `TransactionType`
```ts
type TransactionType = 'entrata' | 'uscita' | 'trasferimento'
```

### `RecurrenceFrequency`
```ts
type RecurrenceFrequency = 'giornaliero' | 'settimanale' | 'mensile' | 'annuale'
```

### `Account`
```ts
interface Account {
  id: string
  nome: string
  tipo: AccountType
  saldoIniziale: number
  valuta: string
  isPrivato: boolean
  dataCreazione: string
}
```

### `Transaction`
```ts
interface Transaction {
  id: string
  data: string
  importo: number
  tipo: TransactionType
  contoId: string
  contoDestinazioneId?: string  // solo per trasferimenti
  categoriaId: string
  descrizione: string
  ricorrente: boolean
  frequenzaRicorrenza?: RecurrenceFrequency
  cifrato: boolean
}
```

### `Category`
```ts
interface Category {
  id: string
  nome: string
  tipo: 'entrata' | 'uscita'
  predefinita: boolean
}
```

### `Budget`
```ts
interface Budget {
  id: string
  nome: string
  importoTarget: number
  periodo: 'mensile' | 'trimestrale' | 'annuale'
  categoriaId?: string
  contoId?: string
  dataInizio: string
  dataFine: string
  attivo: boolean
}
```

### `SavingsGoal`
```ts
interface SavingsGoal {
  id: string
  nome: string
  descrizione: string
  importoTarget: number
  importoCorrente: number
  dataInizio: string
  dataScadenza?: string
  contoAssociato?: string
  colore: string
  icona: string
  completato: boolean
  dataCompletamento?: string
}
```

### `AuthContextValue` (`src/context/AuthContext.tsx`)
```ts
interface AuthContextValue {
  user: User | null
  session: Session | null
  isAuthReady: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  inactivityTimeout: number
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isPrivateUnlocked: boolean
  setIsPrivateUnlocked: (value: boolean) => void
  showPrivatePinDialog: boolean
  setShowPrivatePinDialog: (value: boolean) => void
  setInactivityTimeout: (minutes: number) => Promise<void>
  handlePrivatePinSubmit: (pin: string, onUnlocked?: () => void) => Promise<void>
}
```

### `AuthFlowState`
```ts
type AuthFlowState = {
  isAuthReady: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  isPrivateUnlocked: boolean
}
```

---

## Hooks (`src/hooks/`)

| Hook | File | Scopo |
|---|---|---|
| `useInactivityTimer` | `use-inactivity-timer.ts` | Timeout sessione con warning a 1 minuto e reset su attività utente |
| `useHaptic` | `use-haptic.ts` | Feedback tattile per azioni |
| `useKeyboardShortcuts` | `use-keyboard-shortcuts.ts` | Scorciatoie tastiera globali |
| `useListNavigation` | `use-list-navigation.ts` | Navigazione liste con tastiera/screen reader |
| `useMobile` | `use-mobile.ts` | Rilevamento breakpoint mobile |
| `useScreenReader` | `use-screen-reader.ts` | Integrazione screen reader |
| `useTalkback` | `use-talkback.ts` | Rilevamento e supporto TalkBack/VoiceView |
| `useDisplayPreferences` | `use-display-preferences.ts` | Preferenze display utente |

---

## Utility e sistemi (`src/lib/`)

| Modulo | File | Scopo |
|---|---|---|
| Budget alerts | `budget-alerts.ts` | Alert automatici superamento soglia budget |
| Budget forecasting | `budget-forecasting.ts` | Previsioni andamento budget |
| Budget history | `budget-history.ts` | Storico e confronti budget |
| Budget templates | `budget-templates.ts` | Template predefiniti per budget |
| Crypto | `crypto.ts` | Cifratura/decifratura AES-256 per account privato |
| Haptic system | `haptic-system.ts` | Gestione feedback tattile |
| Helpers | `helpers.ts` | Funzioni di utilità generali |
| Screen reader | `screen-reader.ts` | Announce e gestione live regions |
| Sound system | `sound-system.ts` | 40+ suoni per azioni utente |
| Constants | `constants.ts` | Costanti applicazione |
| Utils | `utils.ts` | Utilità condivise (`cn`, ecc.) |

---

## Data layer

| Modulo | File | Scopo |
|---|---|---|
| Supabase client | `src/lib/supabase/client.ts` | Singleton Supabase con `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` |
| Supabase types | `src/lib/supabase/types.ts` | Tipi interni del layer dati: `RepositoryError`, `UserPreferences`, `UserSettings`, DB row-level in snake_case |
| Repository conti | `src/lib/supabase/repositories/conti.ts` | Accesso ai conti dell'utente |
| Repository transazioni | `src/lib/supabase/repositories/transazioni.ts` | Accesso alle transazioni; scrittura senza `cifrato` |
| Repository categorie | `src/lib/supabase/repositories/categorie.ts` | Accesso alle categorie utente e template |
| Repository budget | `src/lib/supabase/repositories/budget.ts` | Accesso ai budget |
| Repository obiettivi risparmio | `src/lib/supabase/repositories/obiettivi-risparmio.ts` | Accesso agli obiettivi di risparmio |
| Repository impostazioni utente | `src/lib/supabase/repositories/impostazioni-utente.ts` | Accesso a impostazioni e preferenze utente |

---

## Storage

I dati di dominio sono persistiti su **Supabase** tramite il layer `src/lib/supabase/`. Il layer è l'unica fonte di chiamate `@supabase/supabase-js` nell'app: nessun componente React chiama Supabase direttamente.

Fa eccezione il bootstrap autenticazione in `src/context/AuthContext.tsx`, che usa direttamente `supabase.auth.getSession()`, `supabase.auth.onAuthStateChange()`, `signInWithPassword()`, `signUp()`, `signOut()` e `resetPasswordForEmail()` per governare il ciclo di sessione.

`localStorage` è usato soltanto per dati di configurazione locale secondaria, come le impostazioni di feedback tattile in `src/lib/haptic-system.ts`.

---

## Autenticazione e sicurezza

- **Autenticazione primaria**: Supabase Auth con email/password e conferma email obbligatoria.
- **Bootstrap sessione**: `AuthContext` parte da `isAuthReady: false`, legge la sessione corrente e poi apre uno di tre gate: login, onboarding, area autenticata.
- **Recupero password**: `resetPassword(email)` usa il flusso email di Supabase senza esporre user enumeration lato UI.
- **Timeout inattività**: `useInactivityTimer` mostra un warning un minuto prima della scadenza e forza `signOut()` allo scadere del timer.
- **PIN privato**: rimane separato e sblocca solo l'account privato; la logica in P27 è transitoria e non usa più `useKV`.
- **Cifratura**: AES-256 per transazioni cifrate (`cifrato: true`).
- L'account `tipo: 'privato'` è invisibile finché `isPrivateUnlocked: false`.

## Testing smoke

- I test smoke usano `src/test/smoke/test-utils.ts` con un mock parziale del contesto auth per verificare il comportamento dell'area autenticata senza dipendere dal form reale di login.
