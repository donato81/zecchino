# P31 — Coding Plan: Migrazione UserPreferences SettingsTab (Display / Audio / Accessibilità) a Supabase

> Documento operativo.
> Fase: Plan → Code
> Pacchetto: P31 — Blocco 5 esteso (migrazione preferenze Display / Audio / ScreenReader / TalkBack)
> Design di riferimento: `docs/1 - projects/P31-migrazione-preferenze-display-audio-screenreader.md`
> Architettura di riferimento: `docs/1 - projects/P24-architettura-migrazione-supabase.md`
> Pattern di riferimento: `docs/2 - coding plans/P29-coding-plan.md`
> Branch: `refactoring-architettura`
> Data: 2026-05-03

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P29, P30, P33.
- ⚠️ **Perimetro dei file modificati (esistenti):** `src/components/DisplaySettings.tsx`, `src/hooks/use-display-preferences.ts`, `src/components/AudioSettings.tsx` (o `src/components/settings/AudioSettings.tsx`), `src/lib/sound-system.ts` (o `src/services/sound-system.ts`), `src/components/ScreenReaderSettings.tsx` (o `src/components/settings/ScreenReaderSettings.tsx`), `src/hooks/use-accessibility-preferences.ts` (o `src/hooks/use-talkback.ts`). Verifica i percorsi esatti prima di iniziare.
- ⚠️ **File protetti SCF:** i file sotto `.github/` non devono essere toccati in nessun caso.
- ⚠️ **Nessuna modifica a `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`** — salvo aggiornamenti imposti da nuovi import.
- ⚠️ **`budgetPercentages` rimane come `useKV`:** questa voce è rimasta in `AppDataContext` e la sua migrazione è compito del Blocco 6 (P30). Non rimuoverla in P31.
- ⚠️ **Aggiornamento non ottimistico:** tutte le operazioni di scrittura (setter delle preferenze) aggiornano lo stato locale **solo dopo** la conferma del repository, coerentemente con P28 §9 e P29 §8.7.
- ⚠️ **`sound-system.ts` è un singleton non-React:** non può usare hook React. Riceve il client Supabase come dipendenza iniettata, non tramite `useEffect` o context. Il meccanismo esatto va deciso nella Wave A.
- ⚠️ **Coordinamento chiavi condivise:** 12 chiavi `display-*` sono usate sia in `DisplaySettings.tsx` (writer) che in `use-display-preferences.ts` (reader). Devono essere migrate nella stessa wave atomicamente. Le 2 chiavi `audio-*` sono usate sia in `AudioSettings.tsx` (via `useKV`) che in `sound-system.ts` (via `window.spark.kv` diretto). Anche queste devono essere migrate nella stessa wave.

---

## Obiettivo

Migrare le 40 chiamate `useKV` e 4 accessi diretti `window.spark.kv` presenti in 5 file React/hook + 1 singleton non-React a `useUserSettings()` + Supabase, eliminando ogni dipendenza da `@github/spark/hooks` nei file di impostazioni Display, Audio e ScreenReader.

---

## Contesto e dipendenze

### Collegamento a P29

P29 ha creato `useUserSettings()` e `UserSettingsContext` per gestire le preferenze di navigazione (`visibleCategories`, `dismissedBudgetAlerts`). P31 **estende la superficie pubblica di `useUserSettings()`** aggiungendo 28 nuove preferenze in 4 categorie semantiche: Display (12), Audio (2), ScreenReader (12), TalkBack (2).

L'infrastruttura è identica: stesso hook `useUserSettings()`, stesso repository `impostazioni-utente` (P26 §7.6), stesso schema `preferences JSONB` di P25. P31 non crea nuovo codice infrastrutturale; aggiunge campi e setter al hook già esistente.

### Stato attuale dei 5 file in scope (Spark KV)

| File | Dipendenza attuale | Chiamate da eliminare | Tipo |
|---|---|---|---|
| `src/components/DisplaySettings.tsx` | `useKV` da `@github/spark/hooks` | 12 | React hook |
| `src/hooks/use-display-preferences.ts` | `useKV` da `@github/spark/hooks` | 12 | React hook |
| `src/components/AudioSettings.tsx` | `useKV` da `@github/spark/hooks` | 2 | React hook |
| `src/lib/sound-system.ts` | `window.spark.kv.get/set` diretto | 4 | Accesso diretto (singleton) |
| `src/components/ScreenReaderSettings.tsx` | `useKV` da `@github/spark/hooks` | 12 | React hook |
| `src/hooks/use-accessibility-preferences.ts` (o `use-talkback.ts`) | `useKV` da `@github/spark/hooks` | 2 | React hook |
| **Totale** | — | **44** | — |

> **Nota:** i percorsi `src/components/AudioSettings.tsx`, `src/components/ScreenReaderSettings.tsx`, `src/lib/sound-system.ts` e `src/hooks/use-accessibility-preferences.ts` sono percorsi verificabili. Se il progetto usa `src/components/settings/` come prefisso o `src/services/` per `sound-system.ts`, adattare i percorsi nei passi operativi.

---

## Decisioni architetturali (vincolanti — non rimesse in discussione)

