# P08 — Coding Plan: Estrazione `DashboardTab`

> Documento operativo. Nessun file di codice sorgente viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 8 — Creazione di `src/components/DashboardTab.tsx`  
> Design di riferimento: `docs/1 - projects/P08-DashboardTab-design.md`  
> Data: 23 aprile 2026

---

## Note preliminari

- I numeri di riga indicati sono **approssimativi** (±5 righe) e vanno verificati nell'editor prima di ogni modifica.
- Questo pacchetto si implementa in **tre passi distinti e sequenziali**: prima la modifica di `AppDataContext`, poi la creazione del componente, infine la pulizia di `App.tsx`. Ogni passo va verificato con `npx tsc --noEmit` prima di procedere al successivo.
- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P07.
- File non toccati in questo passo:

  | File | Motivo |
  |---|---|
  | `src/context/AuthContext.tsx` | `DashboardTab` vi accede in sola lettura; nessuna modifica necessaria |
  | `src/hooks/use-app-shortcuts.ts` | Interfaccia pubblica invariata; i setter arrivano ora dal context |
  | `src/hooks/use-visible-data.ts` | Già espone tutti i valori necessari; nessuna modifica |
  | `src/hooks/use-keyboard-shortcuts.ts` | Meccanismo invariato |
  | `src/components/TransactionsTab.tsx` | Già estratto nel Passo 7; invariato |
  | `src/lib/` | Tutti i file già stabili |
  | `docs/`, `.github/` | Invariati |

---

## Ambiguità rilevate

### AI1 — `AccountCard` senza `onClick` nell'originale

**Situazione**: nel JSX corrente di `App.tsx` (righe 615–635), `AccountCard` è renderizzato **senza** prop `onClick`:

```tsx
<AccountCard
  key={account.id}
  account={account}
  balance={balance}
/>
```

Il design doc §3.2 documenta esplicitamente che questa è una **connessione mancante** che va completata nell'estrazione. Il componente `AccountCard` accetta già `onClick?: () => void` nella sua interfaccia. Il criterio di verifica #9 del design richiede che il click su un conto esistente apra `AccountDialog` precompilato.

**Decisione**: durante la copia del JSX (Passo B.6), aggiungere `onClick` all'`AccountCard`:

```tsx
<AccountCard
  key={account.id}
  account={account}
  balance={balance}
  onClick={() => {
    soundSystem.play('dialog-open')
    hapticSystem.dialogOpen()
    setEditingAccount(account)
    setShowAccountDialog(true)
  }}
/>
```

Questo non è un cambio di logica di business: è il completamento del collegamento UI già previsto dal componente.

### AI2 — `soundSystem` e `hapticSystem` nel componente estratto

**Situazione**: il JSX del DashboardTab usa `soundSystem.play(...)` e `hapticSystem.*()` direttamente nei gestori `onClick` dei pulsanti dell'header (Nuovo Movimento, Nuovo Conto, Sblocca Privato). Questi singleton non sono esposti da alcun context.

**Decisione**: `DashboardTab.tsx` importa direttamente i singleton:

```ts
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
```

Non è un accoppiamento problematico: è lo stesso pattern già usato in `App.tsx` e in altri componenti.

### AI3 — `recentTransactions` già ordinato in `useVisibleData()`

**Situazione**: a differenza di `visibleTransactions` (che filtra ma non ordina), `recentTransactions` in `use-visible-data.ts` riga 61 applica `.sort(...)` prima di `.slice(0, 10)`. I callback di `recentTransactionsNav` usano `recentTransactions[index]` — **senza** sort aggiuntivo.

**Decisione**: nessun `useMemo` di ordinamento è necessario in `DashboardTab`. Usare `recentTransactions` direttamente nei callback e nel render. Non introdurre un `sortedRecentTransactions` aggiuntivo.

### AI4 — Rimozione `useState` locali e aggiornamento `useAppShortcuts`

