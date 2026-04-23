# P06 — Hook configurazione shortcut: `use-app-shortcuts.ts`

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 6 (corrispondente al Passo 6 del piano di refactoring)  
> Data: 22 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Al termine dei Passi 1–5, `App.tsx` usa già `AppDataContext`, `AuthContext` e (dopo il collegamento) `useVisibleData` come sorgenti di dati. Tuttavia `App.tsx` contiene ancora un blocco di **168 righe** (righe 276–443) che configura manualmente un array di 14 shortcut da tastiera e lo passa all'hook meccanico `useKeyboardShortcuts`.

Questo blocco non appartiene alla composizione visiva di `App.tsx`: è **logica applicativa** — decide quali tasti fanno cosa, in quale stato dell'app e con quale effetto. La sua presenza in `App.tsx` rende il file più lungo, accoppia la navigazione da tastiera al componente radice e impedisce di riusare la stessa configurazione quando i tab verranno estratti come componenti autonomi.

Il Passo 6 risolve il problema estraendo questa responsabilità in un hook dedicato: `src/hooks/use-app-shortcuts.ts`.

**Cosa fa `useAppShortcuts`**: legge i valori necessari dai context e dall'hook `useVisibleData`, costruisce l'array di shortcut in modo stabile (con `useMemo`), e delega la registrazione del listener a `useKeyboardShortcuts`. Non espone nulla verso l'esterno.

**Cosa NON fa `useAppShortcuts`**: non gestisce stato proprio, non modifica context, non contiene logica di business (CRUD, cifratura, ricorrenze), non tocca il meccanismo di ascolto della tastiera (già in `use-keyboard-shortcuts.ts`).

Al termine del Passo 6 il comportamento dell'app è **identico** a prima. La differenza è che `App.tsx` passa da 1503 righe a circa 1343 righe, e la configurazione delle shortcut è leggibile e testabile in isolamento.

---

## 2. Perimetro della modifica

### File creati

| Percorso | Scopo |
|---|---|
| `src/hooks/use-app-shortcuts.ts` | Hook che configura le 14 shortcut da tastiera applicative |

### File modificati

| Percorso | Modifica |
|---|---|
| `src/App.tsx` | Rimozione blocco shortcut (righe 276–443); sostituzione con `useAppShortcuts(...)` (~9 righe); sostituzione import `useKeyboardShortcuts` con `useAppShortcuts` |

### File non toccati

| Percorso | Motivo |
|---|---|
| `src/hooks/use-keyboard-shortcuts.ts` | Meccanismo già stabile; questo passo non lo modifica |
| `src/context/AppDataContext.tsx` | Tutti gli handler necessari sono già esposti |
| `src/context/AuthContext.tsx` | Tutti i valori di auth necessari sono già esposti |
| `src/hooks/use-visible-data.ts` | Tutti i valori derivati necessari sono già esposti |
| `src/lib/sound-system.ts` | Usato come singleton; nessuna modifica |
| `src/components/` | Invariato |
| `docs/`, `.github/` | Invariati |

---

## 3. Struttura dell'hook

### 3.1 Firma

```ts
// src/hooks/use-app-shortcuts.ts

export interface AppShortcutsOptions {
  activeTab: string
  setActiveTab: (tab: string) => void
  setShowTransactionDialog: (v: boolean) => void
  setShowAccountDialog: (v: boolean) => void
  setShowKeyboardHelp: (v: boolean) => void
  setEditingTransaction: (t: Transaction | undefined) => void
  setEditingAccount: (a: Account | undefined) => void
}

export function useAppShortcuts(options: AppShortcutsOptions): void
```

L'hook non restituisce nulla. Il suo unico effetto è registrare il listener da tastiera tramite `useKeyboardShortcuts`.

### 3.2 Responsabilità: perché alcuni valori sono parametri

