# P40 — Coding Plan: Riga compatta e menu azioni nel tab Movimenti

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P40 — Compact row + action menu TransactionsTab
> Report di riferimento: `docs/4 - reports/report-analisi-impatto-riga-breve-menu-movimenti.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-08

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P40 — Compact row + action menu TransactionsTab |
| **Tipo intervento** | Feature |
| **Branch** | `refactoring-architettura` |
| **Data** | 2026-05-08 |
| **File modificati** | `src/lib/helpers.ts` · `src/hooks/use-list-navigation.ts` · `src/components/TransactionsTab.tsx` |
| **File creati** | `src/components/TransactionActionMenu.tsx` |
| **Report di riferimento** | [report-analisi-impatto-riga-breve-menu-movimenti.md](../4%20-%20reports/report-analisi-impatto-riga-breve-menu-movimenti.md) |

---

## §2 — Obiettivo

**Modifica 1 — Riga compatta.** Sostituire il layout a due righe di ogni movimento (descrizione + riga meta) con una riga singola a quattro colonne fisse: data `07/05/26`, descrizione troncata a 30 caratteri, importo colorato, conto (o etichetta fissa "Trasferimento" per i trasferimenti). Il badge ricorrenza viene rimosso dalla riga. L'altezza di ogni riga è uniforme per tutti i movimenti.

**Modifica 2 — Menu azioni adattivo.** Rimuovere i pulsanti icona matita e cestino. Al loro posto aggiungere un trigger `DotsThreeVertical` che apre un `DropdownMenu` su desktop o uno `Sheet` dal basso su mobile. Il menu contiene tre voci: Apri dettaglio (placeholder toast), Modifica, Elimina. Invio/Spazio sulla riga apre il menu; E apre direttamente il dialog di modifica; Esc chiude il menu; alla chiusura il focus torna sulla riga.

**Risultato atteso:**
- Ogni riga mostra: `07/05/26 · Stipendio mensile… · +1.600,00 € · Banca`
- Trasferimenti mostrano: `07/05/26 · Giro conto… · →100,00 € · Trasferimento`
- Il menu si apre con Invio/Spazio da tastiera e con tap sul trigger su mobile
- NVDA e screen reader leggono `aria-label` della riga completo di tipo, importo, data, conto
- Nessuna regressione su DashboardTab, navigazione frecce, shortcuts globali

---

## §3 — Motivazione tecnica

La riga attuale usa `space-y-1` con descrizione su prima riga e data/conto/categoria su seconda riga: occupa altezza variabile e mostra fino a 5 campi. Il nuovo design richiede densità informativa costante. La data usa `toLocaleDateString('it-IT')` senza padding e con anno a 4 cifre; il formato richiesto è `07/05/26`. Non esiste una funzione helper per questo formato, ma `helpers.ts` contiene già `formatDate` e `formatCurrency` — il pattern naturale è aggiungere `formatDateShort` nello stesso file.

Per il menu azioni: `DropdownMenu` e `Sheet` sono già installati come pacchetti Radix e hanno wrapper completi in `src/components/ui/`. Nessuno dei due è usato nei componenti applicativi. `useIsMobile` è già usato in `AppHeader` e `DashboardTab`. `useListNavigation` gestisce Enter/Space tramite la callback `onEnter`; per P40 serve una callback separata `onMenu` che Enter/Space chiama invece di `onEnter`, lasciando `onEnter` come fallback per i consumer esistenti (DashboardTab) che non hanno un menu.

---

## §4 — File coinvolti (ordine vincolante)

1. `src/lib/helpers.ts`
2. `src/hooks/use-list-navigation.ts`
3. `src/components/TransactionActionMenu.tsx` ← **nuovo file**
4. `src/components/TransactionsTab.tsx`

L'ordine è vincolante: il Passo 3 (`TransactionsTab.tsx`) importa sia `formatDateShort` (Passo 1) sia `TransactionActionMenu` (Passo 3 nuovo file) sia la callback `onMenu` dell'hook (Passo 2). Il Passo 2 e il Passo 3-nuovo-file sono mutuamente indipendenti e possono essere eseguiti in parallelo dopo il Passo 1.

---

## §5 — Modifiche dettagliate per ogni file

---

### Passo 1 — `src/lib/helpers.ts`

**Obiettivo:** aggiungere la funzione `formatDateShort` che produce il formato `07/05/26` (giorno e mese con zero iniziale, anno a 2 cifre) da una stringa ISO.

#### Modifica 1a — Aggiungere `formatDateShort` dopo `formatDate`

**Righe 39-42. Codice attuale:**

```ts
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('it-IT').format(date)
}
```

**Codice nuovo (aggiunta dopo, non sostituzione):**

```ts
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('it-IT').format(date)
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}
```

**Motivazione:** `Intl.DateTimeFormat` con `year: '2-digit'` produce `"07/05/26"` ma non garantisce zero-padding su tutti i browser per giorno e mese. L'implementazione manuale con `padStart` è deterministica e non dipende dal locale del browser.

**Gate 1:**
```bash
npx tsc --noEmit
```
Atteso: 0 errori. La funzione non ha dipendenze esterne.

---

### Passo 2 — `src/hooks/use-list-navigation.ts`

**Obiettivo:** aggiungere la callback `onMenu` all'interfaccia. Enter e Spazio chiamano `onMenu` con fallback a `onEnter` — i consumer esistenti (DashboardTab) non richiedono modifiche.

#### Modifica 2a — Aggiungere `onMenu` all'interfaccia

**Righe 3-11. Codice attuale:**

```ts
interface UseListNavigationProps {
  itemCount: number
  onEnter?: (index: number) => void
  onDelete?: (index: number) => void
  onEdit?: (index: number) => void
  enabled?: boolean
  disabled?: boolean
  containerRef?: RefObject<HTMLElement | null>
}
```

**Codice nuovo:**

```ts
interface UseListNavigationProps {
  itemCount: number
  onEnter?: (index: number) => void
  onMenu?: (index: number) => void
  onDelete?: (index: number) => void
  onEdit?: (index: number) => void
  enabled?: boolean
  disabled?: boolean
  containerRef?: RefObject<HTMLElement | null>
}
```

#### Modifica 2b — Aggiungere `onMenu` ai parametri della funzione

**Righe 13-21. Codice attuale:**

```ts
export function useListNavigation({
  itemCount,
  onEnter,
  onDelete,
  onEdit,
  enabled = true,
  disabled = false,
  containerRef
}: UseListNavigationProps) {
```

**Codice nuovo:**

```ts
export function useListNavigation({
  itemCount,
  onEnter,
  onMenu,
  onDelete,
  onEdit,
  enabled = true,
  disabled = false,
  containerRef
}: UseListNavigationProps) {
```

#### Modifica 2c — Aggiungere `onMenu` al `callbacksRef`

**Riga 24. Codice attuale:**

```ts
  const callbacksRef = useRef({ onEnter, onDelete, onEdit })
```

**Codice nuovo:**

```ts
  const callbacksRef = useRef({ onEnter, onMenu, onDelete, onEdit })
```

#### Modifica 2d — Aggiornare il `useEffect` che sincronizza le callback

**Righe 26-28. Codice attuale:**

```ts
  useEffect(() => {
    callbacksRef.current = { onEnter, onDelete, onEdit }
  })
```

**Codice nuovo:**

```ts
  useEffect(() => {
    callbacksRef.current = { onEnter, onMenu, onDelete, onEdit }
  })
```

#### Modifica 2e — Cambiare Enter/Spazio per chiamare `onMenu` con fallback a `onEnter`

**Righe 54-56. Codice attuale:**

```ts
    } else if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0) {
      e.preventDefault()
      callbacksRef.current.onEnter?.(focusedIndex)
```

**Codice nuovo:**

```ts
    } else if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0) {
      e.preventDefault()
      if (callbacksRef.current.onMenu) {
        callbacksRef.current.onMenu(focusedIndex)
      } else {
        callbacksRef.current.onEnter?.(focusedIndex)
      }
```

**Motivazione del fallback:** DashboardTab passa `onEnter` ma non `onMenu`. Senza fallback, Invio/Spazio smetterebbero di aprire il dialog di modifica dalla lista recenti. Con il fallback, DashboardTab continua a funzionare invariato; TransactionsTab passa `onMenu` e ottiene il nuovo comportamento.

**Gate 2:**
```bash
npx tsc --noEmit
```
Atteso: 0 errori. `onMenu` è opzionale nell'interfaccia; tutti i consumer esistenti compilano senza modifiche.

---

### Passo 3 — `src/components/TransactionActionMenu.tsx` (nuovo file)

**Obiettivo:** creare il componente che incapsula il menu azioni adattivo. Usa `DropdownMenu` su desktop e `Sheet` su mobile. La scelta avviene tramite `useIsMobile()`. Il componente è completamente controllato: `isOpen` e `onOpenChange` arrivano dal parent (`TransactionsTab`).

**File da creare — contenuto completo:**

```tsx
import { useIsMobile } from '@/hooks/use-mobile'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { DotsThreeVertical } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface TransactionActionMenuProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onFocusReturn: () => void
}