**Situazione**: dopo la migrazione di `showAccountDialog` e `editingAccount` da `useState` locali ad `AppDataContext`, il blocco `useAppShortcuts` in `App.tsx` (righe 255–262) continua a ricevere `setShowAccountDialog` e `setEditingAccount`. La sorgente cambia (da `useState` locale a `useAppData()` destructure), ma la chiamata è identica — nessuna modifica al blocco `useAppShortcuts`.

**Decisione**: aggiornare solo la destructuring di `useAppData()` in `App.tsx` aggiungendo i due nuovi valori. Il blocco `useAppShortcuts` rimane invariato.

### AI5 — Comportamento di Radix UI `TabsContent` e flag `enabled`

**Situazione**: il design doc §5 afferma che `activeTab === 'dashboard'` è "implicito" per il mount del componente. Verificato: Radix UI `TabsContent` di default usa `forceMount={false}`, quindi smonta il contenuto quando il tab non è attivo. Il componente `DashboardTab` esiste nel DOM solo quando il tab Dashboard è selezionato.

**Decisione**: la condizione `activeTab === 'dashboard'` è effettivamente implicita. Si mantiene solo `enabled: isAuthenticated` nel `useListNavigation` di `recentTransactionsNav`. `isAuthenticated` va letto da `useAuth()` dentro `DashboardTab`.

---

## Rischi

### R1 — `calculateAccountBalance` non esposto da context — 🔴 Alto

`calculateAccountBalance` è una funzione pura in `src/lib/helpers.ts`. **Non** è esposta da `useAppData()` né da `useVisibleData()`. Va importata direttamente.

**Mitigazione**: aggiungere all'import di `@/lib/helpers` nel nuovo componente:
```ts
import { calculateAccountBalance, formatCurrency } from '@/lib/helpers'
```
Verificare questo import **prima** di scrivere il JSX.

### R2 — `ACCOUNT_CATEGORIES` mancante causerebbe runtime error — 🔴 Alto

Il bottone "Mostra Tutti i Conti" (visibile quando `filteredGroupedAccounts.length === 0`) chiama:
```ts
setVisibleCategories(ACCOUNT_CATEGORIES.map(c => c.id))
```
Se `ACCOUNT_CATEGORIES` non è importato, il componente genera un `ReferenceError` a runtime.

**Mitigazione**: aggiungere all'import di `@/lib/constants`:
```ts
import { ACCOUNT_CATEGORIES } from '@/lib/constants'
```

### R3 — Bug pre-esistente su salvataggio movimenti — 🟡 Medio

`handleSaveTransaction` era non funzionante prima del refactoring. Questo passo non deve indagare né correggere tale comportamento.

**Mitigazione**: non toccare `handleSaveTransaction`, non rimuoverlo, non modificarne la firma.

### R4 — `useState` non ancora importato in `AppDataContext.tsx` — 🟢 Basso (già risolto in P07)

`useState` è già presente nell'import di `AppDataContext.tsx` (aggiunto nel Passo 7). Verificare che rimanga nell'import dopo le modifiche del Passo A.

### R5 — `groupedAccounts` vs `filteredGroupedAccounts` per i bottoni filtro — 🔴 Alto

Differenza semantica critica: i bottoni filtro usano `groupedAccounts` (tutte le categorie con conti), non `filteredGroupedAccounts` (solo quelle visibili). Se si usa `filteredGroupedAccounts` per i bottoni, le categorie nascoste spariscono dall'interfaccia, rendendo impossibile riattivarle.

**Mitigazione**: verificare che il `{groupedAccounts.map((category, index) => { ... })}` (bottoni filtro) usi `groupedAccounts`. La griglia dei conti usa `filteredGroupedAccounts` — questa è la distinzione corretta e va preservata.

### R6 — Prerequisito Passo A per stati dialog account — 🔴 Alto

Il Passo B dipende dal Passo A completato: `setEditingAccount` e `setShowAccountDialog` devono essere disponibili da `useAppData()` prima di scrivere `DashboardTab`.