Al momento del Passo 6, gli stati di navigazione e dialogo sono ancora variabili locali di `App.tsx` — non esistono context che li espongano. Questi stati verranno spostati in un `UIContext` nei passi successivi (7–10), quando i componenti tab e dialogs verranno estratti.

Per questo motivo `useAppShortcuts` non può leggere `activeTab`, `setActiveTab`, `setShowTransactionDialog` ecc. da un context: devono essere passati come `options` da `App.tsx`, che li conosce già.

`setShowPrivatePinDialog` è l'unica eccezione: è già in `AuthContext` ed è letto direttamente dall'hook tramite `useAuth()`.

**Percorso di migrazione futuro**: quando `UIContext` sarà creato, le `options` che vi confluiscono potranno essere rimosse dalla firma e sostituite con una lettura interna `useUIContext()`. La firma cambierà in quel momento, non ora.

### 3.3 Sorgenti dati

| Valore | Provenienza | Come letto |
|---|---|---|
| `toggleCategoryVisibility` | `useAppData()` | Diretto |
| `toggleAllCategories` | `useAppData()` | Diretto |
| `handleExportCSV` | `useAppData()` | Diretto |
| `isPrivateUnlocked` | `useAuth()` | Diretto |
| `setShowPrivatePinDialog` | `useAuth()` | Diretto |
| `allCategoriesVisible` | `useVisibleData()` | Diretto |
| `hasPrivateAccount` | `useVisibleData()` | Diretto |
| `visibleTransactions` | `useVisibleData()` | Diretto |
| `visibleAccounts` | `useVisibleData()` | Diretto |
| `activeTab` | `options` | Parametro |
| `setActiveTab` | `options` | Parametro |
| `setShowTransactionDialog` | `options` | Parametro |
| `setShowAccountDialog` | `options` | Parametro |
| `setShowKeyboardHelp` | `options` | Parametro |
| `setEditingTransaction` | `options` | Parametro |
| `setEditingAccount` | `options` | Parametro |
| `soundSystem` | `@/lib/sound-system` | Import singleton |
| `toast` | `sonner` | Import diretto |

### 3.4 Import necessari

| Path | Export | Uso |
|---|---|---|
| `react` | `useMemo` | Stabilizzazione array shortcuts |
| `@/context/AppDataContext` | `useAppData` | Handler CRUD e toggle categorie |
| `@/context/AuthContext` | `useAuth` | isPrivateUnlocked, setShowPrivatePinDialog |
| `@/hooks/use-visible-data` | `useVisibleData` | Valori derivati |
| `@/hooks/use-keyboard-shortcuts` | `useKeyboardShortcuts` | Registrazione listener |
| `@/lib/sound-system` | `soundSystem` | Feedback audio shortcut |
| `sonner` | `toast` | Notifiche toast shortcut |
| `@/lib/types` | `Transaction`, `Account` | Tipi per la firma di `AppShortcutsOptions` |

### 3.5 Le 14 shortcut — mappa completa

| # | Tasto | Descrizione | Handler/Azione | Condizione interna |
|---|---|---|---|---|
| 1 | `1` | Toggle Banking | `toggleCategoryVisibility('banking')` | `isAuthenticated && activeTab === 'dashboard'` |
| 2 | `2` | Toggle Digital | `toggleCategoryVisibility('digital')` | stessa |
| 3 | `3` | Toggle Savings | `toggleCategoryVisibility('savings')` | stessa |
| 4 | `4` | Toggle Investments | `toggleCategoryVisibility('investments')` | stessa |
| 5 | `5` | Toggle Private | `toggleCategoryVisibility('private')` | stessa |
| 6 | `Ctrl+A` | Toggle tutte le categorie | `toggleAllCategories()` + legge `allCategoriesVisible` per toast | `isAuthenticated && activeTab === 'dashboard'` |
| 7 | `Ctrl+N` | Nuovo movimento | `setEditingTransaction(undefined)` + `setShowTransactionDialog(true)` | `isAuthenticated` |
| 8 | `Ctrl+M` | Nuovo conto | `setEditingAccount(undefined)` + `setShowAccountDialog(true)` | `isAuthenticated` |
| 9 | `Ctrl+D` | Vai a Dashboard | `setActiveTab('dashboard')` | `isAuthenticated` |
| 10 | `Ctrl+T` | Vai a Movimenti | `setActiveTab('transactions')` | `isAuthenticated` |
| 11 | `Ctrl+R` | Vai a Report | `setActiveTab('reports')` | `isAuthenticated` |
| 12 | `Ctrl+E` | Esporta CSV | `handleExportCSV(visibleTransactions, visibleAccounts)` | `isAuthenticated && activeTab === 'transactions'` |
| 13 | `Ctrl+U` | Sblocca privato | `setShowPrivatePinDialog(true)` | `isAuthenticated && hasPrivateAccount && !isPrivateUnlocked` |
| 14 | `Shift+?` | Aiuto shortcut | `setShowKeyboardHelp(true)` | `isAuthenticated` |