| ID | Decisione | Fonte | Effetto pratico |
|---|---|---|---|
| **A** | **Tre wave separate** — Wave A (Audio) → Wave B (Display) → Wave C (ScreenReader+TalkBack) | P31 §5.3 | Ogni wave ha il proprio ciclo build/test. Wave A valida il pattern con 2 chiavi prima di scalare a 12+12 nella Wave B. Nessuna chiave è a metà migrazione tra una wave e l'altra. |
| **B** | **API esplicita e tipizzata su `useUserSettings()`** — raggruppata per categoria | P31 §6.3 | `displayPreferences: DisplayPreferences` + `setDisplayPreference(key, value)`; `audioEnabled`, `audioVolume` + setter individuali; `screenReaderPreferences: ScreenReaderPreferences` + `setScreenReaderPreference(key, value)`; `talkBackAdaptations`, `talkBackManualOverride` + setter. Coerente con P29 §4 (valori espliciti nominati, non API generica `getPreference`). |
| **C** | **Migrazione one-shot al primo accesso** per utenti con preferenze Spark esistenti | P31 §7.4 | Al primo login post-P31, se le chiavi `display-*`/`audio-*`/`sr-*`/`talkback-*` sono assenti nel JSONB Supabase, `useUserSettings()` le legge dal KV store Spark e le scrive su Supabase in batch. Il meccanismo esatto va deciso nella Wave A. |
| **D** | **`sound-system.ts` riceve il client Supabase come dipendenza iniettata** — non tramite hook | P31 §9.3, P24 R5 | Il singleton espone un metodo `setSupabaseClient(client)` (o equivalente) chiamato da `useUserSettings()` al mount. Non deve usare `useContext` né `useEffect`. Il meccanismo esatto è un punto aperto della Wave A. |

---

## File creati

| File | Descrizione |
|---|---|
| `docs/2 - coding plans/P31-coding-plan.md` | Questo documento |
| `docs/3 - todo lists/P31-todo.md` | Todo specifico P31 |

## File modificati (per wave)

### Wave A
| File | Modifica |
|---|---|
| `src/components/AudioSettings.tsx` | Sostituzione 2 `useKV` con `audioEnabled`/`audioVolume` da `useUserSettings()`; aggiunta logica migrazione one-shot |
| `src/lib/sound-system.ts` | Eliminazione 4 accessi `window.spark.kv`; aggiunta iniezione client Supabase |
| `src/hooks/use-user-settings.ts` | Aggiunta di `audioEnabled`, `audioVolume`, `setAudioEnabled`, `setAudioVolume` alla superficie pubblica |

### Wave B
| File | Modifica |
|---|---|
| `src/components/DisplaySettings.tsx` | Sostituzione 12 `useKV` con `displayPreferences` + `setDisplayPreference` da `useUserSettings()` |
| `src/hooks/use-display-preferences.ts` | Trasformazione in thin wrapper di `useUserSettings().displayPreferences` |
| `src/hooks/use-user-settings.ts` | Aggiunta di `displayPreferences: DisplayPreferences` e `setDisplayPreference` alla superficie pubblica |

### Wave C
| File | Modifica |
|---|---|
| `src/components/ScreenReaderSettings.tsx` | Sostituzione 12 `useKV` con `screenReaderPreferences` + `setScreenReaderPreference` da `useUserSettings()` |
| `src/hooks/use-accessibility-preferences.ts` (o `use-talkback.ts`) | Sostituzione 2 `useKV` con `talkBackAdaptations`/`talkBackManualOverride` da `useUserSettings()` |
| `src/hooks/use-user-settings.ts` | Aggiunta di `screenReaderPreferences`, `setScreenReaderPreference`, `talkBackAdaptations`, `talkBackManualOverride` e setter TalkBack |

## File invariati

| File / Area | Motivazione |
|---|---|
| `src/hooks/use-user-settings.ts` (struttura base) | Esteso ma non ristrutturato; le 8 voci P29 rimangono invariate |
| `src/context/UserSettingsContext.tsx` | Aggiornato solo per esporre i nuovi campi P31 dal hook; nessuna ristrutturazione |
| `src/lib/supabase.ts` | Client condiviso — importato ma non modificato |
| `src/context/AuthContext.tsx` | Invariato — continua a esporre `userSettings` come stabilito da P27 |
| `src/context/AppDataContext.tsx` | Invariato — `budgetPercentages` rimane `useKV` fino a P30 implementazione |
| `src/test/smoke/test-utils.ts` | Aggiornato solo per i mock delle nuove chiavi (se i test falliscono per assenza delle nuove voci nella superficie di `useUserSettings`) |
| `.github/**` | Protetto da `framework-guard.instructions.md` |

---

## Schema riepilogativo delle operazioni