**Mitigazione**: eseguire `npx tsc --noEmit` dopo il Passo A e non procedere al Passo B fino a zero errori.

### R7 — Nessuna regressione su `TransactionsTab` — 🟢 Basso

Il Passo 8 non tocca `TransactionsTab.tsx`. Le modifiche ad `AppDataContext` (aggiunta di 2 stati) non alterano i valori già esposti.

**Mitigazione**: test di fumo sul tab Movimenti al termine del Passo C.

---

## Passo A — Modifica `src/context/AppDataContext.tsx`

### Rischio: 🟡 Medio
### Prerequisito: P01–P07 completati; branch `refactoring-architettura`

### A.1 Aggiornamento di `AppDataContextValue` (righe ~12–55)

Aggiungere **dopo** `setShowDeleteDialog: (v: boolean) => void` e **prima** della chiusura `}` del tipo:

```ts
  // Dialog account
  editingAccount: Account | undefined
  setEditingAccount: (a: Account | undefined) => void
  showAccountDialog: boolean
  setShowAccountDialog: (v: boolean) => void
```

### A.2 Dichiarazione degli `useState` in `AppDataProvider` (dopo riga ~77)

Posizione: subito dopo `const [showDeleteDialog, setShowDeleteDialog] = useState(false)` (riga ~77), prima di `const safeAccounts = useMemo(...)`:

```ts
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
```

### A.3 Aggiornamento del valore del Provider (dopo riga ~400)

Aggiungere **dopo** `setShowDeleteDialog,` nell'oggetto `value`:

```ts
        editingAccount,
        setEditingAccount,
        showAccountDialog,
        setShowAccountDialog,
```

### A.4 Aggiornamento destructuring `useAppData()` in `App.tsx` (righe ~60–97)

Aggiungere i 4 nuovi campi alla destructuring di `useAppData()`. Posizione consigliata: subito dopo `setShowDeleteDialog,`:

```ts
    editingAccount,
    setEditingAccount,
    showAccountDialog,
    setShowAccountDialog,
```

### A.5 Rimozione degli `useState` locali in `App.tsx`

Rimuovere le seguenti righe (ora ridondanti — i valori arrivano dal context):

```ts
// riga ~108 — rimuovere:
const [showAccountDialog, setShowAccountDialog] = useState(false)

// riga ~113 — rimuovere:
const [editingAccount, setEditingAccount] = useState<Account | undefined>()
```

> ⚠️ **Non rimuovere** `showBudgetDialog`, `showSavingsGoalDialog`, `showKeyboardHelp`, `editingBudget`, `editingSavingsGoal`, `activeTab`, `chartPeriod`, `previousTab`. Questi rimangono locali in `App.tsx` e verranno spostati in passi successivi.

### Criterio di verifica — Passo A

- `npx tsc --noEmit` → zero errori TypeScript
- `useAppData()` espone `editingAccount`, `setEditingAccount`, `showAccountDialog`, `setShowAccountDialog`
- `App.tsx` non contiene più `useState` locali per `showAccountDialog` e `editingAccount`
- L'app si avvia normalmente

---

## Passo B — Creazione `src/components/DashboardTab.tsx`

### Rischio: 🔴 Alto (dipende dal Passo A completato)
### Prerequisito: Passo A verificato con `tsc --noEmit` a zero errori

### B.1 Import

```ts
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useVisibleData } from '@/hooks/use-visible-data'
import { useIsMobile } from '@/hooks/use-mobile'
import { useListNavigation } from '@/hooks/use-list-navigation'
import { calculateAccountBalance, formatCurrency } from '@/lib/helpers'
import { ACCOUNT_CATEGORIES } from '@/lib/constants'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { AccountCard } from '@/components/AccountCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, EyeSlash, Eye, LockOpen, PencilSimple, Trash } from '@phosphor-icons/react'
```