> **Nota**: le condizioni interne (`isAuthenticated && ...`) sono guardie inline nei callback, non nella chiamata a `useKeyboardShortcuts`. L'hook riceve `isAuthenticated` come secondo parametro (`enabled`) e non registra il listener quando è `false`.

### 3.6 Stabilizzazione dell'array con `useMemo`

`useKeyboardShortcuts` ha `[shortcuts, enabled]` come dipendenze del suo `useEffect`. Se l'array viene ricreato a ogni render, il listener viene smontato e rimontato a ogni render — overhead inutile.

L'hook `useAppShortcuts` deve costruire l'array con `useMemo`:

```ts
const shortcuts = useMemo(() => [
  // ... 14 shortcut
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

Le dipendenze **includono le funzioni setter**: `setActiveTab`, `setShow*` sono stabili (create da `useState`), ma dichiararle esplicitamente evita warning eslint/exhaustive-deps e rende il contratto esplicito.

I setter da `AppDataContext` (`toggleCategoryVisibility`, `toggleAllCategories`, `handleExportCSV`) sono già stabili per costruzione del context (definiti con `useCallback` o come funzioni costanti nel corpo del provider). Vanno comunque inclusi nelle dipendenze per correttezza.

---

## 4. Trade-off: shortcut centralizzate vs. distribuite

### Opzione A — Hook unico `useAppShortcuts` (scelta adottata)

Un solo hook registra tutte e 14 le shortcut.

**Pro**:
- Unica sorgente di verità per tutte le scorciatoie dell'app
- `App.tsx` chiama una sola riga dopo la modifica
- Compatibile con lo stato attuale: i tab non sono ancora componenti autonomi
- La lista completa è visibile in un solo file (utile per il componente `KeyboardShortcutsHelp`)
- Nessuna duplicazione di `useKeyboardShortcuts` in componenti multipli

**Contro**:
- L'hook conosce shortcut di tab specifici (es. `Ctrl+E` solo in Transactions) — accoppiamento con la logica di navigazione
- Quando i tab verranno estratti, `useAppShortcuts` dovrà ricevere `activeTab` ancora dai param (o da `UIContext`)

### Opzione B — Shortcut distribuite nei tab

Ogni componente tab (`DashboardTab`, `TransactionsTab`, ecc.) gestisce le proprie shortcut chiamando `useKeyboardShortcuts` direttamente.

**Pro**:
- Accoppiamento ridotto: `DashboardTab` conosce solo le shortcut `1-5` e `Ctrl+A`
- Rimozione naturale dell'`activeTab` come condizione — la shortcut vive già nel contesto corretto

**Contro**:
- I tab non esistono ancora: questa opzione non è percorribile nel Passo 6
- `KeyboardShortcutsHelp` dovrebbe aggregare le shortcut da sorgenti multiple
- `useKeyboardShortcuts` verrebbe chiamato N volte, registrando N listener

### Decisione

**Opzione A** per il Passo 6. L'Opzione B è valida come refactoring futuro (post-P10, quando tutti i tab saranno componenti autonomi). Documentarla nel ticket di estrazione dei tab come potenziale miglioramento da valutare.

---

## 5. Impatto su `App.tsx`

### 5.1 Righe rimosse

| Elemento | Righe | Note |
|---|---|---|
| Import `useKeyboardShortcuts` | 1 (riga 48) | Sostituito da import `useAppShortcuts` |
| Blocco `useKeyboardShortcuts([...], isAuthenticated)` | ~168 (righe 276–443) | Sostituito dalla chiamata all'hook |

### 5.2 Righe aggiunte

```tsx
// Import (riga ~48, sostituisce useKeyboardShortcuts)
import { useAppShortcuts } from '@/hooks/use-app-shortcuts'

