# P06 — Coding Plan: Hook `use-app-shortcuts`

> Documento operativo. Nessun file di codice sorgente viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 6 — Creazione di `src/hooks/use-app-shortcuts.ts`  
> Design di riferimento: `docs/1 - projects/P06-use-app-shortcuts-design.md`  
> Data: 22 aprile 2026

---

## Note preliminari

- I numeri di riga indicati sono **approssimativi** (±5 righe) e vanno verificati nell'editor prima di ogni modifica.
- Questo pacchetto si implementa in **due passi distinti**: prima la creazione del file hook, poi la modifica di `App.tsx`. Ogni passo va verificato separatamente.
- I file in `src/lib/`, `src/context/` e `src/hooks/use-keyboard-shortcuts.ts` non vengono toccati.
- ⚠️ **Nota sul prompt**: il prompt di richiesta menziona `UIContext.tsx` come già esistente. Al momento dell'implementazione `src/context/` contiene solo `AppDataContext.tsx` e `AuthContext.tsx`. La firma con `AppShortcutsOptions` (Passo 1) è la soluzione corretta per l'adesso. Documentato in R5 del design doc.

---

## Ambiguità rilevate

### AI1 — `setShowPrivatePinDialog` da options o da context?

**Situazione**: `setShowPrivatePinDialog` è esposto da `useAuth()` (già in `AuthContext`). Non serve nelle `options`.

**Decisione (design doc §3.2)**: l'hook legge `setShowPrivatePinDialog` direttamente da `useAuth()` — non è un parametro di `AppShortcutsOptions`. Questo riduce l'interfaccia pubblica di 1 parametro.

### AI2 — Numero di shortcut: 14 o 15?

**Situazione**: il prompt di design parla di "15 shortcut", il documento di design conta 14 (tabella §3.5).

**Decisione (analisi diretta di `App.tsx`)**: le shortcut nell'array inline sono **14**. Il numero 15 nel prompt era un'approssimazione. Il coding plan usa 14 come valore corretto.

---

## Rischi

### R1 — Shortcut silenziose — 🔴 Alto

Le shortcut `Ctrl+N`, `Ctrl+M`, `Ctrl+U`, `Shift+?` aprono dialog tramite setter passati nelle `options`. Se un setter viene dimenticato o passato in modo errato, non accade nulla e nessun errore è visibile in console.

**Mitigazione**: testare queste quattro shortcut come **prima azione** dopo il completamento del Passo 2.

### R2 — Array shortcuts non stabile — 🟡 Medio

Se `useMemo` viene omesso o ha dipendenze incomplete, l'array viene ricreato a ogni render e `useKeyboardShortcuts` smonta e rimonta il listener continuamente.

**Mitigazione**: includere tutte e 16 le dipendenze nel `useMemo` (lista completa in Passo 1, §1.4). Verificare con React DevTools Profiler che non ci siano re-render eccessivi durante la navigazione.

### R3 — `handleExportCSV` richiede parametri runtime — 🟢 Basso

`handleExportCSV(visibleTransactions, visibleAccounts)` — i due array non vengono passati da `options` ma letti direttamente da `useVisibleData()` dentro l'hook.