```
P31 — Migrazione preferenze Display / Audio / ScreenReader / TalkBack
│
├── Prerequisiti
│   ├── PR0: useUserSettings() espone gli 8 valori P29 §4 (baseline post-P29)
│   │   └── grep -n "visibleCategories\|dismissedBudgetAlerts" src/hooks/use-user-settings.ts
│   ├── PR1: Repository impostazioni-utente P26 espone updatePreference
│   │   └── grep -n "updatePreference" src/lib/supabase/repositories/impostazioni-utente.ts
│   ├── PR2: Baseline build+test pre-P31
│   │   └── npm run build && npm run test:run
│   └── PR3: Verifica percorsi esatti dei 5 file in scope
│       └── ls src/components/DisplaySettings.tsx src/components/AudioSettings.tsx
│           src/components/ScreenReaderSettings.tsx src/lib/sound-system.ts
│           src/hooks/use-display-preferences.ts src/hooks/use-accessibility-preferences.ts
│
├── WAVE A — Audio (2 chiavi + 1 singleton)
│   ├── WA1: Estendere useUserSettings() con audioEnabled, audioVolume, setAudioEnabled, setAudioVolume
│   ├── WA2: Implementare migrazione one-shot Spark→Supabase per chiavi audio-*
│   ├── WA3: Aggiornare AudioSettings.tsx (2 useKV → useUserSettings)
│   ├── WA4: Aggiungere iniezione client Supabase in sound-system.ts (eliminare 4 window.spark.kv)
│   └── Gate A: build exit 0; test passed; grep "window.spark.kv" src/lib/sound-system.ts → 0 righe
│
├── WAVE B — Display (12+12 chiavi)
│   ├── WB1: Estendere useUserSettings() con displayPreferences: DisplayPreferences e setDisplayPreference
│   ├── WB2: Aggiornare DisplaySettings.tsx (12 useKV → useUserSettings)
│   ├── WB3: Trasformare use-display-preferences.ts in thin wrapper
│   └── Gate B: build exit 0; test passed; grep "useKV" src/components/DisplaySettings.tsx → 0 righe
│
├── WAVE C — ScreenReader + TalkBack (12+2 chiavi)
│   ├── WC1: Estendere useUserSettings() con screenReaderPreferences, setScreenReaderPreference,
│   │        talkBackAdaptations, talkBackManualOverride e setter
│   ├── WC2: Aggiornare ScreenReaderSettings.tsx (12 useKV → useUserSettings)
│   ├── WC3: Aggiornare use-accessibility-preferences.ts (2 useKV → useUserSettings)
│   └── Gate C: build exit 0; test passed; grep "useKV" src/components/ScreenReaderSettings.tsx → 0 righe
│
└── Gate finale P31
    ├── build exit 0; test passed; tsc 0 errori
    ├── grep "@github/spark/hooks" src/components/DisplaySettings.tsx → 0 righe
    ├── grep "@github/spark/hooks" src/components/AudioSettings.tsx → 0 righe
    ├── grep "@github/spark/hooks" src/components/ScreenReaderSettings.tsx → 0 righe
    ├── grep "window.spark.kv" src/lib/sound-system.ts → 0 righe
    ├── grep "useKV" src/hooks/use-display-preferences.ts → 0 righe
    ├── grep "useKV" src/hooks/use-accessibility-preferences.ts → 0 righe
    └── git diff --name-only HEAD | grep ".github" → output vuoto
```

---

## Piano operativo dettagliato

### Prerequisiti — Prima di scrivere codice

#### PR0 — Baseline post-P29: `useUserSettings()` espone gli 8 valori P29 §4

```bash
grep -n "visibleCategories\|dismissedBudgetAlerts\|setVisibleCategories\|dismissBudgetAlert\|resetDismissedAlerts\|isSettingsReady\|isSettingsLoading\|settingsError" src/hooks/use-user-settings.ts
```

Atteso: tutte le 8 voci presenti.

#### PR1 — Repository `impostazioni-utente` espone `updatePreference`

```bash
grep -n "updatePreference\|getOrCreate" src/lib/supabase/repositories/impostazioni-utente.ts
```

Atteso: export di `getOrCreate` e `updatePreference`.

#### PR2 — Baseline build e test pre-P31

```bash
npm run build && npm run test:run
```

Atteso: build exit 0; test 01–04 passed.

#### PR3 — Verifica percorsi esatti dei file in scope

Prima di procedere, verifica che i percorsi dei 5 file sorgente corrispondano esattamente a quelli attesi. Se differiscono (es. `src/components/settings/AudioSettings.tsx` invece di `src/components/AudioSettings.tsx`), documenta la discrepanza e adatta tutti i passi successivi.

---

### Wave A — Audio

#### Razionale

Wave A è il perimetro minimo (2 chiavi `useKV` + 4 accessi diretti `window.spark.kv`). Ha due obiettivi: (1) validare il flusso `updatePreference()` per valori `boolean` e `number`; (2) risolvere il Rischio R5 (P24 §8) — l'iniezione del client Supabase nel singleton `sound-system.ts` in isolamento, prima di scalare il pattern a 24 chiavi nelle wave successive.

#### File coinvolti

| File | Ruolo | Modifiche |
|---|---|---|
| `src/hooks/use-user-settings.ts` | Hook master — aggiornare | Aggiungere 2 campi + 2 setter + migrazione one-shot |
| `src/components/AudioSettings.tsx` | Writer audio — aggiornare | Sostituire 2 `useKV` con hook |
| `src/lib/sound-system.ts` | Singleton audio — aggiornare | Eliminare 4 accessi `window.spark.kv`; iniettare Supabase |

#### Campi da migrare (Wave A)

| Chiave Spark KV | Chiave JSONB | Tipo | Default |
|---|---|---|---|
| `audio-enabled` | `audio_enabled` | `boolean` | `true` |
| `audio-volume` | `audio_volume` | `number` (NUMERIC 4,3) | `0.3` |

#### Passi Wave A

**WA1 — Estendere `use-user-settings.ts`**

