# Analisi File per Migrazione React Native

**Data:** 2026-05-09  
**Branch:** refactoring-architettura  
**Scopo:** Classificare ogni file in `src/` per valutare la riusabilità in un contesto React Native.

---

## Legenda

| Categoria | Significato |
|-----------|-------------|
| **TIENI** | Logica pura, zero dipendenze da browser o UI — portabile senza modifiche |
| **ELIMINA** | Componente visivo, accessibilità DOM-specifica o libreria UI incompatibile |
| **VALUTA** | Mix di logica riusabile e dipendenze piattaforma — parzialmente portabile con refactoring |

---

## 1. `src/lib/` — Logica di dominio

### TIENI

| File | Dipendenze esterne | Note |
|------|-------------------|------|
| `src/lib/types.ts` | nessuna | Solo tipi TypeScript puri — interfacce di dominio (`Account`, `Transaction`, `Budget`, ecc.) |
| `src/lib/budget-history.ts` | nessuna | Calcoli storici sui periodi budget — matematica pura su array |
| `src/lib/budget-forecasting.ts` | nessuna (interna: `budget-history`) | Previsione di spesa — algoritmi puri, nessuna API browser |

### VALUTA

| File | Dipendenze esterne | Problema | Azione |
|------|-------------------|----------|--------|
| `src/lib/helpers.ts` | nessuna | `downloadFile()` usa `Blob`, `URL.createObjectURL`, `document.createElement` — browser-only | Estrarre `downloadFile` in un file separato; tutto il resto (calcoli, `formatCurrency`, `formatDate`, `getBudgetProgress`, ecc.) è logica pura portabile |
| `src/lib/budget-alerts.ts` | nessuna | `getAlertIconColor()` ritorna classi Tailwind CSS (`text-destructive`, `text-amber-500`) | Sostituire la funzione con token di stile astratti; il resto (calcoli alert, `generateBudgetAlerts`) è portabile |
| `src/lib/constants.ts` | `@phosphor-icons/react` | `ACCOUNT_TYPE_ICONS` importa icone React Web | Scindere: le costanti dati (`ACCOUNT_TYPE_LABELS`, `ACCOUNT_CATEGORIES`, `ACCOUNT_TYPE_TO_CATEGORY`) sono portabili; `ACCOUNT_TYPE_ICONS` va riscritto con icone RN |
| `src/lib/budget-templates.ts` | `@phosphor-icons/react` | Il campo `icon: Icon` in `BudgetTemplate` usa icone React Web | I template dati (nomi, importi, periodi) sono portabili; il campo `icon` va rimpiazzato con identificatori stringa |
| `src/lib/crypto.ts` | `bcryptjs` | `bcryptjs` è isomorfico; `crypto.subtle` (Web Crypto API) è disponibile in RN via `expo-crypto` o `react-native-get-random-values`; `TextEncoder`/`TextDecoder` richiedono polyfill | Portabile con piccoli adattamenti; la logica di hash e cifratura AES-GCM è riusabile |
| `src/lib/haptic-system.ts` | nessuna | Usa `navigator.vibrate` (Web Vibration API) e `localStorage` — non disponibili in RN | La classe `HapticSystem` e l'interfaccia `HapticPattern` sono riusabili; implementazione da sostituire con `expo-haptics` o `react-native-haptic-feedback`; storage da migrare ad `AsyncStorage`/MMKV |
| `src/lib/sound-system.ts` | nessuna | Usa `AudioContext`, `OscillatorNode`, `GainNode` (Web Audio API) — non disponibili in RN | La lista `SoundType` e l'interfaccia pubblica (`play`, `setVolume`, `setEnabled`) sono portabili; implementazione da riscrivere con `expo-av` o `react-native-sound` |
| `src/lib/screen-reader.ts` | nessuna | Usa `document.createElement`, `document.body.appendChild`, `aria-live` — DOM-specific | L'interfaccia di annuncio (metodi `announce*`) è portabile; implementazione da riscrivere con `AccessibilityInfo.announceForAccessibility()` di React Native |

### ELIMINA

| File | Dipendenze esterne | Motivo |
|------|-------------------|--------|
| `src/lib/utils.ts` | `clsx`, `tailwind-merge` | Utility `cn()` per classi Tailwind — non ha senso in RN dove non esiste CSS/Tailwind |