**Mitigazione**: nessuna azione speciale; la soluzione è già nel design (leggere da `useVisibleData()` dentro l'hook).

### R4 — `isAuthenticated` non entra nelle options — 🟢 Basso

`useKeyboardShortcuts` riceve `isAuthenticated` come secondo argomento `enabled`. Questo valore va letto da `useAuth()` dentro l'hook, non da `options`.

**Mitigazione**: destructure `{ isAuthenticated }` da `useAuth()` e passarlo come secondo parametro della chiamata a `useKeyboardShortcuts`.

---

## Passo 1 — Crea `src/hooks/use-app-shortcuts.ts`

### Rischio: 🟢 Basso
### Prerequisito: nessuno (P01 e P05 completati)

### File da creare

**`src/hooks/use-app-shortcuts.ts`** (nuovo)

#### 1.1 Import

```ts
import { useMemo } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useVisibleData } from '@/hooks/use-visible-data'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { soundSystem } from '@/lib/sound-system'
import { toast } from 'sonner'
import type { Transaction, Account } from '@/lib/types'
```

#### 1.2 Interfaccia `AppShortcutsOptions`

```ts
export interface AppShortcutsOptions {
  activeTab: string
  setActiveTab: (tab: string) => void
  setShowTransactionDialog: (v: boolean) => void
  setShowAccountDialog: (v: boolean) => void
  setShowKeyboardHelp: (v: boolean) => void
  setEditingTransaction: (t: Transaction | undefined) => void
  setEditingAccount: (a: Account | undefined) => void
}
```

`setShowPrivatePinDialog` **non** è incluso: viene letto direttamente da `useAuth()` (AI1).

#### 1.3 Sorgenti dati

```ts
export function useAppShortcuts(options: AppShortcutsOptions): void {
  const {
    activeTab,
    setActiveTab,
    setShowTransactionDialog,
    setShowAccountDialog,
    setShowKeyboardHelp,
    setEditingTransaction,
    setEditingAccount,
  } = options

  // Da useAppData()
  const {
    toggleCategoryVisibility,
    toggleAllCategories,
    handleExportCSV,
  } = useAppData()

  // Da useAuth()
  const {
    isAuthenticated,
    isPrivateUnlocked,
    setShowPrivatePinDialog,
  } = useAuth()

  // Da useVisibleData()
  const {
    allCategoriesVisible,
    hasPrivateAccount,
    visibleTransactions,
    visibleAccounts,
  } = useVisibleData()
```

#### 1.4 Array shortcuts con `useMemo`

L'array delle 14 shortcut va racchiuso in `useMemo`. Di seguito le **16 dipendenze** obbligatorie:

```ts
const shortcuts = useMemo(() => [
  // shortcut 1–14 (vedi tabella completa in §1.4.1)
], [
  activeTab,
  allCategoriesVisible,
  hasPrivateAccount,
  isPrivateUnlocked,
  visibleTransactions,
  visibleAccounts,
  toggleCategoryVisibility,
  toggleAllCategories,
  handleExportCSV,
  setShowPrivatePinDialog,
  setActiveTab,
  setShowTransactionDialog,
  setShowAccountDialog,
  setShowKeyboardHelp,
  setEditingTransaction,
  setEditingAccount,
])
```

##### 1.4.1 Corpo completo dell'array shortcuts

```ts
[
  {
    key: '1',
    callback: () => {
      if (isAuthenticated && activeTab === 'dashboard') {
        toggleCategoryVisibility('banking')
        soundSystem.play('click')
        toast.success('Filtro Bancari attivato/disattivato')
      }
    },
    description: 'Toggle Banking category'
  },
  {
    key: '2',
    callback: () => {
      if (isAuthenticated && activeTab === 'dashboard') {
        toggleCategoryVisibility('digital')
        soundSystem.play('click')
        toast.success('Filtro Digitali attivato/disattivato')
      }
    },
    description: 'Toggle Digital category'
  },
  {
    key: '3',
    callback: () => {
      if (isAuthenticated && activeTab === 'dashboard') {
        toggleCategoryVisibility('savings')
        soundSystem.play('click')
        toast.success('Filtro Risparmio attivato/disattivato')
      }
    },
    description: 'Toggle Savings category'
  },
  {
    key: '4',
    callback: () => {
      if (isAuthenticated && activeTab === 'dashboard') {
        toggleCategoryVisibility('investments')
        soundSystem.play('click')
        toast.success('Filtro Investimenti attivato/disattivato')
      }
    },
    description: 'Toggle Investments category'
  },
  {
    key: '5',
    callback: () => {
      if (isAuthenticated && activeTab === 'dashboard') {
        toggleCategoryVisibility('private')
        soundSystem.play('click')
        toast.success('Filtro Privato attivato/disattivato')
      }
    },
    description: 'Toggle Private category'
  },
  {
    key: 'a',
    ctrl: true,
    callback: () => {
      if (isAuthenticated && activeTab === 'dashboard') {
        toggleAllCategories()
        soundSystem.play('click')
        toast.success(allCategoriesVisible ? 'Tutti i filtri nascosti' : 'Tutti i filtri attivati')
      }
    },
    description: 'Toggle all categories'
  },
  {
    key: 'n',
    ctrl: true,
    callback: () => {
      if (isAuthenticated) {
        setEditingTransaction(undefined)
        setShowTransactionDialog(true)
        soundSystem.play('click')
        toast.success('Nuovo movimento')
      }
    },
    description: 'New transaction'
  },
  {
    key: 'm',
    ctrl: true,
    callback: () => {
      if (isAuthenticated) {
        setEditingAccount(undefined)
        setShowAccountDialog(true)
        soundSystem.play('click')
        toast.success('Nuovo conto')
      }
    },
    description: 'New account'
  },
  {
    key: 'd',
    ctrl: true,
    callback: () => {
      if (isAuthenticated) {
        setActiveTab('dashboard')
        soundSystem.play('navigation')
        toast.success('Dashboard')
      }
    },
    description: 'Navigate to Dashboard'
  },
  {
    key: 't',
    ctrl: true,
    callback: () => {
      if (isAuthenticated) {
        setActiveTab('transactions')
        soundSystem.play('navigation')
        toast.success('Movimenti')
      }
    },
    description: 'Navigate to Transactions'
  },
  {
    key: 'r',
    ctrl: true,
    callback: () => {
      if (isAuthenticated) {
        setActiveTab('reports')
        soundSystem.play('navigation')
        toast.success('Report')
      }
    },
    description: 'Navigate to Reports'
  },
  {
    key: 'e',
    ctrl: true,
    callback: () => {
      if (isAuthenticated && activeTab === 'transactions') {
        handleExportCSV(visibleTransactions, visibleAccounts)
      }
    },
    description: 'Export CSV'
  },
  {
    key: 'u',
    ctrl: true,
    callback: () => {
      if (isAuthenticated && hasPrivateAccount && !isPrivateUnlocked) {
        setShowPrivatePinDialog(true)
        soundSystem.play('click')
        toast.success('Sblocca conto privato')
      }
    },
    description: 'Unlock private account'
  },
  {
    key: '?',
    shift: true,
    callback: () => {
      if (isAuthenticated) {
        setShowKeyboardHelp(true)
        soundSystem.play('notification')
      }
    },
    description: 'Show keyboard shortcuts help'
  },
]
```

#### 1.5 Chiamata finale e chiusura hook

```ts
  useKeyboardShortcuts(shortcuts, isAuthenticated)
}
```

### Criterio di verifica — Passo 1

- Il file `src/hooks/use-app-shortcuts.ts` esiste e compila senza errori: `npx tsc --noEmit`
- `useAppShortcuts` è importabile da `@/hooks/use-app-shortcuts`
- L'app **non è ancora cambiata** (App.tsx non è stato modificato)

---

## Passo 2 — Modifica `src/App.tsx`

### Rischio: 🟡 Medio
### Prerequisito: Passo 1 completato e verificato (`tsc --noEmit` senza errori)

### 2.1 Sostituire l'import di `useKeyboardShortcuts`

Riga ~48 di `App.tsx`:

```ts
// RIMUOVERE:
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

// AGGIUNGERE al suo posto:
import { useAppShortcuts } from '@/hooks/use-app-shortcuts'
```

### 2.2 Rimuovere il blocco `useKeyboardShortcuts` inline

Righe ~276–443 di `App.tsx` — rimuovere l'intero blocco:

```ts
// RIMUOVERE (168 righe circa):
useKeyboardShortcuts([
  { key: '1', callback: () => { ... }, description: 'Toggle Banking category' },
  // ... 13 shortcut aggiuntive ...
], isAuthenticated)
```

### 2.3 Aggiungere la chiamata a `useAppShortcuts`

Inserire al posto del blocco rimosso (stessa posizione, dopo il blocco `useListNavigation`):

```ts
useAppShortcuts({
  activeTab,
  setActiveTab,
  setShowTransactionDialog,
  setShowAccountDialog,
  setShowKeyboardHelp,
  setEditingTransaction,
  setEditingAccount,
})
```

### 2.4 Valori che restano in `App.tsx`

I seguenti valori/calcoli sono usati anche nel JSX di `App.tsx` e **non vanno rimossi** in questo passo:

| Elemento | Motivo |
|---|---|
| `useMemo` per `allCategoriesVisible` | Usato nel JSX dei bottoni toggle categorie |
| `useMemo` per `visibleAccounts`, `visibleTransactions` | Usati nei tab e nelle card |
| `hasPrivateAccount` inline | Usato nel header |
| Import `soundSystem` | Usato in altri `useEffect` e handler di App.tsx |
| Import `toast` | Usato in altri handler di App.tsx |

I duplicati rispetto a `useVisibleData` verranno rimossi nei passi 7–10 (estrazione componenti).

### Criterio di verifica — Passo 2

- `App.tsx` non contiene più l'array `shortcuts` inline (grep `key: '1'` → 0 risultati in App.tsx)
- `App.tsx` non importa più `useKeyboardShortcuts` direttamente
- `npx tsc --noEmit` → zero errori
- `npm run build` → compilazione riuscita

---

## Criteri di verifica finali

Al termine di entrambi i passi:

1. `src/hooks/use-app-shortcuts.ts` esiste ed esporta `useAppShortcuts`
2. `App.tsx` importa `useAppShortcuts` da `@/hooks/use-app-shortcuts`
3. `App.tsx` non contiene più l'array shortcut inline
4. `App.tsx` non importa più direttamente `useKeyboardShortcuts`
5. `npx tsc --noEmit` → zero errori TypeScript
6. `npm run build` → compilazione riuscita senza errori
7. **Test manuale — 14 shortcut** (tutte vanno verificate):
   - `1` `2` `3` `4` `5` → toast corrispondente + filtro categoria (solo in tab Dashboard)
   - `Ctrl+A` → toast "Tutti i filtri nascosti/attivati" + toggle (solo in tab Dashboard)
   - `Ctrl+N` → dialog Nuovo Movimento apre con editing = undefined ⚠️ priorità alta
   - `Ctrl+M` → dialog Nuovo Conto apre con editing = undefined ⚠️ priorità alta
   - `Ctrl+D` → navigazione a Dashboard
   - `Ctrl+T` → navigazione a Movimenti
   - `Ctrl+R` → navigazione a Report
   - `Ctrl+E` → download CSV (solo in tab Movimenti; silenzioso in altri tab)
   - `Ctrl+U` → dialog PIN Privato apre (solo se conto privato esiste e non è sbloccato) ⚠️ priorità alta
   - `Shift+?` → dialog Aiuto Tastiera apre ⚠️ priorità alta
8. Nessuna regressione: login, navigazione tab, CRUD conti e movimenti, filtri categorie
9. Accessibilità: le shortcut che aprono dialog non sottraggono focus prima dell'apertura del dialog; con NVDA il focus è all'interno del dialog dopo l'apertura