1. Aggiungere al tipo di ritorno del hook i 4 nuovi valori: `audioEnabled: boolean`, `audioVolume: number`, `setAudioEnabled: (v: boolean) => Promise<void>`, `setAudioVolume: (v: number) => Promise<void>`.
2. Aggiungere inizializzazione da `userSettings.preferences` con fallback ai default (`true`, `0.3`).
3. Implementare `setAudioEnabled` e `setAudioVolume` non ottimistici (stesso pattern di `setVisibleCategories` in P29): `isSettingsLoading = true` → `updatePreference(key, value)` → successo: aggiorna stato + `isSettingsLoading = false`; errore: NON aggiornare stato + `settingsError = messaggio`.
4. Aggiungere reset al logout (nel `useEffect` esistente su `isAuthenticated`): `audioEnabled = true`, `audioVolume = 0.3`.

**WA2 — Migrazione one-shot Spark → Supabase (Wave A)**

1. Determinare il meccanismo di rilevamento: la chiave `audio_enabled` è assente nel JSONB e nessun flag `legacy_migration_done` è presente.
2. Al primo accesso post-P31: leggere `window.spark.kv.get('audio-enabled')` e `window.spark.kv.get('audio-volume')`.
3. Se i valori Spark esistono e differiscono dai default, scrivere su Supabase in batch tramite `updatePreference`.
4. Documentare la lista di chiavi **escluse** dalla migrazione one-shot: `budget-percentages`, `visible-categories`, `dismissed-budget-alerts` (già gestite da P29 o non in `preferences` JSONB).
5. Gestire la chiave `talkback-adaptations` (JSONB annidato) nella Wave C; Wave A esclude le chiavi non-audio.

**WA3 — Aggiornare `AudioSettings.tsx`**

1. Aggiungere `import` di `useUserSettings` (dal percorso corretto).
2. Sostituire `const [audioEnabled, setAudioEnabledKV] = useKV<boolean>('audio-enabled', true)` con lettura da `useUserSettings()`: `const { audioEnabled, audioVolume, setAudioEnabled, setAudioVolume } = useUserSettings()`.
3. Sostituire `const [audioVolume, setAudioVolumeKV] = useKV<number>('audio-volume', 0.3)` — ora inclusa nel destructuring sopra.
4. Il layer `useState` locale (`localEnabled`, `localVolume`) rimane invariato: continua ad aggiornare `soundSystem` in tempo reale; la persistenza su Supabase avviene tramite i nuovi setter al debounce.
5. Negli handler che chiamavano i setter `useKV`, sostituire con i nuovi setter: `setAudioEnabled(v)` e `setAudioVolume(v)`.
6. Rimuovere `import { useKV } from '@github/spark/hooks'` se non usato altrove nel file.

**WA4 — Aggiornare `sound-system.ts` (iniezione Supabase)**

1. Analizzare i 4 accessi diretti: `window.spark.kv.get('audio-enabled')`, `window.spark.kv.get('audio-volume')`, `window.spark.kv.set('audio-enabled', ...)`, `window.spark.kv.set('audio-volume', ...)`.
2. Decidere il meccanismo di iniezione (punto aperto P31 §12): scegliere tra:
   - `soundSystem.setSupabaseClient(client)` + `soundSystem.setUserId(userId)` chiamati da `useUserSettings()` al mount.
   - Callback di get/set per le preferenze: `soundSystem.setPreferenceCallbacks({ getAudioEnabled, setAudioEnabled })` — disaccoppia il singleton da Supabase.
3. Implementare il meccanismo scelto, documentarlo in questo file nella sezione Note operative.
4. Sostituire i 4 accessi `window.spark.kv` con lettura/scrittura tramite il meccanismo scelto.
5. Verificare che il singleton rimanga istanziabile senza errori anche prima che `useUserSettings()` lo inizializzi (fallback ai default in-memory).

**Gate A**

```bash
npm run build            # exit 0
npm run test:run         # test 01–04 passed
npx tsc --noEmit         # 0 errori TypeScript
grep "window.spark.kv" src/lib/sound-system.ts   # 0 righe
grep "useKV" src/components/AudioSettings.tsx     # 0 righe
```

---

### Wave B — Display

#### Razionale

Wave B scala il pattern validato in Wave A alle 24 chiamate `useKV` in due file strettamente accoppiati (`DisplaySettings.tsx` writer + `use-display-preferences.ts` reader). La migrazione di questi due file deve essere atomica: se `DisplaySettings` scrive su Supabase e `use-display-preferences.ts` legge ancora da Spark KV, le sorgenti divergono.

#### File coinvolti

| File | Ruolo | Modifiche |
|---|---|---|
| `src/hooks/use-user-settings.ts` | Hook master — aggiornare | Aggiungere `displayPreferences` + `setDisplayPreference` |
| `src/components/DisplaySettings.tsx` | Writer display — aggiornare | Sostituire 12 `useKV` con hook |
| `src/hooks/use-display-preferences.ts` | Reader display — trasformare | Thin wrapper di `useUserSettings().displayPreferences` |

#### Campi da migrare (Wave B)

