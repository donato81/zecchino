# Report Analisi Post-Migrazione — Verifica Qualità Codice

**Data:** 4 maggio 2026
**Branch:** refactoring-architettura
**Tipo:** Sola lettura — analisi post-migrazione Spark → Supabase

***

## Sintesi esecutiva

**Semaforo:** GIALLO

Nessuna anomalia critica. La rimozione di Spark è completa e nessun import di test risiede nel codice di produzione. Restano 10 conversioni di tipo TypeScript (`as never` / `as unknown as`) fuori dai file di test: 2 strutturali e accettabili, 8 minori che indicano disallineamenti del sistema dei tipi rispetto allo schema reale (chiavi di preferenze e tipi accounts). Non bloccano il test manuale, ma vanno tracciate come debito tecnico tipi.

***

## Punto 1 — Tracce residue di Spark

### Anomalie critiche

Nessuna.

### Esito

PULITO — nessuna occorrenza di `@github/spark`, `window.spark`, `sparkKvMock`, `resetTestKvStore`, `seedTestKvStore` o `useKV` trovata nel perimetro di produzione (`src/App.tsx`, `src/main.tsx`, `src/ErrorFallback.tsx`, `src/context/`, `src/hooks/`, `src/components/`, `src/lib/`, `vite.config.ts`).