> ⚠️ **R1**: `calculateAccountBalance` importato direttamente da `@/lib/helpers`, non da context.  
> ⚠️ **R2**: `ACCOUNT_CATEGORIES` importato direttamente da `@/lib/constants`.

### B.2 Firma del componente

```ts
export function DashboardTab() {
```

Il componente non riceve props.

### B.3 Sorgenti dati

```ts
  const {
    safeCategories,
    setEditingTransaction,
    setShowTransactionDialog,
    setDeletingItem,
    setShowDeleteDialog,
    setEditingAccount,
    setShowAccountDialog,
    toggleCategoryVisibility,
    toggleAllCategories,
    setVisibleCategories,
    visibleCategories,
  } = useAppData()

  const {
    isAuthenticated,
    isPrivateUnlocked,
    setShowPrivatePinDialog,
  } = useAuth()

  const {
    visibleAccounts,
    visibleTransactions,
    recentTransactions,
    groupedAccounts,
    filteredGroupedAccounts,
    allCategoriesVisible,
    hasPrivateAccount,
  } = useVisibleData()

  const isMobile = useIsMobile()
```

### B.4 Inizializzazione di `recentTransactionsNav`

```ts
  const recentTransactionsNav = useListNavigation({
    itemCount: recentTransactions.length,
    enabled: isAuthenticated,
    onEnter: (index) => {
      const transaction = recentTransactions[index]
      if (transaction) {
        setEditingTransaction(transaction)
        setShowTransactionDialog(true)
      }
    },
    onDelete: (index) => {
      const transaction = recentTransactions[index]
      if (transaction) {
        setDeletingItem({ type: 'transaction', id: transaction.id })
        setShowDeleteDialog(true)
      }
    },
    onEdit: (index) => {
      const transaction = recentTransactions[index]
      if (transaction) {
        setEditingTransaction(transaction)
        setShowTransactionDialog(true)
      }
    }
  })
```

> ⚠️ **AI3**: `recentTransactions` è già ordinato da `useVisibleData()`. Nessun sort aggiuntivo necessario nei callback.  
> ⚠️ **AI5**: `enabled: isAuthenticated` — la condizione `activeTab === 'dashboard'` è implicita per il mount del componente.

### B.5 JSX del componente

Copiare il blocco `<TabsContent value="dashboard" ...>` da `App.tsx` righe **437–738** come `return (...)` del componente.

Differenze rispetto all'originale da applicare **durante la copia**:

1. ⚠️ **AI1** — Aggiungere `onClick` ad `AccountCard` (righe ~629–635 originali):
   ```tsx
   // PRIMA (originale in App.tsx):
   <AccountCard
     key={account.id}
     account={account}
     balance={balance}
   />

   // DOPO (nel nuovo componente):
   <AccountCard
     key={account.id}
     account={account}
     balance={balance}
     onClick={() => {
       soundSystem.play('dialog-open')
       hapticSystem.dialogOpen()
       setEditingAccount(account)
       setShowAccountDialog(true)
     }}
   />
   ```

2. ⚠️ **R5** — Verificare che i bottoni filtro iterino su `groupedAccounts` (riga ~580 originale: `{groupedAccounts.map((category, index) => {...})}`), **non** su `filteredGroupedAccounts`. La griglia conti a riga ~615 usa invece `filteredGroupedAccounts.map(group => {...})` — questa distinzione è corretta e va preservata.

3. Sostituire i riferimenti a `recentTransactionsNav` nelle righe ~670 e ~680 con l'istanza locale definita in B.4 — la naming è identica, nessun rinomina necessario.

### B.6 Verifica del Passo B

- Salvare il file
- `npx tsc --noEmit` → zero errori TypeScript
- Verificare che `src/components/DashboardTab.tsx` esista con `export function DashboardTab`
- L'app **non cambia ancora** — `App.tsx` non è stato modificato in questo passo

---

## Passo C — Modifica `src/App.tsx`

### Rischio: 🟡 Medio
### Prerequisito: Passi A e B completati e verificati (`tsc --noEmit` a zero errori)