---

## 2. `src/lib/supabase/` — Data layer

### TIENI

| File | Dipendenze esterne | Note |
|------|-------------------|------|
| `src/lib/supabase/types.ts` | nessuna | Tipi DB row-level (`DbAccount`, `DbTransaction`, ecc.) e `UserSettings` — portabili senza modifiche |
| `src/lib/supabase/repositories/conti.ts` | `@supabase/supabase-js` | CRUD conti — logica repository pura; `@supabase/supabase-js` funziona in RN |
| `src/lib/supabase/repositories/transazioni.ts` | `@supabase/supabase-js` | CRUD transazioni — portabile |
| `src/lib/supabase/repositories/categorie.ts` | `@supabase/supabase-js` | CRUD categorie + seed — portabile |
| `src/lib/supabase/repositories/budget.ts` | `@supabase/supabase-js` | CRUD budget — portabile |
| `src/lib/supabase/repositories/obiettivi-risparmio.ts` | `@supabase/supabase-js` | CRUD obiettivi + RPC atomica — portabile |
| `src/lib/supabase/repositories/impostazioni-utente.ts` | `@supabase/supabase-js` | Lettura/scrittura preferenze utente via RPC JSONB — portabile |

### VALUTA

| File | Dipendenze esterne | Problema | Azione |
|------|-------------------|----------|--------|
| `src/lib/supabase/client.ts` | `@supabase/supabase-js` | Usa `import.meta.env` (Vite-specific) | Sostituire con `process.env` o `expo-constants`; il resto è portabile |
| `src/lib/supabase/cache.ts` | nessuna | Usa `window.localStorage` — non disponibile in RN | La logica di cache (TTL, versioning, invalidazione) è riusabile; storage da sostituire con `AsyncStorage` o MMKV |

---

## 3. `src/hooks/` — Hook React

### VALUTA

| File | Dipendenze esterne | Problema | Azione |
|------|-------------------|----------|--------|
| `src/hooks/use-haptic.ts` | `react` | Wrappa `hapticSystem`; hook React puro (`useState`, `useEffect`) — funziona in RN | Portabile dopo aggiornamento di `haptic-system.ts` |
| `src/hooks/use-online-status.ts` | `react` | Usa `window.addEventListener('online'/'offline')` — browser-specific | Logica riusabile; API da sostituire con `@react-native-community/netinfo` |
| `src/hooks/use-inactivity-timer.ts` | `react` | Usa `document.addEventListener` per eventi utente (`click`, `keydown`, `touchstart`) | `window.clearTimeout` è disponibile in RN; la logica di timer è portabile; event listener da sostituire con `AppState` e gesture handler RN |
| `src/hooks/use-screen-reader.ts` | `react` | Wrappa `screenReader` da `lib/screen-reader.ts` (DOM-specific) | L'interfaccia di annuncio è portabile; portare dopo aggiornamento di `screen-reader.ts` |
| `src/hooks/use-display-preferences.ts` | `react` | Thin wrapper su `useUserSettings()` — nessuna dipendenza UI | Portabile senza modifiche |
| `src/hooks/use-user-settings.ts` | `react`, `@supabase/supabase-js` (indiretto) | `useState`, `useCallback`, `useEffect` — tutti disponibili in RN; dipende da repository Supabase | Portabile; verifica compatibilità `updatePreference` RPC |
| `src/hooks/use-visible-data.ts` | `react` | `useMemo` + logica di filtraggio — portabile; dipende da `ACCOUNT_CATEGORIES` che importa icone Phosphor | Portabile dopo adattamento di `constants.ts` |
| `src/hooks/use-talkback.ts` | `react` | Usa `window.matchMedia`, `navigator.userAgent`, `document.body.classList`, `sessionStorage` | Logica di detection fortemente browser-specifica; da riscrivere con `AccessibilityInfo.isScreenReaderEnabled()` in RN |

### ELIMINA

