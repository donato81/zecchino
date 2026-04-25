# P20 — Todo List: Lint Cleanup — azzeramento dei 56 warning ESLint

> Passo 20 — Lint Cleanup: 56 warning → 0  
> Piano di riferimento: `docs/2 - coding plans/P20-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P20-lint-cleanup-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: —  
> Data completamento: —

---

## Esito finale

- [ ] `npm run lint` → 0 problems (0 errors, 0 warnings)
- [ ] `npm run build` → exit 0
- [ ] `npm run test:run` → 5 passed, exit 0
- [ ] Nessun file `src/components/ui/**` modificato
- [ ] Nessun file `.github/**` modificato

---

## Prima di iniziare

- [ ] Verificare baseline: `npm run lint` → `56 problems (0 errors, 56 warnings)`
- [ ] Verificare test: `npm run test:run` → `5 passed`
- [ ] Leggere il coding plan completo `docs/2 - coding plans/P20-coding-plan.md`

---

## E — eslint.config.js [10 warning]

- [ ] **E.1** `eslint.config.js` — aggiungere Layer 6 con `'react-refresh/only-export-components': 'off'` per `src/components/ui/**/*.{ts,tsx}` e `src/context/**/*.{ts,tsx}`
- [ ] **Verifica E** `npm run lint` → ~46 warning (calo di ~10)

---

## A — Import e variabili inutilizzate [~29 warning]

### Librerie (dal più semplice)

- [ ] **A.1** `src/lib/helpers.ts` riga 1 — rimuovere `Category` dall'import `./types`
- [ ] **A.2a** `src/lib/budget-history.ts` riga 2 — rimuovere l'intera riga `import { getBudgetPeriodDates } from './helpers'`
- [ ] **A.2b** `src/lib/budget-history.ts` riga ~51 — rimuovere `const currentEnd = new Date(budget.dataFine)`
- [ ] **A.3a** `src/lib/budget-forecasting.ts` in `getCurrentPeriodSpending` — rimuovere `const endDate = new Date(budget.dataFine)`
- [ ] **A.3b** `src/lib/budget-forecasting.ts` in `calculateBudgetForecast` — rimuovere `const trendData = calculateBudgetTrend(...)`
- [ ] **A.4** `src/lib/screen-reader.ts` riga ~84 — rinominare `currency` → `_currency` nella firma di `announceBalance`

### Componenti semplici (import singolo da rimuovere)

- [ ] **A.5** `src/components/BudgetDialog.tsx` riga 11 — rimuovere `CardContent` dall'import `@/components/ui/card`
- [ ] **A.6** `src/components/BudgetForecastCard.tsx` riga 7 — rimuovere l'intera riga `import { Progress } from '@/components/ui/progress'`
- [ ] **A.7** `src/components/PeriodSelector.tsx` riga 2 — rimuovere l'intera riga `import { Badge } from '@/components/ui/badge'`
- [ ] **A.8** `src/components/MonthlyComparisonChart.tsx` — rimuovere `Badge` dall'import

### Componenti multi-fix

- [ ] **A.9a** `src/components/IncomeExpenseChart.tsx` riga 2 — rimuovere `LineChart` e `Line` dall'import recharts
- [ ] **A.9b** `src/components/IncomeExpenseChart.tsx` riga 23 — `let startDate` → `const startDate`
- [ ] **A.10a** `src/components/TransactionsTab.tsx` riga 5 — rimuovere `import { useIsMobile } from '@/hooks/use-mobile'`
- [ ] **A.10b** `src/components/TransactionsTab.tsx` riga 28 — rimuovere `const isMobile = useIsMobile()`
- [ ] **A.11** `src/components/DisplaySettings.tsx` — 9 occorrenze `(checked)` → `(_checked)` in tutti gli handler `onCheckedChange` che chiamano `handleToggle`
- [ ] **A.12** `src/components/AccountDialog.tsx` riga 10 — rimuovere `CardHeader` e `CardTitle` dall'import `@/components/ui/card`
- [ ] **A.13a** `src/components/CategoryManagement.tsx` riga 15 — eseguire `npm run lint src/components/CategoryManagement.tsx`, identificare tutti gli import inutilizzati
- [ ] **A.13b** `src/components/CategoryManagement.tsx` — rimuovere `X` dall'import Phosphor (+ eventuali altri confermati dal lint)
- [ ] **A.14** `src/components/SecuritySettings.tsx` riga 133 — `catch (err)` → `catch (_err)`
- [ ] **A.15a** `src/components/DataManagement.tsx` riga 52 — `catch (error)` → `catch (_error)` in `handleExportData`
- [ ] **A.15b** `src/components/DataManagement.tsx` riga 95 — `catch (error)` → `catch (_error)` in `handleImportData`

- [ ] **Verifica A** `npm run lint` → ~10 warning
- [ ] **Verifica A** `npm run build` → exit 0

---

## B — Sostituzione `any` [7 warning]

- [ ] **B.1** `src/lib/sound-system.ts` riga ~131 — aggiungere interfaccia `ExtendedWindow extends Window`, sostituire `(window as any).webkitAudioContext` con cast tipizzato
- [ ] **B.2** `src/components/DataManagement.tsx` riga 32 — `Record<string, any>` → `Record<string, unknown>`
- [ ] **B.3a** `src/components/SavingsGoalCard.tsx` — aggiungere `import type { ComponentType } from 'react'` in cima al file
- [ ] **B.3b** `src/components/SavingsGoalCard.tsx` riga 30 — `Record<string, any>` → `Record<string, ComponentType<{ size?: number; weight?: string; className?: string }>>`
- [ ] **B.4a** `src/components/TalkBackSettings.tsx` riga 7 — aggiungere `type TalkBackAdaptations` all'import di `@/hooks/use-talkback`
- [ ] **B.4b** `src/components/TalkBackSettings.tsx` — cambiare tipo parametro `key: string` → `key: keyof TalkBackAdaptations` in `handleAdaptationChange`; rimuovere `as any`
- [ ] **B.5a** `src/components/IncomeExpenseChart.tsx` — aggiungere interfaccia locale `RechartsTooltipProps` prima di `CustomTooltip`
- [ ] **B.5b** `src/components/IncomeExpenseChart.tsx` riga ~137 — `({ active, payload }: any)` → `({ active, payload }: RechartsTooltipProps)`
- [ ] **B.6a** `src/components/MonthlyComparisonChart.tsx` — aggiungere interfaccia locale `RechartsTooltipProps` prima di `CustomTooltip`
- [ ] **B.6b** `src/components/MonthlyComparisonChart.tsx` riga ~101 — `({ active, payload }: any)` → `({ active, payload }: RechartsTooltipProps)`
- [ ] **B.7a** `src/components/DashboardTab.tsx` — verificare se `ComponentProps` da `'react'` è già importato; se no, aggiungere `import type { ComponentProps } from 'react'`
- [ ] **B.7b** `src/components/DashboardTab.tsx` riga ~246 — `category.id as any` → `category.id as ComponentProps<typeof TooltipContent>['variant']`

- [ ] **Verifica B** `npm run lint` → ~7 warning (solo D + C)
- [ ] **Verifica B** `npm run build` → exit 0

---

## D — Accessibilità [7 warning]

- [ ] **D.1** `src/components/AppHeader.tsx` riga 69 — rimuovere **solo** `tabIndex={0}` dal `<div role="status">`; lasciare invariati `role`, `aria-live`, `aria-atomic`, `aria-label`
- [ ] **D.2** `src/components/DataManagement.tsx` riga ~162 — aggiungere `aria-label="Seleziona file di backup JSON da importare"` all'`<input type="file">`
- [ ] **D.3a** `src/components/PinDialog.tsx` — aggiungere `useRef` all'import React
- [ ] **D.3b** `src/components/PinDialog.tsx` — aggiungere `const pinInputRef = useRef<HTMLInputElement>(null)`
- [ ] **D.3c** `src/components/PinDialog.tsx` — integrare `setTimeout(() => pinInputRef.current?.focus(), 100)` nel `useEffect` su `[open]`; aggiungere cleanup `clearTimeout`
- [ ] **D.3d** `src/components/PinDialog.tsx` riga ~91 — rimuovere `autoFocus`; aggiungere `ref={pinInputRef}` all'Input
- [ ] **D.4a** `src/components/AccountDialog.tsx` — aggiungere `useRef` all'import React
- [ ] **D.4b** `src/components/AccountDialog.tsx` — aggiungere `const nameInputRef = useRef<HTMLInputElement>(null)`
- [ ] **D.4c** `src/components/AccountDialog.tsx` — integrare `setTimeout(() => nameInputRef.current?.focus(), 100)` nel `useEffect` su `[open]`; aggiungere cleanup
- [ ] **D.4d** `src/components/AccountDialog.tsx` riga ~107 — rimuovere `autoFocus`; aggiungere `ref={nameInputRef}` all'Input
- [ ] **D.5a** `src/components/CategoryManagement.tsx` — verificare/aggiungere `useEffect` e `useRef` all'import React (riga 1: `import { useState } from 'react'`)
- [ ] **D.5b** `src/components/CategoryManagement.tsx` — aggiungere `const categoryNameRef = useRef<HTMLInputElement>(null)` nel corpo del componente
- [ ] **D.5c** `src/components/CategoryManagement.tsx` — aggiungere `useEffect` su `[showCategoryDialog]` con `setTimeout(() => categoryNameRef.current?.focus(), 100)` e cleanup
- [ ] **D.5d** `src/components/CategoryManagement.tsx` riga 367 — rimuovere `autoFocus`; aggiungere `ref={categoryNameRef}` all'Input
- [ ] **D.6a** `src/components/SecuritySettings.tsx` — verificare/aggiungere `useEffect` e `useRef` all'import React
- [ ] **D.6b** `src/components/SecuritySettings.tsx` — aggiungere `const currentPinRef = useRef<HTMLInputElement>(null)`
- [ ] **D.6c** `src/components/SecuritySettings.tsx` — aggiungere `useEffect` su `[showPinDialog]` con `setTimeout(() => currentPinRef.current?.focus(), 100)` e cleanup
- [ ] **D.6d** `src/components/SecuritySettings.tsx` riga 300 — rimuovere `autoFocus`; aggiungere `ref={currentPinRef}` all'Input
- [ ] **D.7** Rimandato a C.3 (integrato — la modifica di `TransactionDialog.tsx` copre sia D.7 sia C.3)

- [ ] **Verifica D** `npm run lint` → 3 warning (solo Famiglia C)
- [ ] **Verifica D** `npm run build` → exit 0

---

## C — Dipendenze degli effetti [3 warning] ⚠️ Rischio più alto

> Aprire la console del browser prima di ogni step. Un ciclo di render si manifesta con log ripetuti e CPU al massimo. Rollback: `git checkout -- <file>`.

- [ ] **C.1** `src/hooks/use-app-shortcuts.ts` — aggiungere `isAuthenticated` come prima voce nell'array di deps del `useMemo` per `shortcuts` (~riga 219)
- [ ] **Verifica C.1** `npm run lint` → 2 warning rimasti
- [ ] **Gate C.1** `npm run test:run` → 5 passed, exit 0

- [ ] **C.2** `src/context/AuthContext.tsx` — aggiungere **solo** 3 righe di commento sopra il `useEffect` di inizializzazione (~riga 51): `// eslint-disable-next-line react-hooks/exhaustive-deps`, la spiegazione sul perché `[]` è intenzionale, e la conseguenza dell'aggiunta di `globalPinHash`
- [ ] **Verifica C.2** `npm run lint` → 1 warning rimasto (solo TransactionDialog)
- [ ] **Gate C.2** `npm run test:run` → 5 passed, exit 0