export function TransactionActionMenu({
  isOpen,
  onOpenChange,
  onEdit,
  onDelete,
  onFocusReturn,
}: TransactionActionMenuProps) {
  const isMobile = useIsMobile()

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) {
      onFocusReturn()
    }
  }

  const handleDetail = () => {
    onOpenChange(false)
    toast.info('Funzionalità in arrivo')
    onFocusReturn()
  }

  const handleEdit = () => {
    onOpenChange(false)
    onEdit()
  }

  const handleDelete = () => {
    onOpenChange(false)
    onDelete()
  }

  const triggerButton = (
    <Button
      size="icon"
      variant="ghost"
      aria-label="Azioni per il movimento"
      aria-haspopup="menu"
      onClick={(e) => e.stopPropagation()}
    >
      <DotsThreeVertical size={18} aria-hidden="true" />
    </Button>
  )

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Azioni</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col p-4 pt-0 gap-1">
            <SheetClose asChild>
              <button
                role="menuitem"
                className="flex items-center w-full rounded-sm px-3 py-3 text-sm text-left hover:bg-accent focus:bg-accent focus:outline-none"
                onClick={handleDetail}
              >
                Apri dettaglio
              </button>
            </SheetClose>
            <SheetClose asChild>
              <button
                role="menuitem"
                className="flex items-center w-full rounded-sm px-3 py-3 text-sm text-left hover:bg-accent focus:bg-accent focus:outline-none"
                onClick={handleEdit}
              >
                Modifica
              </button>
            </SheetClose>
            <SheetClose asChild>
              <button
                role="menuitem"
                className="flex items-center w-full rounded-sm px-3 py-3 text-sm text-left text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"
                onClick={handleDelete}
              >
                Elimina
              </button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDetail}>
          Apri dettaglio
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>
          Modifica
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          Elimina
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Note critiche:**

