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

## Storage

I dati sono persistiti in **localStorage** come JSON cifrato (per account privato) o in chiaro.
Nessuna chiamata di rete: l'app è completamente offline-first.

---

## Sicurezza

- **PIN globale**: hash SHA-256, blocca l'intera applicazione
- **PIN privato**: hash SHA-256 separato, sblocca solo l'account privato
- **Cifratura**: AES-256 per transazioni cifrate (`cifrato: true`)
- L'account `tipo: 'privato'` è invisibile finché `isPrivateUnlocked: false`