- [ ] **C.3a** `src/components/TransactionDialog.tsx` — aggiungere `useCallback` e `useRef` all'import React
- [ ] **C.3b** `src/components/TransactionDialog.tsx` — aggiungere `const amountInputRef = useRef<HTMLInputElement>(null)`
- [ ] **C.3c** `src/components/TransactionDialog.tsx` — avvolgere `resetForm` in `useCallback` con dipendenze `[accounts, categories]`
- [ ] **C.3d** `src/components/TransactionDialog.tsx` — aggiornare il primo `useEffect`: aggiungere `resetForm` ai deps; nel ramo `if (!transaction)` aggiungere `setTimeout(() => amountInputRef.current?.focus(), 100)` e cleanup
- [ ] **C.3e** `src/components/TransactionDialog.tsx` riga ~254 — rimuovere `autoFocus={!transaction}`; aggiungere `ref={amountInputRef}` all'Input
- [ ] **Verifica C.3** `npm run lint` → **0 warning, 0 errori** ✓
- [ ] **Gate C.3** `npm run test:run` → 5 passed, exit 0 ✓

---

## Verifica finale

### Gate lint e build

- [ ] `npm run lint` → `0 problems (0 errors, 0 warnings)`
- [ ] `npm run build` → exit 0, 0 errori TypeScript

