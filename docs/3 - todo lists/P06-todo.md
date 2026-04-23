# P06 — Todo List: Hook `use-app-shortcuts`

> Checklist operativa sequenziale per il Pacchetto 6.  
> Coding Plan di riferimento: `docs/2 - coding plans/P06-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P06-use-app-shortcuts-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi nel coding plan)

---

## Prima di iniziare

- [x] Leggere `docs/2 - coding plans/P06-coding-plan.md` per intero
- [x] Prendere nota dell'ambiguità **AI1** (`setShowPrivatePinDialog` non va nelle options — viene letto da `useAuth()` dentro l'hook)
- [x] Prendere nota dell'ambiguità **AI2** (le shortcut sono **14**, non 15 — valore corretto da usare nel coding plan e nei test)
- [x] Verificare di essere sul branch `refactoring-architettura`
- [x] Eseguire `npm run build` e confermare che compila senza errori **prima** di iniziare

---

## Passo A — Creazione del file `src/hooks/use-app-shortcuts.ts`

> **Prerequisito**: nessuno. P01 e P05 devono essere già completati e presenti nel branch.

### A.1 Creazione del file e import

- [x] Creare il file `src/hooks/use-app-shortcuts.ts` vuoto
- [x] Aggiungere import da `react`: `useMemo`
- [x] Aggiungere import da `@/context/AppDataContext`: `useAppData`
- [x] Aggiungere import da `@/context/AuthContext`: `useAuth`
- [x] Aggiungere import da `@/hooks/use-visible-data`: `useVisibleData`
- [x] Aggiungere import da `@/hooks/use-keyboard-shortcuts`: `useKeyboardShortcuts`
- [x] Aggiungere import da `@/lib/sound-system`: `soundSystem`
- [x] Aggiungere import da `sonner`: `toast`
- [x] Aggiungere import di tipo da `@/lib/types`: `Transaction`, `Account`

### A.2 Dichiarazione di `AppShortcutsOptions`

- [x] Esportare l'interfaccia `AppShortcutsOptions` con i 7 campi:
  - `activeTab: string`
  - `setActiveTab: (tab: string) => void`
  - `setShowTransactionDialog: (v: boolean) => void`
  - `setShowAccountDialog: (v: boolean) => void`
  - `setShowKeyboardHelp: (v: boolean) => void`
  - `setEditingTransaction: (t: Transaction | undefined) => void`
  - `setEditingAccount: (a: Account | undefined) => void`
- [x] ⚠️ **AI1**: verificare che `setShowPrivatePinDialog` **NON** sia incluso nell'interfaccia — viene letto da `useAuth()` dentro l'hook

### A.3 Firma e sorgenti dati dell'hook

- [x] Aprire la funzione `export function useAppShortcuts(options: AppShortcutsOptions): void`
- [x] Destructure da `options`: `activeTab`, `setActiveTab`, `setShowTransactionDialog`, `setShowAccountDialog`, `setShowKeyboardHelp`, `setEditingTransaction`, `setEditingAccount`
- [x] Destructure da `useAppData()`: `toggleCategoryVisibility`, `toggleAllCategories`, `handleExportCSV`
- [x] Destructure da `useAuth()`: `isAuthenticated`, `isPrivateUnlocked`, `setShowPrivatePinDialog`
- [x] Destructure da `useVisibleData()`: `allCategoriesVisible`, `hasPrivateAccount`, `visibleTransactions`, `visibleAccounts`

### A.4 Array shortcuts con `useMemo`

- [x] ⚠️ **R2**: aprire il blocco `const shortcuts = useMemo(() => [...], [...])`
- [x] Aggiungere la shortcut `1` — Toggle Banking (`toggleCategoryVisibility('banking')`)
- [x] Aggiungere la shortcut `2` — Toggle Digital (`toggleCategoryVisibility('digital')`)
- [x] Aggiungere la shortcut `3` — Toggle Savings (`toggleCategoryVisibility('savings')`)
- [x] Aggiungere la shortcut `4` — Toggle Investments (`toggleCategoryVisibility('investments')`)
- [x] Aggiungere la shortcut `5` — Toggle Private (`toggleCategoryVisibility('private')`)
- [x] Aggiungere la shortcut `Ctrl+A` — Toggle tutte le categorie (`toggleAllCategories()`, usa `allCategoriesVisible` per il testo del toast)
- [x] Aggiungere la shortcut `Ctrl+N` — Nuovo movimento (`setEditingTransaction(undefined)` + `setShowTransactionDialog(true)`)
- [x] Aggiungere la shortcut `Ctrl+M` — Nuovo conto (`setEditingAccount(undefined)` + `setShowAccountDialog(true)`)
- [x] Aggiungere la shortcut `Ctrl+D` — Naviga Dashboard (`setActiveTab('dashboard')`)
- [x] Aggiungere la shortcut `Ctrl+T` — Naviga Movimenti (`setActiveTab('transactions')`)
- [x] Aggiungere la shortcut `Ctrl+R` — Naviga Report (`setActiveTab('reports')`)
- [x] Aggiungere la shortcut `Ctrl+E` — Esporta CSV (`handleExportCSV(visibleTransactions, visibleAccounts)`)
- [x] Aggiungere la shortcut `Ctrl+U` — Sblocca privato (`setShowPrivatePinDialog(true)`)
- [x] Aggiungere la shortcut `Shift+?` — Aiuto shortcut (`setShowKeyboardHelp(true)`)

### A.5 Dipendenze del `useMemo`

- [x] Verificare che l'array delle dipendenze contenga tutte e 16 le voci:
  - `activeTab`
  - `allCategoriesVisible`
  - `hasPrivateAccount`
  - `isPrivateUnlocked`
  - `visibleTransactions`
  - `visibleAccounts`
  - `toggleCategoryVisibility`
  - `toggleAllCategories`
  - `handleExportCSV`
  - `setShowPrivatePinDialog`
  - `setActiveTab`
  - `setShowTransactionDialog`
  - `setShowAccountDialog`
  - `setShowKeyboardHelp`
  - `setEditingTransaction`
  - `setEditingAccount`
- [x] ⚠️ **R2**: nessuna dipendenza mancante o in più rispetto a questa lista

### A.6 Chiamata a `useKeyboardShortcuts`

- [x] Aggiungere la riga finale: `useKeyboardShortcuts(shortcuts, isAuthenticated)`
- [x] ⚠️ **R4**: verificare che `isAuthenticated` (secondo parametro) sia letto da `useAuth()` — non dalle `options`

### A.7 Verifica del Passo A

- [x] Salvare il file
- [x] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Verificare che il file esista: `src/hooks/use-app-shortcuts.ts`
- [x] Verificare che l'export `useAppShortcuts` sia presente nel file
- [x] L'app si avvia normalmente (le shortcut funzionano ancora dall'array inline in App.tsx — non ancora collegato)

---

## Passo B — Modifica `src/App.tsx`

> **Prerequisito**: Passo A completato e verificato (`tsc --noEmit` senza errori) ✓

### B.1 Sostituzione dell'import

- [x] Aprire `src/App.tsx`
- [x] Individuare riga ~48: `import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'`
- [x] Sostituire con: `import { useAppShortcuts } from '@/hooks/use-app-shortcuts'`