| Chiave Spark KV | Chiave JSONB | Tipo | Default | Consumatori |
|---|---|---|---|---|
| `display-show-balances` | `display_show_balances` | `boolean` | `true` | DisplaySettings (R/W) + use-display-preferences (R) |
| `display-show-account-icons` | `display_show_account_icons` | `boolean` | `true` | DisplaySettings (R/W) + use-display-preferences (R) |
| `display-compact-mode` | `display_compact_mode` | `boolean` | `false` | DisplaySettings (R/W) + use-display-preferences (R) |
| `display-show-categories` | `display_show_categories` | `boolean` | `true` | DisplaySettings (R/W) + use-display-preferences (R) |
| `display-animations-enabled` | `display_animations_enabled` | `boolean` | `true` | DisplaySettings (R/W) + use-display-preferences (R) |
| `display-font-size` | `display_font_size` | `number` (SMALLINT) | `100` | DisplaySettings (R/W) + use-display-preferences (R) |
| `display-currency-display` | `display_currency_display` | `'symbol' \| 'code' \| 'full'` | `'symbol'` | DisplaySettings (R/W) + use-display-preferences (R) |
| `display-number-format` | `display_number_format` | `'standard' \| 'compact'` | `'standard'` | DisplaySettings (R/W) + use-display-preferences (R) |
| `display-high-contrast` | `display_high_contrast` | `boolean` | `false` | DisplaySettings (R/W) + use-display-preferences (R) |
| `display-show-percentages` | `display_show_percentages` | `boolean` | `true` | DisplaySettings (R/W) + use-display-preferences (R) |
| `display-show-transaction-icons` | `display_show_transaction_icons` | `boolean` | `true` | DisplaySettings (R/W) + use-display-preferences (R) |
| `display-reduce-motion` | `display_reduce_motion` | `boolean` | `false` | DisplaySettings (R/W) + use-display-preferences (R) |

#### Passi Wave B

**WB1 — Estendere `use-user-settings.ts`**

1. Importare o referenziare l'interfaccia `DisplayPreferences` da `use-display-preferences.ts` (riutilizzarla come tipo nella superficie del hook — Decisione B §6.3).
2. Aggiungere al tipo di ritorno: `displayPreferences: DisplayPreferences`, `setDisplayPreference: (key: keyof DisplayPreferences, value: DisplayPreferences[keyof DisplayPreferences]) => Promise<void>`.
3. Inizializzare `displayPreferences` da `userSettings.preferences` con fallback ai 12 default (stessi valori dei `useKV` originali).
4. Implementare `setDisplayPreference(key, value)` non ottimistico: `isSettingsLoading = true` → `updatePreference(key, value)` → successo: `setDisplayPreferencesState(prev => ({ ...prev, [key]: value }))`, `isSettingsLoading = false`; errore: NON aggiornare stato, `settingsError = messaggio`.
5. Aggiungere migrazione one-shot per le 12 chiavi `display-*` (stesso meccanismo Wave A, ampliato).
6. Aggiungere reset al logout.

**WB2 — Aggiornare `DisplaySettings.tsx`**

1. Aggiungere `import` di `useUserSettings`.
2. Sostituire le 12 chiamate `useKV` con un singolo destructuring: `const { displayPreferences, setDisplayPreference, isSettingsLoading } = useUserSettings()`.
3. In ogni handler (toggle, slider, select): sostituire il setter `useKV` con `setDisplayPreference(chiave_jsonb, nuovoValore)`.
4. Gli handler `handleToggle`, `handleFontSizeChange`, `handleCurrencyDisplayChange`, `handleNumberFormatChange` rimangono invariati nella logica UI (toast, screen reader announce, soundSystem.play); cambia solo il target di persistenza.
5. Usare `isSettingsLoading` per disabilitare i controlli durante il salvataggio (se già presente nel componente).
6. Rimuovere `import { useKV } from '@github/spark/hooks'`.

**WB3 — Trasformare `use-display-preferences.ts` in thin wrapper**

1. Rimuovere le 12 chiamate `useKV`.
2. Aggiungere `import` di `useUserSettings`.
3. Il corpo del hook diventa: `return useUserSettings().displayPreferences`.
4. L'interfaccia esportata `DisplayPreferences` rimane invariata: tutti i consumer esistenti (componenti che chiamano `useDisplayPreferences()`) continuano a funzionare senza modifiche.
5. Rimuovere `import { useKV } from '@github/spark/hooks'`.

**Gate B**

```bash
npm run build            # exit 0
npm run test:run         # test 01–04 passed
npx tsc --noEmit         # 0 errori TypeScript
grep "useKV" src/components/DisplaySettings.tsx        # 0 righe
grep "useKV" src/hooks/use-display-preferences.ts     # 0 righe
grep "@github/spark/hooks" src/components/DisplaySettings.tsx # 0 righe
```

---

### Wave C — ScreenReader + TalkBack

#### Razionale

Wave C copre il gruppo di accessibilità: 12 chiavi `sr-*` in `ScreenReaderSettings.tsx` e 2 chiavi `talkback-*` in `use-accessibility-preferences.ts` (o `use-talkback.ts`). `ScreenReaderSettings.tsx` ha il layer `useState` locale più articolato — 12 variabili `local*` con 12 `useEffect` corrispondenti. La ristrutturazione di questo layer è un punto di attenzione; il design doc P31 §9.4 suggerisce che con una sorgente unica (`useUserSettings()`) i 12 `useEffect` di sincronizzazione al KV non sono più necessari. L'implementatore ha discrezionalità sulla semplificazione, purché il comportamento esterno rimanga invariato.