1. `SheetTrigger` deve importare `{ SheetTrigger }` da `@/components/ui/sheet`. L'export esiste in `sheet.tsx` riga 138 ma non è mostrato nella riga 12 (`SheetTrigger` non è nella lista degli export). Verificare che sia incluso nell'export di `sheet.tsx` prima di usarlo — se mancante, aggiungerlo alla lista export di `sheet.tsx` come passo 3a separato (vedi §9 rischi).

2. Il `SheetContent` con `side="bottom"` applica `inset-x-0 bottom-0 h-auto border-t` — già full-width per via di `inset-x-0`. Non servono classi `w-full` aggiuntive.

3. Il `SheetContent` interno renderizza `<SheetPrimitive.Title className="sr-only">Pannello</SheetPrimitive.Title>` prima dei `children`. Il `<SheetTitle>Azioni</SheetTitle>` nei children produce un secondo elemento `SheetPrimitive.Title` nel DOM. Radix non si aspetta due Title: usare `<p className="font-semibold text-foreground">Azioni</p>` invece di `<SheetTitle>`, oppure sovrascrivere il testo sr-only con `asChild`. Soluzione adottata nel piano: usare `<SheetTitle>Azioni</SheetTitle>` che sovrascrive l'element con il testo visibile — il sr-only è già gestito dall'overlay del Dialog; avere due Title non causa errori Radix ma può generare un avviso in console. Se si vuole eliminare l'avviso, vedere §9.

**Gate 3:**
```bash
npx tsc --noEmit
```
Atteso: 0 errori.

---

### Passo 4 — `src/components/TransactionsTab.tsx`

**Obiettivo:** (a) ridisegnare il blocco di rendering della riga con layout compatto a 4 colonne; (b) sostituire i pulsanti inline con `TransactionActionMenu`; (c) aggiungere lo stato `openMenuIndex` e la callback `onMenu`; (d) aggiornare il badge hint navigazione.

---

#### Modifica 4a — Aggiornare gli import

**Righe 1-11. Codice attuale:**

