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

### `AppState`
```ts
interface AppState {
  isAuthenticated: boolean
  isPrivateUnlocked: boolean
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  savingsGoals: SavingsGoal[]
  globalPinHash: string
  privatePinHash: string
}
```

---

## Hooks (`src/hooks/`)

| Hook | File | Scopo |
|---|---|---|
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

`localStorage` è usato soltanto per dati di configurazione locale secondaria, come le impostazioni di feedback tattile in `src/lib/haptic-system.ts`.

---

## Sicurezza

- **PIN globale**: hash SHA-256, blocca l'intera applicazione
- **PIN privato**: hash SHA-256 separato, sblocca solo l'account privato
- **Cifratura**: AES-256 per transazioni cifrate (`cifrato: true`)
- L'account `tipo: 'privato'` è invisibile finché `isPrivateUnlocked: false`
