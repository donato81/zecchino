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
| Piattaforma | GitHub Spark | `@github/spark` — le dipendenze a `@github/spark/hooks` non sono più usate in produzione; in particolare la migrazione P30 (2026-05-03) ha rimosso l'ultima dipendenza da `useKV` in `AppDataContext.tsx`. Rimane traccia solo nei mock di test (`src/test/setup.ts`). |

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
  obiettivi, stato dialog transazioni ed eliminazioni). A partire da P28 il provider
  carica queste entità da Supabase tramite i repository in `src/lib/supabase/`
  con strategia di caricamento parallelo (`Promise.all`) e spinner globale unico.
  P33 ha eliminato l'ultima dipendenza di produzione da `useKV` in
  `CategoryManagement.tsx`, che ora consuma le categorie direttamente da
  `useAppData()`. P30 (2026-05-03) ha completato la migrazione rimuovendo la
  dipendenza residua `useKV` in `AppDataContext.tsx`: `budgetPercentages` è ora
  gestito internamente con `useState` e non è esposto pubblicamente.
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

A partire da P28, `AppDataContext` è la fonte unica per caricare i dati di dominio
da Supabase. P33 ha completato la migrazione eliminando l'ultima dipendenza di
produzione da `useKV` in `CategoryManagement.tsx`, che ora legge le categorie da
`useAppData()`.

## Migrazione preferenze: stato (P29, P31) — aggiornamento 2026-05-03

- `src/hooks/use-user-settings.ts` ora gestisce 36 valori totali: 8 originari di P29 + 28 aggiunti in P31. L'hook espone lettura, setter non-ottimistici e funzioni di reset per i gruppi Audio, Display, ScreenReader e TalkBack. Non rimangono dipendenze di produzione a `@github/spark/hooks` nei file migrati.
- `src/context/UserSettingsContext.tsx` espone via Provider tutti i 36 campi e wrapperizza `useUserSettings()` per i consumer React.
- `src/components/AudioSettings.tsx` migrato a Supabase (P31 Wave A).
- `src/components/DisplaySettings.tsx` migrato a Supabase (P31 Wave B).
- `src/components/ScreenReaderSettings.tsx` migrato a Supabase (P31 Wave C).
- `src/hooks/use-display-preferences.ts` è stato trasformato in un thin wrapper che ritorna `useUserSettings().displayPreferences`.
- `src/hooks/use-talkback.ts` è il wrapper reale usato per TalkBack (il piano originale menzionava `use-accessibility-preferences.ts` — il percorso reale è `src/hooks/use-talkback.ts`); è stato migrato a Supabase (P31 Wave C).
- `src/lib/sound-system.ts` ha rimosso tutti gli accessi diretti a `window.spark.kv` e ora riceve preferenze audio tramite callback iniettate da `useUserSettings()` al mount (pattern callback injection anziché `setSupabaseClient()`).
- Rimozione Spark KV: le chiamate/usa `useKV` presenti originariamente in `DisplaySettings`, `AudioSettings`, `ScreenReaderSettings`, `use-display-preferences` e `use-talkback` sono state eliminate. La tabella delle dipendenze Spark KV in produzione è stata aggiornata rimuovendo i file migrati.
- P30 (2026-05-03) ha completato il Blocco 6: `src/context/AppDataContext.tsx` non dipende più da `@github/spark/hooks`; `budgetPercentages` è una cache di sessione interna gestita con `useState<Record<string, number>>({})` e non è più esposta nella superficie pubblica del context.
- P34 (2026-05-03) ha completato il Blocco 7 per `src/components/DataManagement.tsx`: il Fronte B (export/import ordinario) usa `useAppData()` e i repository P26 invece del KV Spark; `window.location.reload()` è stato sostituito da `refreshAll()`. Rimane un Fronte A temporaneo di migrazione one-shot per gli utenti che hanno ancora dati storici Spark.
- Traguardo architetturale: per il perimetro dati di dominio e preferenze utente, non rimangono più dipendenze di produzione a `useKV` o `window.spark.kv`.

## Stato migrazione Spark → Supabase dopo P34

- `src/components/DataManagement.tsx` non usa più `window.spark.kv.*` nel flusso normale di backup e ripristino. L'export produce un file JSON strutturato `{ meta, accounts, transactions, budgets, savingsGoals }` a partire dai dati in memoria di `useAppData()`.
- L'import usa i repository Supabase di P26 con ordine FK corretto `conti → budget → obiettivi_risparmio → transazioni`, strategia best-effort e upsert semantico additivo/aggiornante.
- Il Rischio R7 descritto in P24 §7 è risolto: backup e ripristino operano ora sui dati Supabase, non sul KV Spark locale.
- Gli accessi residui a `window.spark.*` in `DataManagement.tsx` sono limitati al solo Fronte A temporaneo: rilevamento legacy via `keys()` e lettura delle 4 chiavi di dominio Spark per la migrazione one-shot. Questo residuo è destinato alla rimozione nel Blocco 10.

#### Strategie di caricamento dati (P28)

| Decisione | Scelta | Motivazione |
|---|---|---|
| **A — Strategia di caricamento** | Parallelo (`Promise.all` su 5 `getAll()`) | Tempo totale = chiamata più lenta; nessuna race condition tra entità correlate |
| **B — Loading state** | Spinner globale unico (`isLoading`) | Coerente con il parallelo; zero modifiche ai componenti consumatori |
| **C — Errori parziali** | Blocco totale su qualsiasi errore | Le 5 entità sono interdipendenti; uno stato parziale produce dati orfani in UI |

#### Migrazione one-shot categorie personalizzate (P33 Decisione B)

Al primo login post-distribuzione P33, se `categorie.getAll()` restituisce zero categorie
personalizzate, `AppDataContext` legge le categorie dal KV Spark (`window.spark.kv`), filtra
quelle con `predefinita: false` e le scrive su Supabase. Il flag
`preferences.legacy_categories_migrated` (tabella `impostazioni_utente`) previene la
riesecuzione al login successivo.

### Gate applicativi in `App.tsx`

Il rendering principale passa ora attraverso tre gate sequenziali:

1. `!isAuthReady` → `LoadingSpinner`
2. `!isAuthenticated` → `AuthScreen`
3. `needsOnboarding` → `OnboardingFlow`
4. `!isDataReady` → `LoadingSpinner`

Solo dopo questi quattro passaggi viene montata l'area applicativa completa.

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