```tsx
import { useMemo, useRef, useCallback } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useVisibleData } from '@/context/VisibleDataContext'
import { useListNavigation } from '@/hooks/use-list-navigation'
import { formatCurrency } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TabsContent } from '@/components/ui/tabs'
import { DownloadSimple, Plus, PencilSimple, Trash } from '@phosphor-icons/react'
```

**Codice nuovo:**

```tsx
import { useMemo, useRef, useCallback, useState, useEffect } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useVisibleData } from '@/context/VisibleDataContext'
import { useListNavigation } from '@/hooks/use-list-navigation'
import { formatCurrency, formatDateShort } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TabsContent } from '@/components/ui/tabs'
import { DownloadSimple, Plus } from '@phosphor-icons/react'
import { TransactionActionMenu } from '@/components/TransactionActionMenu'
```

**Motivazioni:** aggiunto `useState` e `useEffect` per `openMenuIndex`; `formatDateShort` per il formato data; rimossi `PencilSimple` e `Trash` non più necessari; aggiunto import di `TransactionActionMenu`.

---

#### Modifica 4b — Aggiungere lo stato `openMenuIndex` e il `useEffect` di focus-return

**Punto di inserimento:** dopo la riga 28 (`const transactionsListContainerRef = useRef<HTMLDivElement>(null)`), prima della riga 30 (`const sortedTransactions = useMemo(...)`).

**Codice da inserire:**

```tsx
  const [openMenuIndex, setOpenMenuIndex] = useState<number>(-1)

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

**Nota:** il `useEffect` con return di cleanup porta il focus sull'item quando `openMenuIndex` cambia da un valore `>= 0` a `-1`. Questo è il meccanismo di fallback; il ritorno del focus avviene già dentro `TransactionActionMenu` tramite `onFocusReturn`. Il `useEffect` copre il caso in cui il menu si chiuda per ragioni esterne (es. ESC gestito da Radix direttamente).

**Alternativa più semplice** (senza useEffect): gestire il focus-return esclusivamente nella callback `onFocusReturn` passata a `TransactionActionMenu`. In quel caso il `useEffect` può essere omesso. La scelta tra le due va presa durante l'implementazione in base a quanto Radix gestisce autonomamente la chiusura.

---

#### Modifica 4c — Aggiungere la callback `onMenuTransactions`

**Righe 35-55. Codice attuale:**

```tsx
  const onEnterTransactions = useCallback((index: number) => {
    const transaction = sortedTransactions[index]
    if (transaction) {
      openEditTransactionDialog(transaction)
    }
  }, [sortedTransactions, openEditTransactionDialog])

  const onDeleteTransactions = useCallback((index: number) => {
    const transaction = sortedTransactions[index]
    if (transaction) {
      setDeletingItem({ type: 'transaction', id: transaction.id })
      setShowDeleteDialog(true)
    }
  }, [sortedTransactions, setDeletingItem, setShowDeleteDialog])

  const onEditTransactions = useCallback((index: number) => {
    const transaction = sortedTransactions[index]
    if (transaction) {
      openEditTransactionDialog(transaction)
    }
  }, [sortedTransactions, openEditTransactionDialog])
```

**Codice nuovo:**

```tsx
  const onMenuTransactions = useCallback((index: number) => {
    setOpenMenuIndex(index)
  }, [])

  const onDeleteTransactions = useCallback((index: number) => {
    const transaction = sortedTransactions[index]
    if (transaction) {
      setDeletingItem({ type: 'transaction', id: transaction.id })
      setShowDeleteDialog(true)
    }
  }, [sortedTransactions, setDeletingItem, setShowDeleteDialog])

  const onEditTransactions = useCallback((index: number) => {
    const transaction = sortedTransactions[index]
    if (transaction) {
      openEditTransactionDialog(transaction)
    }
  }, [sortedTransactions, openEditTransactionDialog])
```

**Motivazione:** `onEnterTransactions` viene rimosso perché Enter/Spazio ora chiama `onMenu`. Il tasto E chiama ancora `onEdit` → `onEditTransactions` → `openEditTransactionDialog` (bypass del menu, scorciatoia diretta). `onMenuTransactions` imposta semplicemente `openMenuIndex` → il `TransactionActionMenu` della riga corrispondente riceve `isOpen={true}`.

---

#### Modifica 4d — Aggiornare il call di `useListNavigation`

**Righe 57-65. Codice attuale:**

```tsx
  const allTransactionsNav = useListNavigation({
    itemCount: sortedTransactions.length,
    enabled: isAuthenticated,
    disabled: showTransactionDialog,
    onEnter: onEnterTransactions,
    onDelete: onDeleteTransactions,
    onEdit: onEditTransactions,
    containerRef: transactionsListContainerRef,
  })