### B.2 Rimozione del blocco shortcut inline

- [x] Individuare riga ~276: inizio del blocco `useKeyboardShortcuts([`
- [x] Individuare riga ~443: fine del blocco `], isAuthenticated)`
- [x] Rimuovere l'intero blocco (~168 righe)
- [x] ⚠️ **R1**: dopo la rimozione, verificare che il cursore si trovi nel punto corretto — non rimuovere righe adiacenti non pertinenti

### B.3 Inserimento della chiamata a `useAppShortcuts`

- [x] Inserire al posto del blocco rimosso (stessa posizione):
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
- [x] Verificare che `activeTab`, `setActiveTab` ecc. siano già disponibili come variabili locali in `App.tsx` (dal `useState` a riga ~112)

### B.4 Controllo valori rimasti in `App.tsx`

- [x] Verificare che **non** siano stati rimossi per errore i seguenti elementi (necessari al JSX):
  - `useMemo` per `allCategoriesVisible`
  - `useMemo` per `visibleAccounts` e `visibleTransactions`
  - `hasPrivateAccount` inline
  - Import `soundSystem`
  - Import `toast`

### B.5 Verifica del Passo B

- [x] Salvare il file
- [x] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Eseguire `npm run build` → compilazione riuscita senza errori
- [x] Grep su `App.tsx` per `key: '1'` → zero risultati (array inline rimosso)
- [x] Grep su `App.tsx` per `useKeyboardShortcuts` → zero risultati (import rimosso)

---

## Verifica finale

### Compilazione

- [x] `npx tsc --noEmit` → zero errori TypeScript
- [x] `npm run build` → compilazione riuscita senza errori

### Test manuale — 14 shortcut (tutte obbligatorie)

> ⚠️ Testare le shortcut silenziose **per prime** (R1): un fallimento silenzioso non produce errori visibili.

- [x] ⚠️ **R1** `Ctrl+N` → dialog Nuovo Movimento apre con campo editing vuoto
- [x] ⚠️ **R1** `Ctrl+M` → dialog Nuovo Conto apre con campo editing vuoto
- [x] ⚠️ **R1** `Ctrl+U` → dialog PIN Privato apre (solo se conto privato esiste e non è sbloccato; silenzioso altrimenti)
- [x] ⚠️ **R1** `Shift+?` → dialog Aiuto Tastiera apre
- [x] `1` → toast "Filtro Bancari attivato/disattivato" (solo in tab Dashboard)
- [x] `2` → toast "Filtro Digitali attivato/disattivato" (solo in tab Dashboard)
- [x] `3` → toast "Filtro Risparmio attivato/disattivato" (solo in tab Dashboard)
- [x] `4` → toast "Filtro Investimenti attivato/disattivato" (solo in tab Dashboard)
- [x] `5` → toast "Filtro Privato attivato/disattivato" (solo in tab Dashboard)
- [x] `Ctrl+A` → toast "Tutti i filtri nascosti" / "Tutti i filtri attivati" (solo in tab Dashboard)
- [x] `Ctrl+D` → navigazione a Dashboard + toast "Dashboard"
- [x] `Ctrl+T` → navigazione a Movimenti + toast "Movimenti"
- [x] `Ctrl+R` → navigazione a Report + toast "Report"
- [x] `Ctrl+E` → download CSV (solo in tab Movimenti; silenzioso in altri tab)

### Test di regressione

- [x] Login con PIN globale → accesso concesso normalmente
- [x] Aggiungere un movimento → toast "Movimento aggiunto", saldo aggiornato
- [x] Modificare un conto → toast "Conto modificato"
- [x] Filtri categoria visibili nella Dashboard, toggle funzionante
- [x] Nessun errore in console (F12) durante la navigazione normale

### Accessibilità

- [x] Con NVDA attivo: `Ctrl+N` → focus all'interno del dialog Nuovo Movimento dopo apertura
- [x] Con NVDA attivo: `Ctrl+M` → focus all'interno del dialog Nuovo Conto dopo apertura
- [x] Con NVDA attivo: `Shift+?` → focus all'interno del dialog Aiuto Tastiera dopo apertura

Completato il 2026-04-23.