| File | Dipendenze esterne | Motivo |
|------|-------------------|--------|
| `src/hooks/use-mobile.ts` | `react` | Usa `window.matchMedia`, `window.innerWidth` — il concetto di "mobile breakpoint CSS" non esiste in RN |
| `src/hooks/use-keyboard-shortcuts.ts` | `react` | Usa `window.addEventListener('keydown')` — scorciatoie da tastiera non applicabili su touch |
| `src/hooks/use-app-shortcuts.ts` | `react`, `sonner` | Dipende da shortcut da tastiera + `toast` da `sonner` (libreria web) + `soundSystem` |
| `src/hooks/use-list-navigation.ts` | `react` | Usa keyboard events, DOM `querySelector`, `.focus()` — gestione focus DOM-specifica; in RN la navigazione avviene via FlatList/AccessibilityInfo |

---

## 4. `src/context/` — React Context

### VALUTA

| File | Dipendenze esterne | Problema | Azione |
|------|-------------------|----------|--------|
| `src/context/AuthContext.tsx` | `react`, `@supabase/supabase-js`, `sonner` | Logica auth (signIn, signUp, signOut, PIN) riusabile; contiene JSX Web per il banner di inattività (`<div className="...">`, shadcn `Button`) e `sonner` toast | Estrarre logica auth in hook puro; riscrivere il banner di inattività come componente RN |
| `src/context/AppDataContext.tsx` | `react`, `@supabase/supabase-js`, `sonner` | Logica CRUD riusabile; side effects UI: `toast` (sonner), `soundSystem.play()`, `hapticSystem.*()` | La logica di stato e CRUD è portabile; i side effects UI vanno rimossi o parametrizzati tramite callback |
| `src/context/VisibleDataContext.tsx` | `react` | Thin wrapper React Context su `useVisibleData` | Portabile senza modifiche (richiede adattamento delle dipendenze) |
| `src/context/UserSettingsContext.tsx` | `react` | Thin wrapper React Context su `useUserSettings` | Portabile senza modifiche |

---

## 5. `src/components/ui/` — Componenti shadcn/Radix

**Tutti: ELIMINA**

Sono wrapper Radix UI + Tailwind generati da shadcn. Nessuno di questi è compatibile con React Native.