```

**Codice nuovo:**

```tsx
  const allTransactionsNav = useListNavigation({
    itemCount: sortedTransactions.length,
    enabled: isAuthenticated,
    disabled: showTransactionDialog || openMenuIndex >= 0,
    onMenu: onMenuTransactions,
    onDelete: onDeleteTransactions,
    onEdit: onEditTransactions,
    containerRef: transactionsListContainerRef,
  })
```

**Motivazione:** `onEnter` viene rimosso (non passato). `onMenu` viene passato al posto di `onEnter`. `disabled` ora include `openMenuIndex >= 0` per bloccare la navigazione frecce mentre il menu è aperto.

---

#### Modifica 4e — Aggiornare il badge hint navigazione

**Righe 96-100. Codice attuale:**

```tsx
      {visibleTransactions.length > 0 && (
        <Badge variant="secondary" className="text-xs" role="note" aria-label="Istruzioni navigazione: freccia su e freccia giù per navigare, Enter o E per modificare, Canc per eliminare, Home e End per primo e ultimo">
          ↑/↓ Naviga · Enter Modifica · E Modifica · Del Elimina · Home/End Primo/Ultimo
        </Badge>
      )}
```

**Codice nuovo:**

```tsx
      {visibleTransactions.length > 0 && (
        <Badge variant="secondary" className="text-xs" role="note" aria-label="Istruzioni navigazione: freccia su e freccia giù per navigare, Enter o Spazio per aprire il menu azioni, E per modifica diretta, Canc per eliminare, Home e End per primo e ultimo">
          ↑/↓ Naviga · Enter Menu · E Modifica · Del Elimina · Home/End Primo/Ultimo
        </Badge>
      )}
