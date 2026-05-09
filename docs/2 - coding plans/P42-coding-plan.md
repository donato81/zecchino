# P42 — Coding Plan: Cleanup pre-migrazione React Native

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P42 — React Native Migration Cleanup
> Report di riferimento: `docs/4 - reports/report-analisi-migrazione-react-native.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-09

---

## §1 — Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P42 — React Native Migration Cleanup |
| **Tipo intervento** | Cleanup / Rimozione |
| **Branch** | `refactoring-architettura` |
| **Data** | 2026-05-09 |
| **File eliminati** | 46 (ui/) + 36 (components/) + 4 (hooks) + 7 (root) + 1 (lib/utils.ts) + 9 (test/) = **103 file** |
| **Dipendenze rimosse** | 40 pacchetti npm (27 @radix-ui + 11 librerie web + 2 devDep testing) |
| **File sorgente modificati** | **nessuno** — solo eliminazioni |
| **Report di riferimento** | [report-analisi-migrazione-react-native.md](../4%20-%20reports/report-analisi-migrazione-react-native.md) |

---

## §2 — Obiettivo

Rimuovere tutti i file classificati **ELIMINA** nel report di analisi migrazione React Native, e le relative dipendenze npm, preparando il repository per l'avvio della migrazione verso React Native for Windows.

Al termine di P42:
- In `src/` rimangono solo file **TIENI** (portabili senza modifiche) e **VALUTA** (portabili con refactoring, da lavorare in P43+).
- I 40 pacchetti npm incompatibili con React Native sono rimossi da `package.json` e `node_modules`.
- Il repository è in uno stato deliberatamente non compilabile: `npx tsc --noEmit` produrrà errori sui file VALUTA che importavano i file ELIMINA. Questo è **atteso e documentato** (vedi §3).

Questo agente crea **solo documentazione**. Nessun file sorgente viene modificato né eliminato da Agent-Plan.

---

## §3 — Premessa: stato tsc atteso post-P42

La rimozione dei file ELIMINA renderà i file VALUTA incapaci di compilare, perché questi importano componenti ui/, hooks ELIMINA e lib/utils.ts. Questo è un errore strutturale atteso, non una regressione.

**Regola gate per ogni intervento:**
> Eseguire `npx tsc --noEmit`. I nuovi errori su file VALUTA (`src/context/`, `src/App.tsx`, `src/hooks/` VALUTA) sono ATTESI. Il gate è superato se **nessun file TIENI** (`src/lib/`, `src/lib/supabase/`) compare nell'output degli errori.

**File TIENI che non devono mai apparire negli errori:**

| File |
|---|
| `src/lib/types.ts` |
| `src/lib/budget-history.ts` |
| `src/lib/budget-forecasting.ts` |
| `src/lib/supabase/types.ts` |
| `src/lib/supabase/client.ts` *(VALUTA — non deve comparire per errori da ELIMINA)* |
| `src/lib/supabase/repositories/conti.ts` |
| `src/lib/supabase/repositories/transazioni.ts` |
| `src/lib/supabase/repositories/categorie.ts` |
| `src/lib/supabase/repositories/budget.ts` |
| `src/lib/supabase/repositories/obiettivi-risparmio.ts` |
| `src/lib/supabase/repositories/impostazioni-utente.ts` |

---

## §4 — Ordine degli interventi

> **Regola critica:** la rimozione dei file deve precedere la rimozione delle dipendenze npm. Se si rimuovono prima i pacchetti, TypeScript fallirà anche sui file che stiamo per eliminare, generando rumore diagnostico non gestibile.

| # | Intervento | File/Pacchetti | Tipo |
|---|---|---|---|
| 1 | Rimozione `src/components/ui/` | 46 file `.tsx` | Elimina directory |
| 2 | Rimozione `src/components/` | 36 file `.tsx` | Elimina file (mantieni dir `ui/` già svuotata) |
| 3 | Rimozione hook ELIMINA `src/hooks/` | 4 file `.ts` | Elimina file selettivi |
| 4 | Rimozione file radice `src/` | 7 file | Elimina file selettivi |
| 5 | Rimozione `src/lib/utils.ts` | 1 file `.ts` | Elimina file |
| 6 | Rimozione `src/test/` | 9 file | Elimina directory |
| 7 | Rimozione dipendenze npm | 40 pacchetti | `npm uninstall` |

---

## §5 — Intervento 1: `src/components/ui/` (46 file)

### Elenco completo file da eliminare

| # | File | Dipendenze principali |
|---|---|---|
| 1 | `src/components/ui/accordion.tsx` | `@radix-ui/react-accordion`, `lucide-react` |
| 2 | `src/components/ui/alert-dialog.tsx` | `@radix-ui/react-alert-dialog` |
| 3 | `src/components/ui/alert.tsx` | `class-variance-authority` |
| 4 | `src/components/ui/aspect-ratio.tsx` | `@radix-ui/react-aspect-ratio` |
| 5 | `src/components/ui/avatar.tsx` | `@radix-ui/react-avatar` |
| 6 | `src/components/ui/badge.tsx` | `class-variance-authority` |
| 7 | `src/components/ui/breadcrumb.tsx` | `lucide-react` |
| 8 | `src/components/ui/button.tsx` | `@radix-ui/react-slot`, `class-variance-authority` |
| 9 | `src/components/ui/calendar.tsx` | `react-day-picker`, `lucide-react` |
| 10 | `src/components/ui/card.tsx` | nessuna (solo Tailwind) |
| 11 | `src/components/ui/carousel.tsx` | `embla-carousel-react`, `lucide-react` |
| 12 | `src/components/ui/chart.tsx` | `recharts` |
| 13 | `src/components/ui/checkbox.tsx` | `@radix-ui/react-checkbox`, `lucide-react` |
| 14 | `src/components/ui/collapsible.tsx` | `@radix-ui/react-collapsible` |
| 15 | `src/components/ui/command.tsx` | `cmdk`, `lucide-react` |
| 16 | `src/components/ui/context-menu.tsx` | `@radix-ui/react-context-menu`, `lucide-react` |
| 17 | `src/components/ui/dialog.tsx` | `@radix-ui/react-dialog`, `lucide-react` |
| 18 | `src/components/ui/drawer.tsx` | `vaul` |
| 19 | `src/components/ui/dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu`, `lucide-react` |
| 20 | `src/components/ui/form.tsx` | `react-hook-form`, `@radix-ui/react-label` |
| 21 | `src/components/ui/hover-card.tsx` | `@radix-ui/react-hover-card` |
| 22 | `src/components/ui/input-otp.tsx` | `input-otp` |
| 23 | `src/components/ui/input.tsx` | nessuna (solo Tailwind) |
| 24 | `src/components/ui/label.tsx` | `@radix-ui/react-label`, `class-variance-authority` |
| 25 | `src/components/ui/menubar.tsx` | `@radix-ui/react-menubar`, `lucide-react` |
| 26 | `src/components/ui/navigation-menu.tsx` | `@radix-ui/react-navigation-menu`, `lucide-react` |
| 27 | `src/components/ui/pagination.tsx` | `lucide-react` |
| 28 | `src/components/ui/popover.tsx` | `@radix-ui/react-popover` |
| 29 | `src/components/ui/progress.tsx` | `@radix-ui/react-progress` |
| 30 | `src/components/ui/radio-group.tsx` | `@radix-ui/react-radio-group`, `lucide-react` |
| 31 | `src/components/ui/resizable.tsx` | `react-resizable-panels`, `lucide-react` |
| 32 | `src/components/ui/scroll-area.tsx` | `@radix-ui/react-scroll-area` |
| 33 | `src/components/ui/select.tsx` | `@radix-ui/react-select`, `lucide-react` |
| 34 | `src/components/ui/separator.tsx` | `@radix-ui/react-separator` |
| 35 | `src/components/ui/sheet.tsx` | `@radix-ui/react-dialog`, `lucide-react`, `class-variance-authority` |
| 36 | `src/components/ui/sidebar.tsx` | `@radix-ui/react-slot`, `lucide-react` |
| 37 | `src/components/ui/skeleton.tsx` | nessuna (solo Tailwind) |
| 38 | `src/components/ui/slider.tsx` | `@radix-ui/react-slider` |
| 39 | `src/components/ui/sonner.tsx` | `sonner`, `next-themes` |
| 40 | `src/components/ui/switch.tsx` | `@radix-ui/react-switch` |
| 41 | `src/components/ui/table.tsx` | nessuna (solo Tailwind) |
| 42 | `src/components/ui/tabs.tsx` | `@radix-ui/react-tabs` |
| 43 | `src/components/ui/textarea.tsx` | nessuna (solo Tailwind) |
| 44 | `src/components/ui/toggle.tsx` | `@radix-ui/react-toggle`, `class-variance-authority` |
| 45 | `src/components/ui/toggle-group.tsx` | `@radix-ui/react-toggle-group`, `class-variance-authority` |
| 46 | `src/components/ui/tooltip.tsx` | `@radix-ui/react-tooltip` |

### Comando di esecuzione

```bash
git rm src/components/ui/*.tsx
```

### Rischio dipendenze VALUTA

| File VALUTA a rischio | Importa da ui/ |
|---|---|
| `src/context/AuthContext.tsx` | `Button` da `ui/button` |
| `src/App.tsx` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` e altri da `ui/tabs`, `ui/dialog`, ecc. |

Dopo questo intervento, `npx tsc --noEmit` inizierà a produrre errori su questi file. È **atteso**.

### Gate Intervento 1

```
npx tsc --noEmit
```
Verifica: nessun file in `src/lib/` compare nell'output degli errori.

---

## §6 — Intervento 2: `src/components/` (36 file)

### Elenco completo file da eliminare

| # | File | Dipendenze principali |
|---|---|---|
| 1 | `src/components/AccountCard.tsx` | `@phosphor-icons/react`, shadcn |
| 2 | `src/components/AccountDialog.tsx` | `react-hook-form`, shadcn, `@phosphor-icons/react` |
| 3 | `src/components/AppHeader.tsx` | shadcn, `@phosphor-icons/react` |
| 4 | `src/components/AudioSettings.tsx` | shadcn, `sonner` |
| 5 | `src/components/AuthScreen.tsx` | shadcn, `react-hook-form` |
| 6 | `src/components/BudgetAlertBanner.tsx` | shadcn, `@phosphor-icons/react` |
| 7 | `src/components/BudgetComparisonCard.tsx` | shadcn, `@phosphor-icons/react` |
| 8 | `src/components/BudgetDialog.tsx` | `react-hook-form`, shadcn, `@phosphor-icons/react` |
| 9 | `src/components/BudgetForecastCard.tsx` | shadcn, `@phosphor-icons/react` |
| 10 | `src/components/BudgetHistoryChart.tsx` | `recharts`, shadcn |
| 11 | `src/components/BudgetProgressCard.tsx` | shadcn, `@phosphor-icons/react` |
| 12 | `src/components/CategoryManagement.tsx` | shadcn, `@phosphor-icons/react` |
| 13 | `src/components/DashboardTab.tsx` | shadcn, `@phosphor-icons/react`, `recharts` |
| 14 | `src/components/DataManagement.tsx` | shadcn, `@phosphor-icons/react` |
| 15 | `src/components/DialogsOverlay.tsx` | shadcn |
| 16 | `src/components/DisplaySettings.tsx` | shadcn |
| 17 | `src/components/FocusIndicator.tsx` | nessuna (solo CSS) |
| 18 | `src/components/HapticSettings.tsx` | shadcn |
| 19 | `src/components/IncomeExpenseChart.tsx` | `recharts`, shadcn |
| 20 | `src/components/KeyboardShortcutsHelp.tsx` | shadcn |
| 21 | `src/components/LiveRegion.tsx` | nessuna |
| 22 | `src/components/LoadingSpinner.tsx` | nessuna (solo CSS) |
| 23 | `src/components/MonthlyComparisonChart.tsx` | `recharts`, shadcn |
| 24 | `src/components/OnboardingFlow.tsx` | shadcn, `react-hook-form` |
| 25 | `src/components/PeriodSelector.tsx` | shadcn |
| 26 | `src/components/PinDialog.tsx` | shadcn |
| 27 | `src/components/ReportsTab.tsx` | `recharts`, shadcn, `@phosphor-icons/react` |
| 28 | `src/components/SavingsGoalCard.tsx` | shadcn, `@phosphor-icons/react` |
| 29 | `src/components/SavingsGoalDialog.tsx` | `react-hook-form`, shadcn, `@phosphor-icons/react` |
| 30 | `src/components/ScreenReaderSettings.tsx` | shadcn |
| 31 | `src/components/SecuritySettings.tsx` | shadcn, `@phosphor-icons/react` |
| 32 | `src/components/SkipLink.tsx` | nessuna |
| 33 | `src/components/TalkBackSettings.tsx` | shadcn |
| 34 | `src/components/TransactionActionMenu.tsx` | shadcn, `@phosphor-icons/react` |
| 35 | `src/components/TransactionDialog.tsx` | `react-hook-form`, shadcn, `@phosphor-icons/react` |
| 36 | `src/components/TransactionsTab.tsx` | shadcn, `@phosphor-icons/react` |

### Comando di esecuzione

```bash
git rm src/components/*.tsx
```

> Nota: la directory `src/components/ui/` è già stata svuotata nell'Intervento 1. Il comando `*.tsx` non ricorsa in `ui/`. Dopo questo passo la directory `src/components/` è vuota (solo la subdirectory `ui/` vuota rimane — la si può eliminare con `git rm -r src/components/ui/` se non già fatto).

### Rischio dipendenze VALUTA

| File VALUTA a rischio | Importa da components/ |
|---|---|
| `src/App.tsx` | Tutti i tab principali, AuthScreen, DialogsOverlay, OnboardingFlow, AppHeader |
| `src/context/AuthContext.tsx` | Nessun import diretto da components/ (il JSX del banner di inattività è inline nel context) |

### Gate Intervento 2

```
npx tsc --noEmit
```
Verifica: nessun file in `src/lib/` o `src/lib/supabase/` compare nell'output degli errori.

---

## §7 — Intervento 3: hook ELIMINA in `src/hooks/` (4 file)

### Elenco file da eliminare

| # | File | Motivo |
|---|---|---|
| 1 | `src/hooks/use-mobile.ts` | Usa `window.matchMedia`, `window.innerWidth` — concetto CSS breakpoint inesistente in RN |
| 2 | `src/hooks/use-keyboard-shortcuts.ts` | Usa `window.addEventListener('keydown')` — scorciatoie tastiera non applicabili su touch |
| 3 | `src/hooks/use-app-shortcuts.ts` | Dipende da keyboard shortcuts + `sonner` (toast web) + `soundSystem` |
| 4 | `src/hooks/use-list-navigation.ts` | Usa keyboard events, DOM `querySelector`, `.focus()` — gestione focus DOM-specifica |

### File hook da NON eliminare (classificati VALUTA)

`use-haptic.ts`, `use-online-status.ts`, `use-inactivity-timer.ts`, `use-screen-reader.ts`, `use-display-preferences.ts`, `use-user-settings.ts`, `use-visible-data.ts`, `use-talkback.ts`

### Comandi di esecuzione

```bash
git rm src/hooks/use-mobile.ts
git rm src/hooks/use-keyboard-shortcuts.ts
git rm src/hooks/use-app-shortcuts.ts
git rm src/hooks/use-list-navigation.ts
```

### Rischio dipendenze VALUTA

| File VALUTA a rischio | Importa |
|---|---|
| `src/App.tsx` | `use-app-shortcuts`, `use-keyboard-shortcuts`, `use-mobile`, `use-list-navigation` (probabile) |

### Gate Intervento 3

```
npx tsc --noEmit
```
Verifica: nessun file in `src/lib/` o `src/lib/supabase/` compare nell'output degli errori.

---

## §8 — Intervento 4: file radice `src/` (7 file)

### Elenco file da eliminare

| # | File | Motivo |
|---|---|---|
| 1 | `src/main.tsx` | Entry point DOM — usa `react-dom/client`, `react-error-boundary`, shadcn |
| 2 | `src/ErrorFallback.tsx` | Componente errore con classi Tailwind e DOM |
| 3 | `src/index.css` | CSS globale — non applicabile in RN |
| 4 | `src/main.css` | CSS entry — non applicabile in RN |
| 5 | `src/styles/theme.css` | Token CSS (`oklch`, variabili CSS) — non applicabile in RN |
| 6 | `src/lucide-react.d.ts` | Type declaration per libreria icone Web eliminata |
| 7 | `src/vite-end.d.ts` | Tipo `import.meta.env` Vite-specific — non applicabile in RN |

### Comandi di esecuzione

```bash
git rm src/main.tsx
git rm src/ErrorFallback.tsx
git rm src/index.css
git rm src/main.css
git rm src/styles/theme.css
git rm src/lucide-react.d.ts
git rm src/vite-end.d.ts
```

> Nota: `src/App.tsx` **non** è nell'elenco di rimozione. È classificato implicitamente come VALUTA (container web dell'app — da riscrivere per RN). Non toccare.

### Rischio dipendenze VALUTA

`src/main.tsx` è esso stesso ELIMINA — la sua eliminazione non impatta file VALUTA rimanenti. Dopo la rimozione di `src/index.css` e `src/main.css`, eventuali import CSS in `src/App.tsx` o `src/main.tsx` (già eliminato) produrranno errori TS — attesi.

### Gate Intervento 4

```
npx tsc --noEmit
```
Verifica: nessun file in `src/lib/` o `src/lib/supabase/` compare nell'output degli errori.

---

## §9 — Intervento 5: `src/lib/utils.ts` (1 file)

### File da eliminare

| File | Motivo |
|---|---|
| `src/lib/utils.ts` | Esporta solo `cn()` — utility per composizione classi Tailwind (`clsx` + `tailwind-merge`). Non ha significato in RN. |

### Comando di esecuzione

```bash
git rm src/lib/utils.ts
```

### Rischio dipendenze VALUTA

`cn()` è importato da quasi tutti i file in `src/components/ui/` (già eliminati) e da alcuni file VALUTA come `src/context/AuthContext.tsx` (se usa classi Tailwind inline tramite cn). Verificare nell'output tsc dopo questo passo.

### Gate Intervento 5

```
npx tsc --noEmit
```
Verifica: nessun file in `src/lib/` o `src/lib/supabase/` compare nell'output degli errori.

---

## §10 — Intervento 6: `src/test/` (9 file)

### Elenco file da eliminare

| # | Percorso | Tipo |
|---|---|---|
| 1 | `src/test/setup.ts` | Setup vitest + jsdom + @testing-library |
| 2 | `src/test/smoke/01-app-renders.test.tsx` | Smoke test Web |
| 3 | `src/test/smoke/02-authentication.test.tsx` | Smoke test Web |
| 4 | `src/test/smoke/03-dashboard-tab.test.tsx` | Smoke test Web |
| 5 | `src/test/smoke/04-transactions-tab.test.tsx` | Smoke test Web |
| 6 | `src/test/smoke/05-private-account.test.tsx` | Smoke test Web |
| 7 | `src/test/smoke/test-utils.ts` | Helper per test Web |
| 8 | `src/test/unit/cache.test.ts` | Test logica cache (logica portabile, setup va adattato per RN) |
| 9 | `src/test/unit/use-online-status.test.ts` | Test hook Web |

### Comando di esecuzione

```bash
git rm -r src/test/
```

### Rischio dipendenze VALUTA

Nessuno. I file di test non sono importati da file sorgente.

### Gate Intervento 6

```
npx tsc --noEmit
```
Verifica: la rimozione dei file test potrebbe **ridurre** il numero di errori tsc (i test importavano file ELIMINA già rimossi). Verificare che nessun file `src/lib/` compaia negli errori.

---

## §11 — Intervento 7: dipendenze npm (40 pacchetti)

> **Prerequisito:** tutti gli interventi da 1 a 6 devono essere completati prima di eseguire questo passo. La rimozione dei pacchetti prima dei file sorgente genera errori tsc non gestibili sulle righe import ancora presenti.

### Dipendenze da rimuovere (dependencies)

**Pacchetti @radix-ui (27):**

| Pacchetto |
|---|
| `@radix-ui/colors` |
| `@radix-ui/react-accordion` |
| `@radix-ui/react-alert-dialog` |
| `@radix-ui/react-aspect-ratio` |
| `@radix-ui/react-avatar` |
| `@radix-ui/react-checkbox` |
| `@radix-ui/react-collapsible` |
| `@radix-ui/react-context-menu` |
| `@radix-ui/react-dialog` |
| `@radix-ui/react-dropdown-menu` |
| `@radix-ui/react-hover-card` |
| `@radix-ui/react-label` |
| `@radix-ui/react-menubar` |
| `@radix-ui/react-navigation-menu` |
| `@radix-ui/react-popover` |
| `@radix-ui/react-progress` |
| `@radix-ui/react-radio-group` |
| `@radix-ui/react-scroll-area` |
| `@radix-ui/react-select` |
| `@radix-ui/react-separator` |
| `@radix-ui/react-slider` |
| `@radix-ui/react-slot` |
| `@radix-ui/react-switch` |
| `@radix-ui/react-tabs` |
| `@radix-ui/react-toggle` |
| `@radix-ui/react-toggle-group` |
| `@radix-ui/react-tooltip` |

**Altre librerie web (11):**

| Pacchetto | Motivo |
|---|---|
| `tailwind-merge` | utility Tailwind — non ha senso in RN |
| `clsx` | utility CSS — non ha senso in RN |
| `class-variance-authority` | varianti CSS — non ha senso in RN |
| `recharts` | grafici SVG Web |
| `lucide-react` | icone SVG Web |
| `vaul` | drawer Web |
| `cmdk` | command palette Web |
| `embla-carousel-react` | carousel Web |
| `input-otp` | OTP input Web |
| `react-resizable-panels` | pannelli ridimensionabili Web |
| `next-themes` | gestione tema CSS Web |

### Dipendenze da rimuovere (devDependencies)

| Pacchetto | Motivo |
|---|---|
| `@testing-library/react` | testing Web |
| `@testing-library/jest-dom` | matching DOM per vitest |
| `@testing-library/user-event` | simulazione eventi DOM (presuppone @testing-library/react) |

> **Nota:** `@testing-library/user-event` non era nell'elenco originale dell'utente ma dipende da `@testing-library/react`. Includerlo mantiene `node_modules` coerente.

### Comando di esecuzione

```bash
npm uninstall \
  tailwind-merge clsx class-variance-authority recharts lucide-react \
  vaul cmdk embla-carousel-react input-otp react-resizable-panels next-themes \
  @radix-ui/colors \
  @radix-ui/react-accordion \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar \
  @radix-ui/react-checkbox \
  @radix-ui/react-collapsible \
  @radix-ui/react-context-menu \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-label \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-popover \
  @radix-ui/react-progress \
  @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slider \
  @radix-ui/react-slot \
  @radix-ui/react-switch \
  @radix-ui/react-tabs \
  @radix-ui/react-toggle \
  @radix-ui/react-toggle-group \
  @radix-ui/react-tooltip

npm uninstall --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event
```

### Dipendenze orfane non in elenco (da valutare in P43)

Le seguenti dipendenze diventano orfane dopo P42 ma non erano nella lista di rimozione. Documentarle per P43:

| Pacchetto | Usato solo in | Stato dopo P42 |
|---|---|---|
| `react-day-picker` | `src/components/ui/calendar.tsx` (eliminato) | Orfano — da rimuovere in P43 |
| `tailwindcss` | build + `@tailwindcss/vite` | Orfano — da rimuovere in P43 (con `@tailwindcss/vite`, `@tailwindcss/postcss`, `@tailwindcss/container-queries`, `tw-animate-css`) |

### Gate Intervento 7

```
npm run build
```
Il build fallirà (Vite entry point `src/main.tsx` è stato eliminato) — questo è **atteso**.

Verifica alternativa:
```
npx tsc --noEmit
```
Verifica: nessun errore dovuto a import di `@radix-ui`, `lucide-react`, `recharts`, ecc. — questi pacchetti non esistono più in `node_modules`. Gli errori residui devono riguardare solo import tra file sorgente rimossi vs file VALUTA ancora presenti.

---

## §12 — File da NON toccare

### TIENI — portabili senza modifiche

| File |
|---|
| `src/lib/types.ts` |
| `src/lib/budget-history.ts` |
| `src/lib/budget-forecasting.ts` |
| `src/lib/supabase/types.ts` |
| `src/lib/supabase/repositories/conti.ts` |
| `src/lib/supabase/repositories/transazioni.ts` |
| `src/lib/supabase/repositories/categorie.ts` |
| `src/lib/supabase/repositories/budget.ts` |
| `src/lib/supabase/repositories/obiettivi-risparmio.ts` |
| `src/lib/supabase/repositories/impostazioni-utente.ts` |

### VALUTA — da refactoring in P43+ (non toccare in P42)

| File | Problema da risolvere in P43 |
|---|---|
| `src/App.tsx` | Importa tutti i componenti ELIMINA — da riscrivere |
| `src/lib/helpers.ts` | `downloadFile()` usa Blob/DOM |
| `src/lib/budget-alerts.ts` | `getAlertIconColor()` ritorna classi Tailwind |
| `src/lib/constants.ts` | `ACCOUNT_TYPE_ICONS` usa `@phosphor-icons/react` |
| `src/lib/budget-templates.ts` | Campo `icon` usa icone React Web |
| `src/lib/crypto.ts` | `crypto.subtle`, `TextEncoder` richiedono polyfill in RN |
| `src/lib/haptic-system.ts` | `navigator.vibrate`, `localStorage` |
| `src/lib/sound-system.ts` | Web Audio API |
| `src/lib/screen-reader.ts` | DOM `aria-live` |
| `src/lib/supabase/client.ts` | `import.meta.env` Vite-specific |
| `src/lib/supabase/cache.ts` | `window.localStorage` |
| `src/hooks/use-haptic.ts` | Dipende da `haptic-system.ts` |
| `src/hooks/use-online-status.ts` | `window.addEventListener('online'/'offline')` |
| `src/hooks/use-inactivity-timer.ts` | `document.addEventListener` |
| `src/hooks/use-screen-reader.ts` | Dipende da `screen-reader.ts` |
| `src/hooks/use-display-preferences.ts` | Portabile — nessun problema immediato |
| `src/hooks/use-user-settings.ts` | Portabile — nessun problema immediato |
| `src/hooks/use-visible-data.ts` | Dipende da `constants.ts` |
| `src/hooks/use-talkback.ts` | Logica browser-specifica |
| `src/context/AuthContext.tsx` | Importa shadcn Button, usa JSX Web |
| `src/context/AppDataContext.tsx` | `sonner` toast, `soundSystem`, `hapticSystem` |
| `src/context/VisibleDataContext.tsx` | Portabile dopo adattamento dipendenze |
| `src/context/UserSettingsContext.tsx` | Portabile — nessun problema immediato |

---

## §13 — Gate finale

Al termine di tutti e 7 gli interventi, verificare:

| Verifica | Risultato atteso |
|---|---|
| `git status` — file ELIMINA | Tutti i 103 file ELIMINA nello staging come `deleted` |
| `git status` — file VALUTA | Nessun file VALUTA modificato (solo deleted) |
| `npx tsc --noEmit` | Errori solo su file VALUTA (src/App.tsx, src/context/, src/hooks/ VALUTA che importavano ELIMINA). Nessun errore su src/lib/ TIENI |
| `npm ls` — pacchetti rimossi | Nessuno dei 40 pacchetti compare nell'output |
| `git diff --name-only HEAD \| grep ".github"` | Output vuoto — nessun file framework modificato |

**Stato post-P42:** codebase con soli file TIENI e VALUTA. Input per P43 (adattamento VALUTA per React Native).