// Chiamata (al posto del blocco rimosso, ~8 righe)
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

### 5.3 Stima righe dopo il Passo 6

| | Righe |
|---|---|
| `App.tsx` attuale | 1503 |
| Rimosse (blocco shortcuts + import) | −169 |
| Aggiunte (import + chiamata) | +9 |
| **Stima post-P06** | **~1343** |

### 5.4 Valori che rimangono in `App.tsx`

I seguenti valori vengono ancora calcolati localmente in `App.tsx` anche dopo il Passo 6, perché sono usati nel JSX (non solo nelle shortcut):

- `allCategoriesVisible` (usato nelle classi del bottone toggle categorie)
- `visibleAccounts`, `visibleTransactions` (usati nei tab e nelle card)
- `hasPrivateAccount` (usato nel header)

Questi duplicati rispetto a `useVisibleData` verranno rimossi quando i componenti che li usano saranno estratti (Passi 7–10). Non vanno rimossi in P06.

---

## 6. Criteri di verifica

Al termine del Passo 6, verificare:

1. `src/hooks/use-app-shortcuts.ts` esiste ed esporta `useAppShortcuts`
2. `App.tsx` importa `useAppShortcuts` da `@/hooks/use-app-shortcuts`
3. `App.tsx` **non** contiene più l'array shortcut inline (grep `key: '1'` deve dare zero risultati in App.tsx)
4. `App.tsx` **non** importa più direttamente `useKeyboardShortcuts`
5. **Test manuale — 14 shortcut** (tutte vanno verificate):
   - `1` `2` `3` `4` `5` → toast + toggle categoria (solo in tab Dashboard)
   - `Ctrl+A` → toast "Tutti i filtri" + toggle (solo in tab Dashboard)
   - `Ctrl+N` → dialog Nuovo Movimento apre con editing = undefined
   - `Ctrl+M` → dialog Nuovo Conto apre con editing = undefined
   - `Ctrl+D` → navigazione a Dashboard
   - `Ctrl+T` → navigazione a Movimenti
   - `Ctrl+R` → navigazione a Report
   - `Ctrl+E` → download CSV (solo in tab Movimenti; silenzioso in altri tab)
   - `Ctrl+U` → dialog PIN Privato (solo se conto privato esiste e non è sbloccato)
   - `Shift+?` → dialog Aiuto Tastiera apre
6. Nessuna regressione: login, navigazione tab, CRUD conti e movimenti, filtri categorie
7. `npx tsc --noEmit` compila senza errori
8. **Accessibilità**: le shortcut che aprono dialog (`Ctrl+N`, `Ctrl+M`, `Ctrl+U`, `Shift+?`) non tolgono il focus dall'elemento corrente prima che il dialog sia aperto. Verificare con NVDA che il focus sia all'interno del dialog dopo l'apertura.

---

## 7. Rischi e note

### R1 — Shortcut silenziose — ALTO

Le shortcut che aprono dialog (`Ctrl+N`, `Ctrl+M`, `Ctrl+U`, `Shift+?`) chiamano setter locali di `App.tsx`. Se un setter viene passato scorrettamente o dimenticato nelle `options`, non accade nulla e nessun errore è visibile in console.