#### File coinvolti

| File | Ruolo | Modifiche |
|---|---|---|
| `src/hooks/use-user-settings.ts` | Hook master — aggiornare | Aggiungere `screenReaderPreferences`, `talkBackAdaptations`, `talkBackManualOverride` + setter |
| `src/components/ScreenReaderSettings.tsx` | Writer SR — aggiornare | Sostituire 12 `useKV` con hook; aggiornare `handleResetToDefaults` |
| `src/hooks/use-accessibility-preferences.ts` | Writer TalkBack — aggiornare | Sostituire 2 `useKV` con hook |

#### Campi da migrare (Wave C — ScreenReader)

| Chiave Spark KV | Chiave JSONB | Tipo | Default | Consumatori |
|---|---|---|---|---|
| `sr-verbosity` | `sr_verbosity` | `'conciso' \| 'normale' \| 'verboso'` | `'normale'` | Solo ScreenReaderSettings |
| `sr-announce-navigation` | `sr_announce_navigation` | `boolean` | `true` | Solo ScreenReaderSettings |
| `sr-announce-filters` | `sr_announce_filters` | `boolean` | `true` | Solo ScreenReaderSettings |
| `sr-announce-form-changes` | `sr_announce_form_changes` | `boolean` | `false` | Solo ScreenReaderSettings |
| `sr-announce-shortcuts` | `sr_announce_shortcuts` | `boolean` | `true` | Solo ScreenReaderSettings |
| `sr-announce-balance-changes` | `sr_announce_balance_changes` | `boolean` | `true` | Solo ScreenReaderSettings |
| `sr-announce-budget-alerts` | `sr_announce_budget_alerts` | `boolean` | `true` | Solo ScreenReaderSettings |
| `sr-announce-progress` | `sr_announce_progress` | `boolean` | `true` | Solo ScreenReaderSettings |
| `sr-announce-focus-changes` | `sr_announce_focus_changes` | `boolean` | `false` | Solo ScreenReaderSettings |
| `sr-announce-list-position` | `sr_announce_list_position` | `boolean` | `true` | Solo ScreenReaderSettings |
| `sr-announce-delay` | `sr_announce_delay` | `number` (SMALLINT) | `100` | Solo ScreenReaderSettings |
| `sr-reduced-announcements` | `sr_reduced_announcements` | `boolean` | `false` | Solo ScreenReaderSettings |

#### Campi da migrare (Wave C — TalkBack)

| Chiave Spark KV | Chiave JSONB | Tipo | Default | Consumatori |
|---|---|---|---|---|
| `talkback-adaptations` | `talkback_adaptations` | `TalkBackAdaptations` (JSONB, 8 booleani) | `DEFAULT_ADAPTATIONS` | Solo use-accessibility-preferences |
| `talkback-manual-override` | `talkback_manual_override` | `boolean \| null` | `null` | Solo use-accessibility-preferences |

> **Attenzione:** `talkback-adaptations` è un valore JSONB complesso (oggetto con 8 booleani). In fase di migrazione one-shot, deve essere correttamente deserializzato da Spark KV e validato prima della scrittura su Supabase.

#### Passi Wave C

**WC1 — Estendere `use-user-settings.ts`**

1. Definire o importare l'interfaccia `ScreenReaderPreferences` (12 campi) e `TalkBackAdaptations` (8 booleani) se non già esistenti.
2. Aggiungere al tipo di ritorno: `screenReaderPreferences: ScreenReaderPreferences`, `setScreenReaderPreference(key, value)`, `talkBackAdaptations: TalkBackAdaptations`, `talkBackManualOverride: boolean | null`, `setTalkBackAdaptations(obj: TalkBackAdaptations) => Promise<void>`, `setTalkBackManualOverride(v: boolean | null) => Promise<void>`, `resetScreenReaderPreferences() => Promise<void>`.
3. Inizializzare da `userSettings.preferences` con fallback ai default di P25 §3.4.
4. Implementare tutti i setter non ottimistici (stesso pattern Wave A/B).
5. `resetScreenReaderPreferences()`: scrive i 12 valori di default in batch tramite aggiornamento del JSONB; aggiorna lo stato locale solo a conferma.
6. Aggiungere migrazione one-shot per le 14 chiavi `sr-*` + `talkback-*`.
7. Gestire la deserializzazione di `talkback-adaptations` (JSONB): leggere da Spark KV, validare come oggetto con 8 campi booleani, scrivere su Supabase.
8. Aggiungere reset al logout.

**WC2 — Aggiornare `ScreenReaderSettings.tsx`**

1. Aggiungere `import` di `useUserSettings`.
2. Sostituire le 12 `useKV` con `const { screenReaderPreferences, setScreenReaderPreference, resetScreenReaderPreferences, isSettingsLoading } = useUserSettings()`.
3. Per ogni handler: sostituire setter `useKV` con `setScreenReaderPreference(chiave_jsonb, nuovoValore)`.
4. `handleResetToDefaults`: sostituire il reset manuale dei 12 `localState` con chiamata a `resetScreenReaderPreferences()`.
5. Il layer `useState` locale può essere semplificato (i 12 `useEffect` di sync al KV non sono più necessari con la sorgente unica) — a discrezione dell'implementatore, purché il comportamento esterno rimanga invariato.
6. Rimuovere `import { useKV } from '@github/spark/hooks'`.

