# P29 — Todo List: Migrazione useUserSettings e Preferenze UI

> Pacchetto 29 — Blocco 5 migrazione Spark→Supabase (preferenze UI)
> Piano di riferimento: `docs/2 - coding plans/P29-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P29-migrazione-usersettings-preferenze-ui.md`
> Branch: `refactoring-architettura`
> Data inizio: —
> Completato: 2026-05-03

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [x] |
| `npm run test:run` → test 01–04 passed | [x] |
| `npx tsc --noEmit` → 0 errori TypeScript | [x] |
| `grep useKV src/context/AppDataContext.tsx` → 1 sola voce (`budget-percentages`) | [x] |
| `useUserSettings()` espone gli 8 valori della superficie pubblica P29 §4 | [x] |
| Albero provider `App.tsx`: `AppDataProvider → UserSettingsProvider → VisibleDataProvider` | [x] |
| `use-visible-data.ts` legge preferenze da `useUserSettings()` (non da `useAppData()`) | [x] |
| Nessun file `.github/**` modificato | [x] |

---

## Prima di iniziare

- [x] Leggere integralmente il coding plan `docs/2 - coding plans/P29-coding-plan.md`
- [x] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)
- [x] Verificare che `npm run build` sia exit 0 (baseline pre-P29)
- [x] Verificare che `npm run test:run` → test 01–04 passed (baseline pre-P29)

---

## Prerequisiti operativi

- [x] **PR0** — Verificare che `AuthContext` esponga `userSettings` (record `UserSettings` da `getOrCreate()`)
  > Esito PR0: verificato
- [x] **PR1** — Verificare che il repository `impostazioni-utente` esponga `getOrCreate` e `updatePreference`
  > Esito PR1: verificato
- [x] **PR2** — Verificare `@supabase/supabase-js` in `package.json`
  > Esito PR2: verificato
- [x] **PR3** — Baseline build e test pre-P29
  > Esito PR3: build ok; test ok

---

## Passi completati

- [x] Creare `src/hooks/use-user-settings.ts` con stato locale, inizializzazione da `userSettings` e setter non ottimistici per `visibleCategories` e `dismissedBudgetAlerts`
- [x] Creare `src/context/UserSettingsContext.tsx` e provider dedicato
- [x] Aggiornare `src/context/AppDataContext.tsx` rimuovendo le preferenze UI migrate e lasciando `useKV` solo per `budgetPercentages`
- [x] Aggiornare `src/hooks/use-visible-data.ts` per leggere le preferenze da `useUserSettings()`
- [x] Aggiornare i consumer di toggle (`DashboardTab`, `use-app-shortcuts`) alla nuova API
- [x] Aggiornare `src/App.tsx` con `UserSettingsProvider` e nuova API `dismissBudgetAlert`
- [x] Aggiornare i mock smoke in `src/test/smoke/test-utils.ts`

---

## Gate finale H (= gate P29)

- [x] `npm run build` exit 0
- [x] `npm run test:run` → test 01–04 passed
- [x] `npx tsc --noEmit` → 0 errori TypeScript
- [x] `grep useKV src/context/AppDataContext.tsx` → 1 sola voce: `budget-percentages`
- [x] `useUserSettings()` espone gli 8 valori P29 §4
- [x] Albero provider `App.tsx`: `AppDataProvider → UserSettingsProvider → VisibleDataProvider`
- [x] `use-visible-data.ts` legge da `useUserSettings()`
- [x] `git diff --name-only HEAD | grep ".github"` → output vuoto

---

## Note operative

- Nessuna anomalia di perimetro rilevata durante implementazione e validazione.

---

## Chiusura

- Data di completamento implementazione: 2026-05-03
- Commit: `791b66d75409dfd7653fe779f0794e8059e73d6c`
- Gate finale: PASS
- Note operative: nessuna anomalia di perimetro