**Mitigazione**: verificare queste quattro shortcut come prima cosa nel test manuale. Aggiungere un console warning in sviluppo se `setShowTransactionDialog` non è definito nel callback.

### R2 — Array shortcuts non stabile — MEDIO

Se `useMemo` viene omesso o ha dipendenze incomplete, l'array viene ricreato a ogni render e `useKeyboardShortcuts` smonta e rimonta il listener continuamente. Non causa bug visibili ma è un regressione di performance.

**Mitigazione**: includere tutte le 16 dipendenze nel `useMemo` come indicato in §3.6. Verificare con React DevTools Profiler che il componente non registri re-render eccessivi durante la navigazione normale.

### R3 — `handleExportCSV` richiede parametri runtime — BASSO

La firma di `handleExportCSV` è `(visibleTransactions: Transaction[], visibleAccounts: Account[]) => void`. I due array devono essere letti da `useVisibleData()` nell'hook e passati nella chiamata. Non possono essere letti dalla firma di `options` (non ci sono in App.tsx come parametri, ma come `useMemo` locali).

**Soluzione già applicata nel design**: l'hook legge direttamente `visibleTransactions` e `visibleAccounts` da `useVisibleData()` — non dipende da App.tsx per questi due valori.

### R4 — `isAuthenticated` non entra nelle options — BASSO

`useKeyboardShortcuts` riceve `isAuthenticated` come secondo argomento `enabled`. Questo valore deve essere letto da `useAuth()` all'interno dell'hook, non passato come opzione. Assicurarsi che l'hook destrutturi correttamente `{ isAuthenticated }` da `useAuth()` e lo passi come secondo parametro.

### R5 — `UIContext` futuro — INFORMATIVO

Il prompt di questo passo menziona `UIContext` come già esistente. Al momento dell'implementazione del Passo 6, `UIContext` non è ancora stato creato (il filesystem mostra solo `AppDataContext` e `AuthContext` in `src/context/`). La firma con `options` è la soluzione corretta per l'adesso.

Quando `UIContext` verrà creato (Passi 7–10), la firma di `useAppShortcuts` potrà essere semplificata: le `options` legate agli stati UI confluiranno in `useUIContext()` e potranno essere rimosse dalla firma pubblica. Documentare questa transizione nel documento di design di `UIContext`.

### R6 — Annunci screen reader nelle shortcut — BASSO

Alcune shortcut producono feedback audio (`soundSystem.play`) e toast. Non producono annunci screen reader espliciti (non chiamano `screenReader.announce`). Questo è il comportamento attuale di `App.tsx` e deve essere preservato — non aggiungere nuovi annunci in P06. La revisione dell'accessibilità delle shortcut appartiene a un audit separato.

---

## 8. Cosa NON si sposta in questo passo

| Elemento | Dove rimane | Passo previsto |
|---|---|---|
| `activeTab`, `setActiveTab` locali | `App.tsx` | `UIContext` (Passo 7–10) |
| `showAccountDialog`, `showTransactionDialog`, ecc. | `App.tsx` | `UIContext` o `DialogsOverlay` |
| `editingAccount`, `editingTransaction`, ecc. | `App.tsx` | `UIContext` o `DialogsOverlay` |
| `showKeyboardHelp` | `App.tsx` | `UIContext` |
| `useEffect` cambio tab + annuncio screen reader | `App.tsx` | Estratto con `AppHeader` o `UIContext` |
| `useListNavigation` (recentTransactionsNav, allTransactionsNav) | `App.tsx` | `DashboardTab`, `TransactionsTab` |
| JSX di tutti i tab e i dialog | `App.tsx` | Passi 7–12 |
| `useMemo` duplicati (visibleAccounts, allCategoriesVisible, ecc.) | `App.tsx` | Rimossi quando i componenti che li usano vengono estratti |