In [package.json](package.json#L2) sopravvive solo il valore `"name": "spark-template"`: è il nome storico del progetto npm, non una dipendenza Spark. Non rientra fra le stringhe da censurare ma è citato per trasparenza.

***

## Punto 2 — Conversioni di tipo sospette

Totale fuori dai file di test autorizzati: **10 occorrenze** in 3 file.

### Occorrenze giustificate

| File | Riga | Codice | Motivo |
|---|---|---|---|
| [src/hooks/use-user-settings.ts](src/hooks/use-user-settings.ts#L178) | 178 | `userSettings.preferences as unknown as Record<string, unknown>` | `preferences` è il payload JSONB Supabase con chiavi `snake_case` definite a runtime; l’hook le legge dinamicamente con bracket access. La doppia conversione è la forma corretta TypeScript per indicare una vista dinamica intenzionale di un tipo strutturato. Il rischio è limitato: ogni accesso che segue è protetto da `typeof`/`Array.isArray`/`isTalkBackAdaptations`. |
| [src/hooks/use-user-settings.ts](src/hooks/use-user-settings.ts#L304) | 304 | `await updatePreference(displayKeyMap[key] as never, value)` (Wave B Display) | All’interno di `setDisplayPreference<K extends keyof DisplayPreferences>` il valore di `displayKeyMap[key]` è una `string` letterale ma TS non infierisce singletoni; `updatePreference` esige `keyof UserPreferences`. Il cast veicola un sottoinsieme noto e statico di chiavi mappate 1:1 dalle costanti del file: il rischio runtime è nullo finché le mappe restano invariate. |

### Occorrenze sospette

| File | Riga | Codice | Rischio |
|---|---|---|---|
| [src/hooks/use-user-settings.ts](src/hooks/use-user-settings.ts#L232) | 232 | `await updatePreference('visible_category_ids' as never, ids)` | La chiave letterale non risulta presente in `keyof UserPreferences`, perciò serve `as never` per silenziare TS. Se la chiave venisse rinominata o rimossa nel tipo, TypeScript non lo segnalerebbe e la chiamata RPC fallirebbe solo a runtime con errore Supabase. Da rimediare aggiungendo la chiave al tipo `UserPreferences` o passando da una mappa tipizzata. |
| [src/hooks/use-user-settings.ts](src/hooks/use-user-settings.ts#L247) | 247 | `await updatePreference('dismissed_budget_alert_ids' as never, newIds)` | Stesso problema della riga 232: la chiave non è coperta da `keyof UserPreferences`. Stesso rischio: refactor sul tipo non si propaga al call site. |
| [src/hooks/use-user-settings.ts](src/hooks/use-user-settings.ts#L260) | 260 | `await updatePreference('dismissed_budget_alert_ids' as never, [])` | Stessa famiglia di rischio della riga 247: scrittura `reset` senza copertura tipi. |
| [src/hooks/use-user-settings.ts](src/hooks/use-user-settings.ts#L321) | 321 | `await updatePreference(srKeyMap[key] as never, value)` (Wave C SR) | Analogo a riga 304 ma su `srKeyMap`. Più rischioso perché la mappa screen-reader copre 12 chiavi e cresce con nuove preferenze; ogni nuova chiave richiederebbe sia l’aggiornamento della mappa sia del tipo `UserPreferences`, ma TS non lo impone. Un refuso nella mappa passerebbe silenziosamente. |
| [src/hooks/use-user-settings.ts](src/hooks/use-user-settings.ts#L365) | 365 | `updatePreference(srKeyMap[uiKey] as never, SR_DEFAULTS[uiKey])` | Stessa famiglia di rischio della riga 321, su flusso reset preferenze SR. |
| [src/components/ScreenReaderSettings.tsx](src/components/ScreenReaderSettings.tsx#L71) | 71 | `setScreenReaderPreference(key, newValue as never).catch(...)` | `setScreenReaderPreference<K extends keyof ScreenReaderPreferences>(key: K, value: ScreenReaderPreferences[K])` è generico ma il chiamante usa `keyof typeof screenReaderPreferences` con `newValue: boolean`: TS non riesce a unificare `K` e usa `as never` per forzare. Se in futuro un toggle finisse per puntare a una preferenza non booleana (es. `verbosityLevel`), il cast permetterebbe la chiamata e produrrebbe un valore di tipo errato salvato nelle preferenze. Da risolvere restringendo il tipo `key` a sole chiavi booleane. |
| [src/components/DashboardTab.tsx](src/components/DashboardTab.tsx#L71) | 71 | `groupedAccounts as unknown as FullAccountGroup[]` | `groupedAccounts` è `AccountGroup[]` dal contratto in [src/hooks/use-visible-data.ts](src/hooks/use-visible-data.ts#L17), ma il render lo tratta come `AccountCategoryInfo & { accounts: Account[] }`. La doppia conversione nasconde il fatto che `AccountGroup` non è dichiarato come estensione di `AccountCategoryInfo`. Se `AccountCategoryInfo` cambia (nuova proprietà obbligatoria) il render leggerà `undefined` senza che TS protesti. |
| [src/components/DashboardTab.tsx](src/components/DashboardTab.tsx#L72) | 72 | `filteredGroupedAccounts as unknown as FullAccountGroup[]` | Stesso pattern e stesso rischio della riga 71, applicato all’array filtrato. |

***

## Punto 3 — Dipendenze React incomplete

### Anomalie trovate

Nessuna.

`eslint-plugin-react-hooks` con regole `rules-of-hooks` ed `exhaustive-deps` è attivo come `warn` su tutto il workspace ([eslint.config.js](eslint.config.js#L57-L61)). L’ultima esecuzione di `npm run lint` ha restituito **0 warning** dopo le correzioni del ciclo precedente, includendo i tre `useCallback` introdotti in [src/context/AppDataContext.tsx](src/context/AppDataContext.tsx) e l’aggiunta di `applyDomainSnapshot` / `hydrateFromCache` all’array di dipendenze del bootstrap. Lo strumento copre tutti gli `useEffect`, `useCallback` e `useMemo` di `src/context/` e `src/hooks/`.

### Osservazioni (array vuoti da monitorare)

| File | Hook | Riga appross. | Nota |
|---|---|---|---|
| [src/hooks/use-user-settings.ts](src/hooks/use-user-settings.ts#L232) | `useCallback` di `setVisibleCategories`, `resetDismissedAlerts`, `setAudioEnabled`, `setAudioVolume`, `setDisplayPreference`, `setScreenReaderPreference`, `setTalkBackAdaptations`, `setTalkBackManualOverride`, `resetScreenReaderPreferences` | 232–375 | Tutti dichiarati con `[]`. Il corpo usa solo `setState` (riferimenti stabili) e `updatePreference` (import di modulo, stabile). Comportamento corretto. Da verificare se in futuro qualcuno aggiungesse una variabile esterna mutabile dentro al corpo: la regola `exhaustive-deps` lo intercetterebbe automaticamente. |

***

## Punto 4 — Import di test in produzione

### Anomalie trovate

Nessuna.

### Esito

PULITO. Tutti gli import di `@testing-library`, `vitest`, `./test-utils` e simili risultano confinati a `src/test/setup.ts`, `src/test/smoke/test-utils.ts`, `src/test/smoke/0?-*.test.tsx` e `src/test/unit/*.test.ts`. Nessun file dentro `src/App.tsx`, `src/main.tsx`, `src/ErrorFallback.tsx`, `src/context/`, `src/hooks/`, `src/components/` o `src/lib/` importa moduli di test, mock o fixture, e nessun import nel perimetro di produzione referenzia percorsi contenenti `test`, `mock`, `stub`, `__mocks__`, `setup`, `fixtures`, `fake`, `dummy`.

***

## Riepilogo finale

| Livello | Punto 1 | Punto 2 | Punto 3 | Punto 4 |
|---|---|---|---|---|
| Critiche | 0 | 0 | 0 | 0 |
| Minori | 0 | 8 | 0 | 0 |
| Osservazioni | 0 | 2 | 1 | 0 |

**Verdetto:** PRONTO PER TEST MANUALE — nessuna anomalia critica. Le 8 occorrenze minori del Punto 2 vanno tracciate come debito tecnico sui tipi `UserPreferences` e `AccountGroup`, ma non compromettono l’esecuzione runtime né il flusso utente.

***

## Punti aperti e raccomandazioni

1. **Allineare `UserPreferences` allo schema reale.** Le 5 chiavi forzate con `as never` in [src/hooks/use-user-settings.ts](src/hooks/use-user-settings.ts) (`visible_category_ids`, `dismissed_budget_alert_ids`, l’insieme di `display_*` via `displayKeyMap`, l’insieme di `sr_*` via `srKeyMap`) suggeriscono che il tipo `UserPreferences` non riflette tutte le chiavi che il client scrive davvero su Supabase. Allargare il tipo eliminerebbe in un colpo solo 6 occorrenze sospette e ripristinerebbe la copertura statica sulle chiamate RPC.
2. **Rivedere il contratto `AccountGroup` ↔ `AccountCategoryInfo`.** Le due conversioni in [src/components/DashboardTab.tsx](src/components/DashboardTab.tsx#L71-L72) sono il sintomo di un’asimmetria: il render legge campi (`label`, `color`, `description`, `accounts`) che non risultano nel tipo restituito da [src/hooks/use-visible-data.ts](src/hooks/use-visible-data.ts#L17). O `AccountGroup` deve estendere `AccountCategoryInfo`, oppure il render deve riproiettare i campi mancanti tramite `ACCOUNT_TYPE_LABELS` / categorie. Una di queste due scelte va presa esplicitamente.
3. **Restringere il toggle SR.** In [src/components/ScreenReaderSettings.tsx](src/components/ScreenReaderSettings.tsx#L71) il parametro `key` dovrebbe essere ristretto al sotto-insieme delle chiavi booleane di `ScreenReaderPreferences`. Eliminerebbe il `as never` e impedirebbe a un futuro toggle di colpire una chiave non booleana.
4. **Consolidare il check `react-hooks/exhaustive-deps`.** La regola è attualmente impostata su `warn`; valutare il passaggio a `error` (Fase B) ora che il codebase è a 0 warning, così da congelare la conformità.
5. **Tag `package.json`.** Il valore `"name": "spark-template"` è ereditato dal template originale. Non è una dipendenza Spark, ma può creare confusione nelle scansioni future: se non c’è un vincolo esterno (deploy, registry), rinominare il pacchetto in `zecchino` rimuoverebbe l’ultimo riferimento testuale a Spark dal progetto.
