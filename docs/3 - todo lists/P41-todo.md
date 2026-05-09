# P41 — Todo: Fix doppia chiamata `onFocusReturn` nel menu azioni

> Pacchetto P41 — Fix double-call onFocusReturn TransactionActionMenu
> Piano di riferimento: `docs/2 - coding plans/P41-coding-plan.md`
> Report di riferimento: `docs/4 - reports/report-debug-focus-handler-accumulation.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-09
> Completato: —

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npx tsc --noEmit` → 0 errori TypeScript | [ ] |
| `npm run build` exit 0 | [ ] |
| Console browser: click "Modifica" → 1 solo log `[MENU] handleEdit chiamato` | [ ] |
| Console browser: click "Elimina" → 1 solo log `[MENU] handleDelete chiamato` | [ ] |
| Console browser: click "Apri dettaglio" → 1 solo log `[MENU] handleDetail chiamato` | [ ] |
| Sequenza Modifica → Elimina: nessun accumulo di log | [ ] |
| `git diff --name-only HEAD \| grep ".github"` → output vuoto | [ ] |

---

## Prerequisiti — Prima di iniziare

> Non avviare la Fase 1 finché questi controlli non sono completati e documentati.

- [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P41-coding-plan.md`
- [ ] Verificare di essere sul branch `refactoring-architettura`:
  ```
  git branch --show-current
  ```

### BL1 — Baseline build

- [ ] `npm run build` → exit 0
  > Esito BL1 build: _

### BL2 — Baseline TypeScript

- [ ] `npx tsc --noEmit` → 0 errori
  > Esito BL2 tsc: _

### BL3 — Baseline console

- [ ] Aprire il browser, tab Movimenti, DevTools Console con filtro `[MENU]`
- [ ] Cliccare "Modifica" su una riga → annotare quanti log `[MENU]` appaiono:
  > Esito BL3 (prima del fix): _ log per click

---

## FASE 1 — `TransactionActionMenu.tsx`: rimozione `onFocusReturn` da `handleOpenChange`

> Perimetro: solo `src/components/TransactionActionMenu.tsx`.

### Passo 1 — Modificare `handleOpenChange`

- [ ] **1.1** — Aprire `src/components/TransactionActionMenu.tsx`
- [ ] **1.2** — Individuare la funzione `handleOpenChange` (righe ~41–46):
  ```typescript
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) {
      onFocusReturn()
    }
  }
  ```
- [ ] **1.3** — Rimuovere il blocco `if (!open) { onFocusReturn() }`. Il risultato deve essere:
  ```typescript
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
  }
  ```
- [ ] **1.4** — Verificare che `handleDetail`, `handleEdit`, `handleDelete` contengano ancora ciascuno la propria chiamata a `onFocusReturn()` — non toccarle

#### Gate Passo 1

- [ ] `npx tsc --noEmit` → 0 errori
  > Esito Gate 1: _

---

## FASE 2 — `TransactionsTab.tsx`: connessione dei `useCallback`

> Perimetro: solo `src/components/TransactionsTab.tsx`.

### Passo 2 — Pre-verifica corrispondenza nomi props

- [ ] **2.1** — In `TransactionActionMenu.tsx` verificare i nomi esatti delle props dell'interfaccia `TransactionActionMenuProps`:
  - `onOpenChange: (open: boolean) => void` ← corrisponde a wrapper su `onMenuTransactions`
  - `onEdit: () => void` ← corrisponde a wrapper su `onEditTransactions`
  - `onDelete: () => void` ← corrisponde a wrapper su `onDeleteTransactions`
- [ ] **2.2** — In `TransactionsTab.tsx` verificare che i tre `useCallback` esistano e abbiano le firme attese:
  - `onMenuTransactions: (index: number) => void` → `setOpenMenuIndex(index)`
  - `onEditTransactions: (index: number) => void` → `openEditTransactionDialog(transaction)`
  - `onDeleteTransactions: (index: number) => void` → `setDeletingItem + setShowDeleteDialog`

### Passo 3 — Sostituire le props inline nel blocco `<TransactionActionMenu>`

- [ ] **3.1** — Individuare il blocco `<TransactionActionMenu>` nel `.map()` di `sortedTransactions`
- [ ] **3.2** — Sostituire la prop `onOpenChange` inline:
  - **Prima:** `onOpenChange={(open) => setOpenMenuIndex(open ? index : -1)}`
  - **Dopo:** `onOpenChange={(open) => open ? onMenuTransactions(index) : setOpenMenuIndex(-1)}`
- [ ] **3.3** — Sostituire la prop `onEdit` inline:
  - **Prima:** `onEdit={() => openEditTransactionDialog(transaction)}`
  - **Dopo:** `onEdit={() => onEditTransactions(index)}`
- [ ] **3.4** — Sostituire la prop `onDelete` inline:
  - **Prima:**
    ```typescript
    onDelete={() => {
      setDeletingItem({ type: 'transaction', id: transaction.id })
      setShowDeleteDialog(true)
    }}
    ```
  - **Dopo:** `onDelete={() => onDeleteTransactions(index)}`
- [ ] **3.5** — Lasciare invariata la prop `onFocusReturn` (resta la closure inline che cattura `index`)

#### Gate Passo 3

- [ ] `npx tsc --noEmit` → 0 errori
  > Esito Gate 3: _

---

## FASE 3 — `TransactionsTab.tsx`: rimozione `useEffect` morto

> Perimetro: solo `src/components/TransactionsTab.tsx`.

### Passo 4 — Rimuovere il `useEffect` con selettore inesistente

- [ ] **4.1** — Individuare il `useEffect` (righe ~31–40) con il seguente contenuto:
  ```typescript
  useEffect(() => {
    if (openMenuIndex < 0) return
    return () => {
      const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
        `[data-list-item][data-index="${openMenuIndex}"]`
      )
      el?.focus()
    }
  }, [openMenuIndex])
  ```
- [ ] **4.2** — Rimuovere l'intero blocco `useEffect` dal file

### Passo 5 — Verifica import `useEffect`

- [ ] **5.1** — Verificare se `useEffect` è ancora usato altrove in `TransactionsTab.tsx`:
  ```
  grep -n "useEffect" src/components/TransactionsTab.tsx
  ```
- [ ] **5.2a** — Se il grep non restituisce altri risultati: rimuovere `useEffect` dalla riga di import (`import { useMemo, useRef, useCallback, useState, useEffect } from 'react'` → rimuovere `useEffect`)
- [ ] **5.2b** — Se il grep restituisce altri `useEffect`: lasciare l'import invariato

#### Gate Passo 5

- [ ] `npx tsc --noEmit` → 0 errori
  > Esito Gate 5: _

---

## FASE 4 — Verifica finale

### Build e TypeScript

- [ ] `npm run build` → exit 0
  > Esito build finale: _
- [ ] `npx tsc --noEmit` → 0 errori
  > Esito tsc finale: _

### Verifica console browser

- [ ] Aprire il tab Movimenti, DevTools Console con filtro `[MENU]`
- [ ] Click su "Modifica" su riga qualunque → controllare log:
  - [ ] Appare esattamente 1 log `[MENU] handleEdit chiamato`
  - [ ] Non appaiono `[MENU] handleDetail` o `[MENU] handleDelete` prima di esso
- [ ] Click su "Elimina" su riga qualunque → controllare log:
  - [ ] Appare esattamente 1 log `[MENU] handleDelete chiamato`
  - [ ] Non appaiono log di azioni precedenti
- [ ] Click su "Apri dettaglio" → controllare log:
  - [ ] Appare esattamente 1 log `[MENU] handleDetail chiamato`
- [ ] Sequenza: Modifica → chiudi dialog → Elimina → controllare log:
  - [ ] Il click "Elimina" produce solo 1 log `[MENU] handleDelete chiamato` (nessun accumulo)

### Verifica perimetro git

- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto (nessun file framework modificato)
- [ ] `git diff --name-only HEAD` → solo i file:
  - `src/components/TransactionActionMenu.tsx`
  - `src/components/TransactionsTab.tsx`
  - (eventualmente `src/components/TransactionsTab.tsx` una sola volta per entrambi i passi 2 e 3)