### C.1 Aggiunta import `DashboardTab` (~riga 35)

Aggiungere subito dopo (o vicino a) `import { TransactionsTab } from '@/components/TransactionsTab'`:

```ts
import { DashboardTab } from '@/components/DashboardTab'
```

### C.2 Rimozione di `recentTransactionsNav` (~righe 226–253)

Individuare il blocco:

```ts
  const recentTransactionsNav = useListNavigation({
    itemCount: recentTransactions.length,
    enabled: isAuthenticated && activeTab === 'dashboard',
    ...
  })
```

Rimuovere l'intero blocco (~26 righe). Il blocco successivo `useAppShortcuts(...)` (righe ~255–262) **non va toccato**.

> ⚠️ Dopo la rimozione, verificare che `recentTransactions` non sia più referenziato in `App.tsx` (era usato solo da `recentTransactionsNav`). Se TypeScript segnala `recentTransactions` come valore inutilizzato, rimuoverlo dalla destructuring di `useVisibleData()` in `App.tsx` — ma solo se confermato inutilizzato.

### C.3 Sostituzione del blocco `TabsContent value="dashboard"` (righe ~437–738)

Individuare:
```tsx
          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6" id="dashboard-panel" role="tabpanel" aria-labelledby="dashboard-tab">
```

Individuare la chiusura `</TabsContent>` corrispondente (~riga 738, la riga immediatamente prima di `<TransactionsTab />`).

Rimuovere l'intero blocco (~301 righe) e sostituire con:

```tsx
          <DashboardTab />
```

Verificare che `<TransactionsTab />` (riga ~739, ora ~riga X) e `<TabsContent value="reports"` rimangano invariati.

### C.4 Verifica import inutilizzati in `App.tsx`

Dopo l'estrazione, i seguenti import potrebbero diventare inutilizzati in `App.tsx`. Verificare con TypeScript:

| Import | Ancora usato? | Nota |
|---|---|---|
| `AccountCard` | No (se usato solo nella Dashboard) | Rimuovere se non referenziato altrove |
| `Eye`, `EyeSlash` | No (usati solo nei filtri categoria) | Rimuovere se non referenziati altrove |
| `LockOpen` | No (usato solo nel pulsante Sblocca) | Rimuovere se non referenziato altrove |
| `PencilSimple` | Verificare | Potrebbe essere ancora usato in ReportsTab |
| `Trash` | Verificare | Potrebbe essere ancora usato in ReportsTab |
| `calculateAccountBalance` | No | Rimuovere da `App.tsx` |
| `ACCOUNT_TYPE_TO_CATEGORY`, `ACCOUNT_CATEGORIES` | Verificare | `ACCOUNT_CATEGORIES` usato nel budget alert check; `ACCOUNT_TYPE_TO_CATEGORY` usato in ReportsTab? |

> ⚠️ Non rimuovere import in modo speculativo. Affidarsi agli errori TypeScript "declared but never read" e rimuovere solo quelli confermati.

### C.5 Verifica `recentTransactions` nella destructuring di `useVisibleData()` (~riga 200)

Dopo la rimozione di `recentTransactionsNav`, `recentTransactions` non è più usato in `App.tsx`. Verificare con TypeScript e rimuoverlo dalla destructuring di `useVisibleData()` se segnalato come inutilizzato.

### C.6 Verifica del Passo C

- Salvare il file
- `npx tsc --noEmit` → zero errori TypeScript
- `npm run build` → compilazione riuscita senza errori
- `grep "recentTransactionsNav" src/App.tsx` → zero risultati
- `grep "TabsContent value=\"dashboard\"" src/App.tsx` → zero risultati
- `grep "DashboardTab" src/App.tsx` → 2 risultati (import + `<DashboardTab />`)
- `grep "editingAccount" src/App.tsx` → solo nella destructuring `useAppData()` e nei siti di uso ancora validi (es. `AccountDialog` nella DialogsOverlay)