```

---

#### Modifica 4f — Ridisegnare il blocco di rendering della riga

**Righe 133-209. Codice attuale (intero blocco `return` del `map`):**

```tsx
                return (
                  <div
                    key={transaction.id}
                    className={`p-4 flex items-center justify-between transition-all focus:outline-none ${
                      isFocused
                        ? 'bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => allTransactionsNav.setFocusedIndex(index)}
                    data-focus-info={`Movimento: ${transaction.descrizione || category?.nome} - ${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'} ${formatCurrency(transaction.importo)} - Premi Enter per modificare`}
                    tabIndex={isFocused ? 0 : -1}
                    role="button"
                    data-list-item
                    data-index={index}
                    aria-label={`${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'}: ${transaction.descrizione || category?.nome || 'Movimento'}, ${formatCurrency(transaction.importo)}, ${new Date(transaction.data).toLocaleDateString('it-IT')}, ${account?.nome || ''}${isTransfer && destAccount ? ` → ${destAccount.nome}` : ''}${category && !isTransfer ? `, ${category.nome}` : ''}`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {transaction.descrizione || category?.nome || 'Movimento'}
                        </p>
                        {transaction.ricorrente && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.frequenzaRicorrenza}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <span>{new Date(transaction.data).toLocaleDateString('it-IT')}</span>
                        <span>•</span>
                        <span>{account?.nome}</span>
                        {isTransfer && destAccount && (
                          <>
                            <span>→</span>
                            <span>{destAccount.nome}</span>
                          </>
                        )}
                        {category && (
                          <>
                            <span>•</span>
                            <span>{category.nome}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`text-lg font-mono font-semibold ${isIncome ? 'text-income' : isTransfer ? 'text-accent' : 'text-expense'}`}>
                        {isIncome ? '+' : isTransfer ? '→' : '-'}{formatCurrency(transaction.importo)}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditTransactionDialog(transaction)
                          }}
                          aria-label="Modifica movimento"
                        >
                          <PencilSimple size={18} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingItem({ type: 'transaction', id: transaction.id })
                            setShowDeleteDialog(true)
                          }}
                          aria-label="Elimina movimento"
                        >
                          <Trash size={18} />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
```

**Codice nuovo:**

```tsx
                const rawDesc = transaction.descrizione || category?.nome || 'Movimento'
                const shortDesc = rawDesc.length > 30 ? rawDesc.slice(0, 30) + '…' : rawDesc
                const shortAccount = isTransfer
                  ? 'Trasferimento'
                  : (account?.nome ?? '').length > 15
                    ? (account?.nome ?? '').slice(0, 15) + '…'
                    : (account?.nome ?? '')

                return (
                  <div
                    key={transaction.id}
                    className={`px-4 py-3 flex items-center gap-3 transition-all focus:outline-none ${
                      isFocused
                        ? 'bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => allTransactionsNav.setFocusedIndex(index)}
                    data-focus-info={`Movimento: ${rawDesc} - ${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'} ${formatCurrency(transaction.importo)} - Premi Enter per il menu azioni`}
                    tabIndex={isFocused ? 0 : -1}
                    role="button"
                    data-list-item
                    data-index={index}
                    aria-label={`${isIncome ? 'Entrata' : isTransfer ? 'Trasferimento' : 'Uscita'}: ${rawDesc}, ${formatCurrency(transaction.importo)}, ${formatDateShort(transaction.data)}, ${isTransfer ? 'Trasferimento' : account?.nome || ''}`}
                  >
                    <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDateShort(transaction.data)}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm">
                      {shortDesc}
                    </span>
                    <span className={`shrink-0 text-sm font-mono font-semibold ${isIncome ? 'text-income' : isTransfer ? 'text-accent' : 'text-expense'}`}>
                      {isIncome ? '+' : isTransfer ? '→' : '-'}{formatCurrency(transaction.importo)}
                    </span>
                    <span className="w-24 shrink-0 truncate text-xs text-muted-foreground text-right">
                      {shortAccount}
                    </span>
                    <TransactionActionMenu
                      isOpen={openMenuIndex === index}
                      onOpenChange={(open) => setOpenMenuIndex(open ? index : -1)}
                      onEdit={() => openEditTransactionDialog(transaction)}
                      onDelete={() => {
                        setDeletingItem({ type: 'transaction', id: transaction.id })
                        setShowDeleteDialog(true)
                      }}
                      onFocusReturn={() => {
                        const el = transactionsListContainerRef.current?.querySelector<HTMLElement>(
                          `[data-list-item][data-index="${index}"]`
                        )
                        el?.focus()
                      }}
                    />
                  </div>
                )
```

**Note sul layout:**
- `w-16` per la data (≈ 64px, sufficiente per `07/05/26`)
- `flex-1 min-w-0 truncate` per la descrizione: `truncate` usa `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — il troncamento CSS elimina la necessità di calcolare manualmente `shortDesc` per il rendering, ma `shortDesc` viene comunque calcolato per garantire il troncamento anche nell'`aria-label` e nel `data-focus-info`
- `w-24` per il conto (≈ 96px per 15 caratteri in text-xs)
- L'`…` nel calcolo di `shortDesc` usa il carattere `…` (U+2026) invece di tre punti separati `...`
- `py-3` invece di `p-4` per ridurre l'altezza della riga e renderla uniforme

**Gate 4:**
```bash
npx tsc --noEmit
npm run build
```
Atteso: 0 errori.

---

## §6 — Ordine di esecuzione

| Passo | File | Dipende da |
|---|---|---|
| Passo 1 | `helpers.ts` — aggiunta `formatDateShort` | — indipendente |
| Passo 2 | `use-list-navigation.ts` — aggiunta `onMenu` | — indipendente |
| Passo 3 | `TransactionActionMenu.tsx` — nuovo file | Passo 1 (no), Passo 2 (no) — indipendente |
| Passo 4 | `TransactionsTab.tsx` — tutte le modifiche | Passo 1 (`formatDateShort`), Passo 2 (prop `onMenu`), Passo 3 (import `TransactionActionMenu`) |

I Passi 1, 2, 3 sono mutuamente indipendenti. Il Passo 4 deve seguire tutti e tre.

---

## §7 — Test di verifica

Eseguire manualmente dopo aver completato tutti i passi.

### Riga compatta (Modifica 1)

| # | Scenario | Esito atteso |
|---|---|---|
| T1 | Aprire il tab Movimenti con almeno 3 movimenti | Ogni riga mostra esattamente 4 colonne: data · descrizione · importo · conto. Altezza uniforme. |
| T2 | Movimento con descrizione di 35 caratteri | Descrizione troncata a 30 + `…` nella riga; `aria-label` contiene la descrizione completa |
| T3 | Movimento con descrizione di 25 caratteri | Nessun troncamento, nessun `…` |
| T4 | Movimento entrata | Importo con `+` in verde (`text-income`) |
| T5 | Movimento uscita | Importo con `-` in rosso (`text-expense`) |
| T6 | Trasferimento | Importo con `→` in colore `text-accent`; colonna conto mostra "Trasferimento" |
| T7 | Movimento con data 7 maggio 2026 | Data visualizzata come `07/05/26` |
| T8 | Movimento con nome conto di 20 caratteri | Nome conto troncato a 15 + `…` |
| T9 | Viewport 320px di larghezza | Le 4 colonne rimangono visibili senza sovrapposizioni (verificare con DevTools) |
| T10 | Con NVDA attivo, navigare sulla lista | NVDA legge `aria-label` della riga: tipo, descrizione completa, importo, data, conto |

### Menu azioni (Modifica 2)

| # | Scenario | Esito atteso |
|---|---|---|
| T11 | Tab sulla lista, ↓ su un item, premere Invio | Il menu azioni si apre (DropdownMenu su desktop, Sheet su mobile); la lista non si sposta |
| T12 | Menu aperto, premere Esc | Menu si chiude; focus torna sulla riga da cui era stato aperto |
| T13 | Menu aperto, cliccare fuori | Menu si chiude; focus torna sulla riga |
| T14 | Menu aperto, ↓ per navigare voci, Invio su "Modifica" | Dialog "Modifica Movimento" si apre con i dati corretti |
| T15 | Menu aperto, ↓ per navigare voci, Invio su "Elimina" | Dialog di conferma eliminazione si apre |
| T16 | Menu aperto, Invio su "Apri dettaglio" | Toast `info` con "Funzionalità in arrivo"; menu si chiude; focus torna sulla riga |
| T17 | Tab sulla lista, ↓ su item, premere E | Dialog "Modifica Movimento" si apre **direttamente**, senza passare dal menu |
| T18 | Tab sulla lista, ↓ su item, premere Canc | Dialog di conferma eliminazione si apre direttamente, senza passare dal menu |
| T19 | Menu aperto, premere ↑/↓ della lista | Le frecce NON spostano la selezione della lista; navigano solo le voci del menu |
| T20 | Cliccare il trigger `⋮` con il mouse (desktop) | Il DropdownMenu si apre vicino alla riga |
| T21 | Tap sul trigger `⋮` su mobile (o DevTools mobile view) | Lo Sheet si apre dal basso a larghezza piena |
| T22 | Con NVDA attivo, navigare sulla lista, premere Invio | NVDA annuncia il menu; le voci del menu sono annunciate come `menuitem` |
| T23 | Con NVDA attivo, premere E su un item | NVDA non intercetta il tasto E in application mode (role="button"); il dialog si apre. Se intercettato, il tasto E non ha effetto (accettabile — see §9) |
| T24 | Aprire il menu su item N, chiudere, poi aprire su item M | Due menu non si aprono mai contemporaneamente; `openMenuIndex` è uno scalare |

### Regressioni

| # | Scenario | Esito atteso |
|---|---|---|
| T25 | DashboardTab: Invio su item lista recenti | Dialog "Modifica Movimento" si apre direttamente (fallback `onEnter` nell'hook) |
| T26 | DashboardTab: E su item lista recenti | Dialog "Modifica Movimento" si apre |
| T27 | Ctrl+N apre il dialog "Nuovo Movimento" | Nessuna regressione sulle scorciatoie globali |
| T28 | Ctrl+E esporta CSV | Nessuna regressione |
| T29 | Con dialog di modifica aperto, premere Invio/E/Canc | La lista non reagisce (`disabled: showTransactionDialog`) |

---

## §8 — File da non toccare

| File | Motivo |
|---|---|
| `src/components/DashboardTab.tsx` | Usa `useListNavigation` con `onEnter`; il fallback nell'hook preserva il comportamento corrente senza modifiche |
| `src/components/ui/dropdown-menu.tsx` | Già completo; nessuna modifica necessaria |
| `src/components/ui/sheet.tsx` | Già completo salvo eventuale aggiunta di `SheetTrigger` all'export (vedi §9) |
| `src/context/AppDataContext.tsx` | Non coinvolto |
| `src/components/DialogsOverlay.tsx` | Non coinvolto |
| `src/components/TransactionDialog.tsx` | Non coinvolto |
| `src/hooks/use-app-shortcuts.ts` | Non coinvolto |
| `src/lib/types.ts` | Nessuna modifica ai tipi necessaria |
| Qualunque file sotto `.github/` | Protetto dal framework guard |

---

## §9 — Rischi e attenzioni

| Rischio | Mitigazione |
|---|---|
| **`SheetTrigger` non incluso nell'export di `sheet.tsx`.** Il file export (riga 138) include `Sheet, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription` — **non** `SheetTrigger`, che però è definito alle righe 12-16. | Prima di compilare, verificare che `SheetTrigger` sia incluso nell'export. Se mancante, aggiungere `SheetTrigger,` alla lista export di `sheet.tsx`. Questa è l'unica modifica consentita a quel file. |
| **Tasto E intercettato da NVDA in browse mode.** Quando NVDA è in browse mode, E sposta la lettura al prossimo elemento `<E>dit` o simile. Se gli item della lista ricadono in browse mode, E non arriva alla pagina. | Gli item hanno `role="button"`, che forza NVDA in application mode. In application mode, E passa alla pagina. Se per qualunque motivo NVDA rimane in browse mode (es. utente che forza la modalità), E non funziona — comportamento accettabile: il menu (Invio/Spazio) rimane il percorso primario. Non è necessario rimuovere E dalla logica dell'hook; va documentato nel hint testuale. |
| **Due `SheetPrimitive.Title` nel DOM** quando si usa `<SheetTitle>Azioni</SheetTitle>` nei children di `SheetContent` (che già ne renderizza uno `sr-only`). | In produzione non causa errori funzionali. Radix non lancia eccezioni. Se l'avviso in console è inaccettabile: sostituire `<SheetTitle>Azioni</SheetTitle>` con `<p className="font-semibold text-foreground text-sm">Azioni</p>`. Il titolo sr-only "Pannello" già presente garantisce l'accessibilità. |
| **`openMenuIndex` e `showTransactionDialog` entrambi attivi contemporaneamente.** Se l'utente apre il menu e poi triggera un dialog con una shortcut globale, `openMenuIndex >= 0` è ancora true ma il menu si chiude per perdita di focus. La lista è `disabled` per `showTransactionDialog`, non per `openMenuIndex`. | Al chiudersi del menu (onOpenChange false), `setOpenMenuIndex(-1)` viene chiamato. L'apertura del dialog chiude il menu tramite perdita di focus (comportamento nativo Radix). Il reset di `openMenuIndex` avviene comunque via `onOpenChange`. Nessuna azione aggiuntiva richiesta. |
| **`onFocusReturn` chiama `el?.focus()` direttamente.** Se `transactionsListContainerRef` è null o l'item è stato rimosso dal DOM (es. delete che aggiorna la lista), `el` è null e `?.focus()` è no-op. | L'operatore opzionale `?.` gestisce il null silenziosamente. L'item rimosso non necessita di focus-return. Nessun problema. |
| **Comportamento `disabled: openMenuIndex >= 0` nel hook.** Quando il menu è aperto, le frecce della lista sono disabilitate. L'utente che usa frecce per navigare le voci del menu usa le frecce Radix interne al menu, non quelle della lista. | Radix `DropdownMenu` gestisce la navigazione interna con le sue frecce indipendentemente. Il `disabled` della lista impedisce solo che le frecce spostino il `focusedIndex` della lista, non che le frecce funzionino dentro il menu. |

---

## §10 — Gate finale P40

```bash
npx tsc --noEmit
npm run build
```

Entrambi devono restituire exit 0 senza errori.

Verifiche manuali obbligatorie: T1–T29 della sezione §7 devono passare tutti.

```bash
git diff --name-only HEAD | grep ".github"
```

Output atteso: vuoto. Nessun file sotto `.github/` deve essere modificato.

```bash
git diff --name-only HEAD
```

Output atteso (esattamente questi file, nessun altro):
```
src/lib/helpers.ts
src/hooks/use-list-navigation.ts
src/components/TransactionActionMenu.tsx
src/components/TransactionsTab.tsx
```

E opzionalmente, solo se `SheetTrigger` mancava dall'export:
```
src/components/ui/sheet.tsx
```