| File | Dipendenze esterne |
|------|-------------------|
| `accordion.tsx` | `@radix-ui/react-accordion`, `lucide-react` |
| `alert-dialog.tsx` | `@radix-ui/react-alert-dialog` |
| `alert.tsx` | `class-variance-authority` |
| `aspect-ratio.tsx` | `@radix-ui/react-aspect-ratio` |
| `avatar.tsx` | `@radix-ui/react-avatar` |
| `badge.tsx` | `class-variance-authority` |
| `breadcrumb.tsx` | `lucide-react` |
| `button.tsx` | `@radix-ui/react-slot`, `class-variance-authority` |
| `calendar.tsx` | `react-day-picker`, `lucide-react` |
| `card.tsx` | nessuna (solo Tailwind) |
| `carousel.tsx` | `embla-carousel-react`, `lucide-react` |
| `chart.tsx` | `recharts` |
| `checkbox.tsx` | `@radix-ui/react-checkbox`, `lucide-react` |
| `collapsible.tsx` | `@radix-ui/react-collapsible` |
| `command.tsx` | `cmdk`, `lucide-react` |
| `context-menu.tsx` | `@radix-ui/react-context-menu`, `lucide-react` |
| `dialog.tsx` | `@radix-ui/react-dialog`, `lucide-react` |
| `drawer.tsx` | `vaul` |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu`, `lucide-react` |
| `form.tsx` | `react-hook-form`, `@radix-ui/react-label` |
| `hover-card.tsx` | `@radix-ui/react-hover-card` |
| `input-otp.tsx` | `input-otp` |
| `input.tsx` | nessuna (solo Tailwind) |
| `label.tsx` | `@radix-ui/react-label`, `class-variance-authority` |
| `menubar.tsx` | `@radix-ui/react-menubar`, `lucide-react` |
| `navigation-menu.tsx` | `@radix-ui/react-navigation-menu`, `lucide-react` |
| `pagination.tsx` | `lucide-react` |
| `popover.tsx` | `@radix-ui/react-popover` |
| `progress.tsx` | `@radix-ui/react-progress` |
| `radio-group.tsx` | `@radix-ui/react-radio-group`, `lucide-react` |
| `resizable.tsx` | `react-resizable-panels`, `lucide-react` |
| `scroll-area.tsx` | `@radix-ui/react-scroll-area` |
| `select.tsx` | `@radix-ui/react-select`, `lucide-react` |
| `separator.tsx` | `@radix-ui/react-separator` |
| `sheet.tsx` | `@radix-ui/react-dialog`, `lucide-react`, `class-variance-authority` |
| `sidebar.tsx` | `@radix-ui/react-slot`, `lucide-react` |
| `skeleton.tsx` | nessuna (solo Tailwind) |
| `slider.tsx` | `@radix-ui/react-slider` |
| `sonner.tsx` | `sonner`, `next-themes` |
| `switch.tsx` | `@radix-ui/react-switch` |
| `table.tsx` | nessuna (solo Tailwind) |
| `tabs.tsx` | `@radix-ui/react-tabs` |
| `textarea.tsx` | nessuna (solo Tailwind) |
| `toggle.tsx` | `@radix-ui/react-toggle`, `class-variance-authority` |
| `toggle-group.tsx` | `@radix-ui/react-toggle-group`, `class-variance-authority` |
| `tooltip.tsx` | `@radix-ui/react-tooltip` |

---

## 6. `src/components/` — Componenti applicativi

**Tutti: ELIMINA**

Sono componenti React con JSX, classi Tailwind, e dipendenze da librerie UI Web.

| File | Dipendenze esterne chiave | Note |
|------|--------------------------|------|
| `AccountCard.tsx` | `@phosphor-icons/react`, shadcn | Card account con icone e saldi |
| `AccountDialog.tsx` | `react-hook-form`, shadcn, `@phosphor-icons/react` | Dialog creazione/modifica conto |
| `AppHeader.tsx` | shadcn, `@phosphor-icons/react` | Header applicazione con navigazione |
| `AudioSettings.tsx` | shadcn, `sonner` | Pannello impostazioni audio |
| `AuthScreen.tsx` | shadcn, `react-hook-form` | Schermata di login/registrazione |
| `BudgetAlertBanner.tsx` | shadcn, `@phosphor-icons/react` | Banner alert budget |
| `BudgetComparisonCard.tsx` | shadcn, `@phosphor-icons/react` | Card confronto periodi budget |
| `BudgetDialog.tsx` | `react-hook-form`, shadcn, `@phosphor-icons/react` | Dialog creazione/modifica budget |
| `BudgetForecastCard.tsx` | shadcn, `@phosphor-icons/react` | Card previsione budget |
| `BudgetHistoryChart.tsx` | `recharts`, shadcn | Grafico storico budget |
| `BudgetProgressCard.tsx` | shadcn, `@phosphor-icons/react` | Card progressione budget |
| `CategoryManagement.tsx` | shadcn, `@phosphor-icons/react` | Gestione categorie |
| `DashboardTab.tsx` | shadcn, `@phosphor-icons/react`, `recharts` | Tab principale dashboard |
| `DataManagement.tsx` | shadcn, `@phosphor-icons/react` | Import/export e gestione dati |
| `DialogsOverlay.tsx` | shadcn | Overlay che monta i dialog principali |
| `DisplaySettings.tsx` | shadcn | Pannello preferenze visualizzazione |
| `FocusIndicator.tsx` | nessuna (CSS) | Indicatore focus accessibilità Web |
| `HapticSettings.tsx` | shadcn | Pannello impostazioni haptic |
| `IncomeExpenseChart.tsx` | `recharts`, shadcn | Grafico entrate/uscite |
| `KeyboardShortcutsHelp.tsx` | shadcn | Dialog guida scorciatoie da tastiera |
| `LiveRegion.tsx` | nessuna | Regione `aria-live` DOM-specific |
| `LoadingSpinner.tsx` | nessuna (CSS) | Spinner caricamento CSS |
| `MonthlyComparisonChart.tsx` | `recharts`, shadcn | Grafico confronto mensile |
| `OnboardingFlow.tsx` | shadcn, `react-hook-form` | Flusso di onboarding |
| `PeriodSelector.tsx` | shadcn | Selettore periodo |
| `PinDialog.tsx` | shadcn | Dialog inserimento PIN |
| `ReportsTab.tsx` | `recharts`, shadcn, `@phosphor-icons/react` | Tab report con grafici |
| `SavingsGoalCard.tsx` | shadcn, `@phosphor-icons/react` | Card obiettivo di risparmio |
| `SavingsGoalDialog.tsx` | `react-hook-form`, shadcn, `@phosphor-icons/react` | Dialog creazione/modifica obiettivo |
| `ScreenReaderSettings.tsx` | shadcn | Pannello screen reader |
| `SecuritySettings.tsx` | shadcn, `@phosphor-icons/react` | Pannello sicurezza e PIN |
| `SkipLink.tsx` | nessuna | Link "salta al contenuto" (accessibilità Web) |
| `TalkBackSettings.tsx` | shadcn | Pannello impostazioni TalkBack |
| `TransactionActionMenu.tsx` | shadcn, `@phosphor-icons/react` | Menu azioni su riga transazione |
| `TransactionDialog.tsx` | `react-hook-form`, shadcn, `@phosphor-icons/react` | Dialog creazione/modifica transazione |
| `TransactionsTab.tsx` | shadcn, `@phosphor-icons/react` | Tab lista transazioni |

---

## 7. `src/` — File radice

### ELIMINA

| File | Dipendenze esterne | Motivo |
|------|-------------------|--------|
| `src/main.tsx` | `react-dom/client`, `react-error-boundary`, shadcn | Entry point DOM — specifico per React Web |
| `src/ErrorFallback.tsx` | shadcn, `lucide-react` | Componente errore con classi Tailwind/DOM |
| `src/index.css` | nessuna | CSS globale — non applicabile in RN |
| `src/main.css` | nessuna | CSS entry — non applicabile in RN |
| `src/styles/theme.css` | nessuna | Token CSS (oklch, CSS variables) — non applicabile in RN |
| `src/lucide-react.d.ts` | `lucide-react` | Type declaration per libreria icone Web |
| `src/vite-end.d.ts` | nessuna | Tipo `import.meta.env` Vite-specific |

---

## 8. `src/test/` — Test

**Tutti: ELIMINA** (da riscrivere per RN)

| File | Dipendenze esterne | Motivo |
|------|-------------------|--------|
| `src/test/setup.ts` | `@testing-library/jest-dom`, `@testing-library/react` | Setup vitest+DOM |
| `src/test/smoke/01-app-renders.test.tsx` | `@testing-library/react`, `vitest` | Test smoke Web |
| `src/test/smoke/02-authentication.test.tsx` | `@testing-library/react`, `vitest` | Test smoke Web |
| `src/test/smoke/03-dashboard-tab.test.tsx` | `@testing-library/react`, `vitest` | Test smoke Web |
| `src/test/smoke/04-transactions-tab.test.tsx` | `@testing-library/react`, `vitest` | Test smoke Web |
| `src/test/unit/cache.test.ts` | `vitest` | Test logica cache — logica portabile ma setup va adattato |
| `src/test/unit/use-online-status.test.ts` | `@testing-library/react`, `vitest` | Test hook Web |

---

## 9. Riepilogo per categoria

### TIENI (portabili senza modifiche)

| File | Dipendenze esterne |
|------|-------------------|
| `src/lib/types.ts` | — |
| `src/lib/budget-history.ts` | — |
| `src/lib/budget-forecasting.ts` | — |
| `src/lib/supabase/types.ts` | — |
| `src/lib/supabase/repositories/conti.ts` | `@supabase/supabase-js` |
| `src/lib/supabase/repositories/transazioni.ts` | `@supabase/supabase-js` |
| `src/lib/supabase/repositories/categorie.ts` | `@supabase/supabase-js` |
| `src/lib/supabase/repositories/budget.ts` | `@supabase/supabase-js` |
| `src/lib/supabase/repositories/obiettivi-risparmio.ts` | `@supabase/supabase-js` |
| `src/lib/supabase/repositories/impostazioni-utente.ts` | `@supabase/supabase-js` |

**Totale: 10 file**

---

### VALUTA (riusabili con refactoring)

| File | Sforzo stimato |
|------|---------------|
| `src/lib/helpers.ts` | Basso — estrarre `downloadFile` |
| `src/lib/budget-alerts.ts` | Basso — adattare `getAlertIconColor` |
| `src/lib/constants.ts` | Medio — scindere dati da icone |
| `src/lib/budget-templates.ts` | Basso — sostituire campo `icon` con stringa |
| `src/lib/crypto.ts` | Medio — polyfill `TextEncoder`, swap `crypto.subtle` |
| `src/lib/haptic-system.ts` | Alto — riscrivere implementazione vibrazione |
| `src/lib/sound-system.ts` | Alto — riscrivere con `expo-av` |
| `src/lib/screen-reader.ts` | Alto — riscrivere con `AccessibilityInfo` |
| `src/lib/supabase/client.ts` | Basso — swap `import.meta.env` |
| `src/lib/supabase/cache.ts` | Medio — swap `localStorage` con AsyncStorage |
| `src/hooks/use-haptic.ts` | Dipende da `haptic-system.ts` |
| `src/hooks/use-online-status.ts` | Medio — swap con `netinfo` |
| `src/hooks/use-inactivity-timer.ts` | Medio — swap document events con AppState |
| `src/hooks/use-screen-reader.ts` | Dipende da `screen-reader.ts` |
| `src/hooks/use-display-preferences.ts` | Nessuno |
| `src/hooks/use-user-settings.ts` | Basso — compatibile |
| `src/hooks/use-visible-data.ts` | Dipende da `constants.ts` |
| `src/hooks/use-talkback.ts` | Alto — logica detection completamente diversa in RN |
| `src/context/AuthContext.tsx` | Medio — estrarre logica auth, riscrivere UI |
| `src/context/AppDataContext.tsx` | Medio — parametrizzare side effects UI |
| `src/context/VisibleDataContext.tsx` | Nessuno |
| `src/context/UserSettingsContext.tsx` | Nessuno |

**Totale: 22 file**

---

### ELIMINA (da riscrivere per React Native)

| Area | File |
|------|------|
| lib | `src/lib/utils.ts` |
| hooks | `src/hooks/use-mobile.ts`, `use-keyboard-shortcuts.ts`, `use-app-shortcuts.ts`, `use-list-navigation.ts` |
| components/ui | tutti i 44 file in `src/components/ui/` |
| components | tutti i 35 file in `src/components/` |
| root | `src/main.tsx`, `ErrorFallback.tsx`, `index.css`, `main.css`, `styles/theme.css`, `lucide-react.d.ts`, `vite-end.d.ts` |
| test | tutti i 7 file in `src/test/` |

**Totale: ~98 file**

---

## 10. Dipendenze npm da eliminare / sostituire

### Da eliminare (zero equivalente in RN)
- `tailwind-merge`, `clsx` — utility CSS Web
- `@radix-ui/*` — primitivi UI Radix (Web-only)
- `class-variance-authority` — varianti CSS
- `recharts` — libreria grafici SVG Web
- `lucide-react` — icone SVG Web
- `vaul` — drawer Web
- `cmdk` — command palette Web
- `embla-carousel-react` — carousel Web
- `input-otp` — OTP input Web
- `react-resizable-panels` — pannelli ridimensionabili Web
- `next-themes` — gestione tema CSS Web
- `@testing-library/react`, `@testing-library/jest-dom` — testing Web

### Da sostituire (equivalente RN esiste)
| Libreria Web | Equivalente React Native |
|-------------|--------------------------|
| `sonner` (toast) | `react-native-toast-message` o `burnt` |
| `@phosphor-icons/react` | `@phosphor-icons/react-native` |
| `react-day-picker` | `react-native-calendars` |
| `react-hook-form` | `react-hook-form` (compatibile RN) |
| `react-error-boundary` | `react-error-boundary` (compatibile RN) |
| Web Audio API | `expo-av` |
| `navigator.vibrate` | `expo-haptics` |
| `localStorage` | `AsyncStorage` o `react-native-mmkv` |
| `window` online/offline events | `@react-native-community/netinfo` |
| `crypto.subtle` | `expo-crypto` |
| `TextEncoder` | `@stablelib/utf8` o polyfill `expo` |
| `import.meta.env` (Vite) | `expo-constants` o `process.env` |

### Compatibili senza modifiche
- `@supabase/supabase-js` — funziona in RN (richiede polyfill `URL` e `fetch`)
- `bcryptjs` — isomorfico
- `react-hook-form` — compatibile RN
- `react-error-boundary` — compatibile RN
