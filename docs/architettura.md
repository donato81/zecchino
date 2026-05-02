# Architettura — Zecchino

> Documento di riferimento per la struttura tecnica del progetto.
> Aggiornare dopo ogni modifica strutturale significativa.

---

## Panoramica

Zecchino è una **SPA (Single Page Application) React** che gira nel browser ma usa una persistenza remota tramite **Supabase**.
Il layer di accesso dati dedicato in `src/lib/supabase/` è l'unica parte dell'app che comunica direttamente con il backend Supabase.

```
Browser
  └── React SPA (Vite)
        ├── UI Components (shadcn/ui + Radix UI)
        ├── Data Layer (Supabase via src/lib/supabase/)
  ├── State (React Context: AppDataContext, AuthContext, VisibleData)
  ├── Security (Supabase Auth + PIN privato + RLS + AES-256)
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
| Data persistence | Supabase | Postgres + Auth + RLS |
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
│   ├── LoadingSpinner.tsx
│   ├── OnboardingFlow.tsx
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
│   ├── use-inactivity-timer.ts   # Timer inattività con warning pre-scadenza e callback di logout
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
│   ├── budget-templates.ts
│   └── supabase/            # Layer di accesso dati Supabase
│       ├── client.ts
│       ├── types.ts
│       └── repositories/
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

Nessun state manager esterno. Lo stato applicazione è gestito con React Context e funzioni esplicite di sincronizzazione: `AppDataContext`, `AuthContext` e `VisibleDataProvider`.

A partire da P01–P13, parte dello stato è migrata in Context dedicati:
- `AppDataContext` — dati applicazione di dominio (conti, movimenti, budget,
  obiettivi, stato dialog transazioni ed eliminazioni). I dati provengono da
  `src/lib/supabase/` e sono caricati da repository Supabase.
- `AuthContext` — autenticazione Supabase email/password, bootstrap sessione,
  logout, recovery password, timeout inattività e gestione transitoria del PIN privato.
- `useVisibleData` — valori derivati calcolati da `AppDataContext` e `AuthContext`.
- `AppHeader` — header applicazione estratto come componente autonomo;
  `showKeyboardHelp` migrato da `useState` locale in `App.tsx` a `AppDataContext`.
- `AuthScreen` — schermata di autenticazione estratta come componente autonomo;
  espone pannelli Login, Signup, Recovery e conferma signup; dipende solo da `useAuth()`.
- `LoadingSpinner` — schermata neutra mostrata durante il bootstrap auth quando `isAuthReady` è `false`.
- `OnboardingFlow` — placeholder introdotto per il gate `needsOnboarding`; l'implementazione completa è rinviata a un blocco successivo.
- `DashboardTab` — tab Dashboard estratto come componente autonomo; gestisce filtri categoria,
  griglia conti e movimenti recenti.
- `ReportsTab` — tab Report estratto come componente autonomo; gestisce budget,
  obiettivi di risparmio, grafici e impostazioni.
- `DialogsOverlay` — tutti i dialog modali estratti in un unico componente autonomo;
  dipende da `useAppData()`, `useAuth()`, `useVisibleData()`.
- `TransactionDialog` — bugfix BUG-04 (P22): l'hook `useScreenReader` ora restituisce
  un oggetto stabile tramite `useMemo`.
- `App.tsx` — file di pura composizione; provider, guard autenticazione, layout
  strutturale e navigazione tab. Tutti i dati arrivano dai context.

Principi di persistenza:
1. I dati di dominio sono caricati e salvati su Supabase tramite il layer
   `src/lib/supabase/`.
2. La sessione utente è gestita da Supabase Auth; `AuthContext` usa il client Supabase per bootstrap e cambi stato auth.
3. `localStorage` è impiegato solo per configurazioni locali secondarie come
   le impostazioni `haptic` in `src/lib/haptic-system.ts`.

### Gate applicativi in `App.tsx`

Il rendering principale passa ora attraverso tre gate sequenziali:

1. `!isAuthReady` → `LoadingSpinner`
2. `!isAuthenticated` → `AuthScreen`
3. `needsOnboarding` → `OnboardingFlow`

Solo dopo questi tre passaggi viene montata l'area applicativa completa.

---

## Sicurezza

| Meccanismo | Implementazione |
|---|---|
| Autenticazione | Supabase Auth email/password con conferma email |
| Timeout sessione | Hook `use-inactivity-timer` + `signOut()` automatico |
| Account privato | PIN separato, visibilità condizionale, logica transitoria in `AuthContext` |
| Cifratura dati | AES-256 (`src/lib/crypto.ts`) per `Transaction.cifrato: true` |
| Backend | Supabase con RLS e sessione utente |

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
  └── Bootstrap sessione AuthContext
        ├── LoadingSpinner se la sessione non è ancora risolta
        ├── AuthScreen se l'utente non è autenticato
        ├── OnboardingFlow se l'utente è autenticato ma non configurato
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

## Strumenti di sviluppo

- `eslint.config.js` e attivo in root come flat config ESLint 9 in formato ESModule.
- Il gate lint P15 opera in **Fase A**: tutte le regole sono configurate in modalita `warn`, senza errori bloccanti sul codice esistente.
- La configurazione e organizzata in 6 layer: `@eslint/js`, `typescript-eslint`, `react-hooks`, `react-refresh`, `jsx-a11y`, e un Layer 6 che disabilita `react-refresh/only-export-components` per i file `src/components/ui/**` e `src/context/**`.
- La baseline warning del progetto post-P20 è: **0 warning, 0 errori**.
- Questa baseline è il gate di ingresso per la futura CI pipeline (P21).
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — attivo su ogni PR verso `refactoring-architettura`. Pipeline: lint → build → test. Step: `actions/checkout@v4`, `actions/setup-node@v4` (Node.js 20 LTS, cache npm), `npm ci`, `npm run lint`, `npm run build`, `npm run test:run`. Esito atteso: 0 problems lint, build exit 0, 5 test passed.
- Dopo P27, la suite smoke valida l'area autenticata tramite mock parziale di `AuthContext` nei test, così il gate resta stabile anche con il nuovo login Supabase.