**WC3 — Aggiornare `use-accessibility-preferences.ts` (o `use-talkback.ts`)**

1. Aggiungere `import` di `useUserSettings`.
2. Sostituire le 2 `useKV` con lettura da `useUserSettings()`: `const { talkBackAdaptations, talkBackManualOverride, setTalkBackAdaptations, setTalkBackManualOverride } = useUserSettings()`.
3. I setter `setAdaptations` e `setManualOverride` del hook delegano ai setter di `useUserSettings()`.
4. Lo stato transiente `talkBackState` (rilevamento automatico TalkBack, non persistito) rimane in `useState` locale invariato.
5. Rimuovere `import { useKV } from '@github/spark/hooks'`.

**Gate C**

```bash
npm run build            # exit 0
npm run test:run         # test 01–04 passed
npx tsc --noEmit         # 0 errori TypeScript
grep "useKV" src/components/ScreenReaderSettings.tsx                  # 0 righe
grep "useKV" src/hooks/use-accessibility-preferences.ts               # 0 righe
grep "@github/spark/hooks" src/components/ScreenReaderSettings.tsx    # 0 righe
```

---

## Schema Supabase — 28 campi P31 in `preferences JSONB`

Tutti i 28 campi sono già presenti in P25 §3.4. P31 non propone modifiche DDL alla tabella `impostazioni_utente`. La tabella è già in produzione con le colonne P29 (`visible_category_ids`, `dismissed_budget_alert_ids`).

| Chiave JSONB | Tipo SQL | Default | Wave |
|---|---|---|---|
| `audio_enabled` | `BOOLEAN` | `true` | A |
| `audio_volume` | `NUMERIC(4,3)` | `0.300` | A |
| `display_show_balances` | `BOOLEAN` | `true` | B |
| `display_show_account_icons` | `BOOLEAN` | `true` | B |
| `display_compact_mode` | `BOOLEAN` | `false` | B |
| `display_show_categories` | `BOOLEAN` | `true` | B |
| `display_animations_enabled` | `BOOLEAN` | `true` | B |
| `display_font_size` | `SMALLINT` | `100` | B |
| `display_currency_display` | `TEXT` | `'symbol'` | B |
| `display_number_format` | `TEXT` | `'standard'` | B |
| `display_high_contrast` | `BOOLEAN` | `false` | B |
| `display_show_percentages` | `BOOLEAN` | `true` | B |
| `display_show_transaction_icons` | `BOOLEAN` | `true` | B |
| `display_reduce_motion` | `BOOLEAN` | `false` | B |
| `sr_verbosity` | `TEXT` | `'normale'` | C |
| `sr_announce_navigation` | `BOOLEAN` | `true` | C |
| `sr_announce_filters` | `BOOLEAN` | `true` | C |
| `sr_announce_form_changes` | `BOOLEAN` | `false` | C |
| `sr_announce_shortcuts` | `BOOLEAN` | `true` | C |
| `sr_announce_balance_changes` | `BOOLEAN` | `true` | C |
| `sr_announce_budget_alerts` | `BOOLEAN` | `true` | C |
| `sr_announce_progress` | `BOOLEAN` | `true` | C |
| `sr_announce_focus_changes` | `BOOLEAN` | `false` | C |
| `sr_announce_list_position` | `BOOLEAN` | `true` | C |
| `sr_announce_delay` | `SMALLINT` | `100` | C |
| `sr_reduced_announcements` | `BOOLEAN` | `false` | C |
| `talkback_adaptations` | `JSONB` | `DEFAULT_ADAPTATIONS` (8 booleani) | C |
| `talkback_manual_override` | `BOOLEAN \| NULL` | `null` | C |

> **Nessun DDL necessario:** P25 §3.4 ha già definito questi campi. Verificare prima di implementare che la colonna `preferences` contenga già queste chiavi nel seed di default del database.

---

## Compatibilità Spark KV — Migrazione one-shot

### Logica

Al primo accesso post-distribuzione P31, `useUserSettings()` rileva l'assenza delle chiavi `display-*`, `audio-*`, `sr-*`, `talkback-*` nel JSONB Supabase (chiavi mancanti = utente con preferenze Spark esistenti, non ancora migrato).

In quel caso:
1. Leggere le 28 chiavi dal KV store Spark tramite `window.spark.kv.get(chiave)` per ciascuna.
2. Scrivere i valori recuperati su Supabase in batch tramite `updatePreferences(batch)` (P26 §7.6).
3. Al secondo accesso e successivi, le chiavi sono già presenti: nessuna logica di migrazione eseguita.

### Chiavi da migrare per wave

| Wave | Chiavi Spark KV da leggere | Chiave di rilevamento assenza |
|---|---|---|
| A | `audio-enabled`, `audio-volume` | Assenza di `audio_enabled` in `preferences` |
| B | `display-show-balances`, `display-show-account-icons`, `display-compact-mode`, `display-show-categories`, `display-animations-enabled`, `display-font-size`, `display-currency-display`, `display-number-format`, `display-high-contrast`, `display-show-percentages`, `display-show-transaction-icons`, `display-reduce-motion` | Assenza di `display_show_balances` in `preferences` |
| C | `sr-verbosity`, `sr-announce-navigation`, `sr-announce-filters`, `sr-announce-form-changes`, `sr-announce-shortcuts`, `sr-announce-balance-changes`, `sr-announce-budget-alerts`, `sr-announce-progress`, `sr-announce-focus-changes`, `sr-announce-list-position`, `sr-announce-delay`, `sr-reduced-announcements`, `talkback-adaptations`, `talkback-manual-override` | Assenza di `sr_verbosity` in `preferences` |