### Gate test

- [ ] `npm run test:run` → 5 passed, exit 0
- [ ] Test in ordine inverso → 5 passed, exit 0

### Gate funzionale (verifica manuale in browser)

- [ ] Avvio app → dialog PIN di autenticazione/setup visibile
- [ ] Login con PIN → Dashboard visibile e funzionante
- [ ] Dialog "Nuovo Conto" → focus su campo "Nome del Conto" entro 100ms dall'apertura
- [ ] Dialog "Nuovo Movimento" → focus su campo "Importo" entro 100ms dall'apertura
- [ ] Dialog "Modifica Movimento" → nessun focus automatico aggiuntivo
- [ ] Dialog "Nuova Categoria" → focus su campo "Nome Categoria" entro 100ms dall'apertura
- [ ] Dialog "Cambio PIN" (SecuritySettings) → focus su campo "PIN Attuale" entro 100ms
- [ ] Dialog "Inserisci PIN" (PinDialog) → focus su campo PIN entro 100ms

### Gate perimetro

- [ ] Nessun file `src/components/ui/**` modificato
- [ ] Nessun file `.github/**` modificato
- [ ] Nessun file `src/test/**` modificato

---

## Checklist gate finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| `npm run lint` | 0 problems | — | ☐ |
| `npm run build` | exit 0 | — | ☐ |
| `npm run test:run` | 5 passed, exit 0 | — | ☐ |
| Test in ordine inverso | 5 passed | — | ☐ |
| Focus su "Nome del Conto" all'apertura dialog | sì | — | ☐ |
| Focus su "Importo" all'apertura dialog nuovo mov. | sì | — | ☐ |
| Focus su "Nome Categoria" all'apertura dialog | sì | — | ☐ |
| Focus su "PIN Attuale" all'apertura dialog cambio PIN | sì | — | ☐ |
| Nessun file `ui/**` modificato | 0 file | — | ☐ |
| Nessun file `.github/**` modificato | 0 file | — | ☐ |

---

**Inizio lavori: —**  
**Completato il: —**  
**Baseline → Goal: 56 warning → 0 warning**
