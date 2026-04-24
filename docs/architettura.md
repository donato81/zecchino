# Architettura — Zecchino

> Documento di riferimento per la struttura tecnica del progetto.
> Aggiornare dopo ogni modifica strutturale significativa.

---

## Panoramica

Zecchino è una **SPA (Single Page Application) React** completamente client-side.
Non ha backend, non esegue chiamate di rete: tutti i dati sono locali (localStorage).

```
Browser
  └── React SPA (Vite)
        ├── UI Components (shadcn/ui + Radix UI)
        ├── State (AppState in localStorage)
        ├── Security (PIN hash + AES-256)
        ├── Accessibility (TalkBack / VoiceView / NVDA)
        └── Audio + Haptic feedback
```

---

## Stack tecnologico

| Layer | Tecnologia | Versione |
|---|---|---|
| Framework UI | React | 19 |
| Linguaggio | TypeScript | ES2020 |
| Build tool | Vite + `@vitejs/plugin-react-swc` | 6.x |
| Styling | TailwindCSS v4 | `@tailwindcss/vite` |
| Componenti | shadcn/ui (`@radix-ui/*`) | varie |
| Data fetching | TanStack Query | v5 |
| Grafici | D3 + Recharts | v7 / v2 |
| Animazioni | Framer Motion | v12 |
| Icone | Lucide React + Phosphor Icons | latest |
| Piattaforma | GitHub Spark | `@github/spark` |

---

## Struttura cartelle

```
src/
├── App.tsx                  # File di pura composizione: provider, guard auth, layout e tab navigation
├── main.tsx                 # Entry point
├── index.css / main.css     # Stili globali
├── components/              # Componenti UI dell'applicazione
│   ├── AccountCard.tsx
│   ├── AccountDialog.tsx
│   ├── BudgetAlertBanner.tsx
│   ├── BudgetDialog.tsx
│   ├── BudgetForecastCard.tsx
│   ├── BudgetHistoryChart.tsx
│   ├── BudgetProgressCard.tsx
│   ├── BudgetComparisonCard.tsx
│   ├── CategoryManagement.tsx
│   ├── DataManagement.tsx
│   ├── IncomeExpenseChart.tsx
│   ├── MonthlyComparisonChart.tsx
│   ├── PeriodSelector.tsx
│   ├── PinDialog.tsx
│   ├── SavingsGoalCard.tsx
│   ├── SavingsGoalDialog.tsx
│   ├── DashboardTab.tsx
│   ├── ReportsTab.tsx
│   ├── AppHeader.tsx
│   ├── AuthScreen.tsx
│   ├── DialogsOverlay.tsx
│   ├── TransactionDialog.tsx
│   ├── TransactionsTab.tsx
│   ├── [Accessibility components]  # FocusIndicator, LiveRegion, SkipLink
│   ├── [Settings components]       # AudioSettings, DisplaySettings, HapticSettings,
│   │                               # ScreenReaderSettings, SecuritySettings, TalkBackSettings
│   └── ui/                         # Primitivi shadcn/ui
├── hooks/                   # Custom React hooks
│   ├── use-display-preferences.ts
│   ├── use-haptic.ts
│   ├── use-app-shortcuts.ts      # Configura le 14 shortcut da tastiera globali. Legge da AppDataContext, AuthContext e useVisibleData. Delegato da App.tsx.
│   ├── use-visible-data.ts       # Fornisce valori derivati da AppDataContext e AuthContext
│   ├── use-keyboard-shortcuts.ts
│   ├── use-list-navigation.ts
│   ├── use-mobile.ts
│   ├── use-screen-reader.ts
│   └── use-talkback.ts
├── lib/                     # Logica di dominio e utility
│   ├── types.ts             # Tipi TypeScript centralizzati
│   ├── constants.ts         # Costanti applicazione
│   ├── utils.ts             # cn(), utilità generali
│   ├── helpers.ts           # Calcoli e trasformazioni dati
│   ├── crypto.ts            # Cifratura AES-256
│   ├── sound-system.ts      # Sistema audio (40+ suoni)
│   ├── haptic-system.ts     # Feedback tattile
│   ├── screen-reader.ts     # Live regions e announce
│   ├── budget-alerts.ts     # Alert soglia budget
│   ├── budget-forecasting.ts
│   ├── budget-history.ts
│   └── budget-templates.ts
└── styles/
    └── theme.css            # Variabili CSS tema
```

## Struttura documentazione

La documentazione del progetto e organizzata nella cartella `docs/` con la struttura principale aggiornata per P14:

```
docs/
├── 1 - projects/
├── 2 - coding plans/
├── 3 - todo lists/
├── 4 - reports/
├── accessibility/
│   ├── android/
│   ├── history/
│   ├── ACCESSIBILITY.md
│   ├── GUIDA_SCREEN_READER.md
│   ├── SCREEN_READER_AUDIT.md
│   └── talkback.md
├── feedback/
│   ├── HAPTIC_FEEDBACK.md
│   └── SOUND_COVERAGE_REPORT.md
├── PRD.md
├── api.md
├── architettura.md
└── todo.md
```

---

## Gestione stato

Nessun state manager esterno. Lo stato applicazione (`AppState`) è:

A partire da P01–P13, parte dello stato è migrata in Context dedicati:
- `AppDataContext` — dati applicazione (conti, movimenti, budget, obiettivi,
  stato dialog transazioni ed eliminazioni)
- `AuthContext` — autenticazione (PIN globale e privato)
- `useVisibleData` — valori derivati calcolati dai due context
- `AppHeader` — header applicazione estratto come componente autonomo;
      `showKeyboardHelp` migrato da `useState` locale in `App.tsx` a `AppDataContext`;
      nessuna prop, nessun `useState` locale
- `AuthScreen` — schermata di autenticazione estratta come componente autonomo;
      nessuna prop, nessun `useState` locale; dipende solo da `useAuth()`;
      il guard `if (!isAuthenticated)` rimane in `App.tsx`
- `DashboardTab` — tab Dashboard estratto come componente autonomo; gestisce filtri categoria,
  griglia conti e movimenti recenti; istanzia localmente `recentTransactionsNav`
- `ReportsTab` — tab Report estratto come componente autonomo; gestisce budget,
  obiettivi di risparmio, grafici e impostazioni; `chartPeriod` rimane `useState` locale
- `DialogsOverlay` — tutti e sette i dialog modali estratti in un unico
  componente autonomo; nessuna prop, nessun useState locale; dipende da
  useAppData(), useAuth(), useVisibleData(); debito tecnico dichiarato:
  undici stati UI dialog in AppDataContext, candidati a UIContext separato
  in fase futura
- `App.tsx` — file di pura composizione (~140 righe); provider, guard
      autenticazione, layout strutturale, navigazione tab; nessun useMemo,
      nessun handler, nessun calcolo derivato; tutti i dati arrivano da
      AppDataContext, AuthContext e useVisibleData()

1. Mantenuto in React (`useState` / `useReducer` in `App.tsx`)
2. Persistito in **localStorage** ad ogni cambiamento
3. Caricato all'avvio con idratazione iniziale

```
AppState
├── isAuthenticated       (boolean)
├── isPrivateUnlocked     (boolean)
├── accounts[]            (Account)
├── transactions[]        (Transaction)
├── categories[]          (Category)
├── budgets[]             (Budget)
├── savingsGoals[]        (SavingsGoal)
├── globalPinHash         (string — SHA-256)
└── privatePinHash        (string — SHA-256)
```

---

## Sicurezza

| Meccanismo | Implementazione |
|---|---|
| Autenticazione | PIN globale hashato SHA-256 |
| Account privato | PIN separato, visibilità condizionale |
| Cifratura dati | AES-256 (`src/lib/crypto.ts`) per `Transaction.cifrato: true` |
| Nessun server | Zero superfici di attacco network-side |

---

## Accessibilità

| Standard | Implementazione |
|---|---|
| TalkBack / VoiceView | Hook `useTalkback`, ARIA labels, ruoli semantici |
| NVDA / screen reader | `LiveRegion.tsx`, `SkipLink.tsx`, `FocusIndicator.tsx` |
| Tastiera | `useKeyboardShortcuts`, `useListNavigation` |
| Touch target | Minimo 48×48 px (Android standard) |
| Live regions | `aria-live="polite"` per aggiornamenti dinamici |

---

## Flusso di navigazione

```
App start
  └── PinDialog (autenticazione globale)
        └── Dashboard principale
              ├── Lista conti (AccountCard)
              ├── Transazioni filtrabili
              ├── Report / Grafici (D3, Recharts)
              ├── Budget (progresso, previsioni, alert)
              ├── Obiettivi risparmio (SavingsGoalCard)
              └── Impostazioni (audio, haptic, display, sicurezza, SR)
```

---

## Path alias

```ts
// tsconfig.json / vite.config.ts
"@/*" → "./src/*"
```

---

## Build

```bash
npm run dev       # Sviluppo con HMR
npm run build     # Build produzione (tsc --noCheck + vite build)
npm run preview   # Anteprima build produzione
npm run lint      # ESLint
```