### Chiavi escluse dalla migrazione one-shot

Non scrivere su Supabase le seguenti chiavi Spark KV, anche se trovate nel KV store:
- `budget-percentages` (gestione P30 — non in `preferences` JSONB)
- `visible-categories` (gestione P29 — già migrato)
- `dismissed-budget-alerts` (gestione P29 — già migrato)
- `global-pin-hash` (gestione P27/P32 — non in `preferences` JSONB)

### Comportamento in caso di fallimento

Se la lettura dal KV store Spark fallisce o le chiavi non sono presenti (utente nuovo), usare i default di P25 §3.4 senza errore. L'utente non percepisce discontinuità.

---

## Criteri di accettazione

> Derivati da P31 §13. Verificabili al completamento di tutte e tre le wave.

### Eliminazione Spark KV

- [ ] `grep "@github/spark/hooks" src/components/DisplaySettings.tsx` → 0 righe
- [ ] `grep "@github/spark/hooks" src/components/AudioSettings.tsx` → 0 righe
- [ ] `grep "@github/spark/hooks" src/components/ScreenReaderSettings.tsx` → 0 righe
- [ ] `grep "useKV" src/hooks/use-display-preferences.ts` → 0 righe
- [ ] `grep "useKV" src/hooks/use-accessibility-preferences.ts` → 0 righe
- [ ] `grep "window.spark.kv" src/lib/sound-system.ts` → 0 righe

### Funzionalità hook

- [ ] `useUserSettings()` espone i 28 nuovi campi P31 in aggiunta agli 8 di P29
- [ ] `displayPreferences` contiene i 12 valori corretti deserializzati dal JSONB
- [ ] `audioEnabled` e `audioVolume` aggiornano `soundSystem` in tempo reale (via layer locale `AudioSettings.tsx`)
- [ ] `screenReaderPreferences` contiene i 12 valori corretti
- [ ] `talkBackAdaptations` viene deserializzato correttamente da JSONB (oggetto con 8 booleani)
- [ ] `resetScreenReaderPreferences()` ripristina i 12 default e persiste su Supabase

### Infrastruttura e qualità

- [ ] `npm run build` → exit 0
- [ ] `npm run test:run` → test 01–04 passed (documentare esito test 05 se pre-esistente)
- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] Aggiornamento non ottimistico confermato: il valore locale non cambia finché Supabase non conferma
- [ ] Reset al logout: `displayPreferences`, `audioEnabled`, `audioVolume`, `screenReaderPreferences`, `talkBackAdaptations` tornano ai default al logout
- [ ] Migrazione one-shot: preferenze Spark esistenti preservate al primo accesso post-distribuzione

### Protezioni

- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto
- [ ] `budgetPercentages` rimane come `useKV` in `AppDataContext` (non toccato)

---

## File di riferimento

| File | Percorso | Ruolo in P31 |
|---|---|---|
| Design P31 | `docs/1 - projects/P31-migrazione-preferenze-display-audio-screenreader.md` | Documento di design vincolante |
| Design P29 | `docs/1 - projects/P29-migrazione-usersettings-preferenze-ui.md` | Pattern di riferimento (infrastruttura già implementata) |
| Coding plan P29 | `docs/2 - coding plans/P29-coding-plan.md` | Formato e pattern operativi di riferimento |
| Hook master | `src/hooks/use-user-settings.ts` | Da estendere con 28 nuovi campi |
| Context | `src/context/UserSettingsContext.tsx` | Da aggiornare per esporre nuovi campi |
| DisplaySettings | `src/components/DisplaySettings.tsx` | Wave B — 12 `useKV` da migrare |
| Hook display | `src/hooks/use-display-preferences.ts` | Wave B — thin wrapper (12 `useKV` da eliminare) |
| AudioSettings | `src/components/AudioSettings.tsx` | Wave A — 2 `useKV` da migrare |
| Singleton audio | `src/lib/sound-system.ts` | Wave A — 4 `window.spark.kv` da eliminare; iniezione Supabase |
| ScreenReaderSettings | `src/components/ScreenReaderSettings.tsx` | Wave C — 12 `useKV` da migrare |
| Hook accessibilità | `src/hooks/use-accessibility-preferences.ts` | Wave C — 2 `useKV` da migrare |
| Client Supabase | `src/lib/supabase.ts` | Invariato — da importare nei file target |
| Repository impostazioni | `src/lib/supabase/repositories/impostazioni-utente.ts` | Invariato — usato tramite `updatePreference` |
| Test utils | `src/test/smoke/test-utils.ts` | Aggiornare mock `useUserSettings` se i test falliscono |
| Schema database | `docs/schema database supabase.md` | Consultazione — colonna `preferences JSONB` |
| PRD | `docs/PRD.md` | Consultazione — requisiti accessibilità |
