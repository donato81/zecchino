# P31 — Todo: Migrazione UserPreferences SettingsTab (Display / Audio / Accessibilità) a Supabase

> Pacchetto P31 — Blocco 5 esteso: migrazione preferenze Display / Audio / ScreenReader / TalkBack
> Piano di riferimento: `docs/2 - coding plans/P31-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P31-migrazione-preferenze-display-audio-screenreader.md`
> Branch: `refactoring-architettura`
> Data inizio: —
> Completato: —

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [ ] |
| `npm run test:run` → test 01–04 passed | [ ] |
| `npx tsc --noEmit` → 0 errori TypeScript | [ ] |
| `grep "@github/spark/hooks" src/components/DisplaySettings.tsx` → 0 righe | [ ] |
| `grep "@github/spark/hooks" src/components/AudioSettings.tsx` → 0 righe | [ ] |
| `grep "@github/spark/hooks" src/components/ScreenReaderSettings.tsx` → 0 righe | [ ] |
| `grep "useKV" src/hooks/use-display-preferences.ts` → 0 righe | [ ] |
| `grep "useKV" src/hooks/use-accessibility-preferences.ts` → 0 righe | [ ] |
| `grep "window.spark.kv" src/lib/sound-system.ts` → 0 righe | [ ] |
| `useUserSettings()` espone i 28 nuovi campi P31 (verificare a vista) | [ ] |
| `budgetPercentages` rimane come `useKV` in `AppDataContext` (non toccato) | [ ] |
| `git diff --name-only HEAD \| grep ".github"` → output vuoto | [ ] |

---

## Prima di iniziare

- [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P31-coding-plan.md`
- [ ] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)
- [ ] Verificare che `npm run build` sia exit 0 (baseline pre-P31)
- [ ] Verificare che `npm run test:run` → test 01–04 passed (baseline pre-P31)

---

## Prerequisiti operativi

> Non iniziare la Wave A finché questi prerequisiti non sono verificati.

- [ ] **PR0** — Verificare che `useUserSettings()` esponga gli 8 valori P29 §4:
  ```bash
  grep -n "visibleCategories\|dismissedBudgetAlerts\|isSettingsReady" src/hooks/use-user-settings.ts
  ```
  > Esito PR0: ___________

- [ ] **PR1** — Verificare che il repository `impostazioni-utente` esponga `updatePreference`:
  ```bash
  grep -n "updatePreference\|getOrCreate" src/lib/supabase/repositories/impostazioni-utente.ts
  ```
  > Esito PR1: ___________

- [ ] **PR2** — Verifica percorsi esatti dei 6 file in scope:
  ```bash
  ls src/components/DisplaySettings.tsx src/components/AudioSettings.tsx src/components/ScreenReaderSettings.tsx
  ls src/lib/sound-system.ts src/hooks/use-display-preferences.ts src/hooks/use-accessibility-preferences.ts
  ```
  > Se alcuni percorsi differiscono (es. `src/components/settings/`, `src/services/`), documenta la variante e aggiorna i riferimenti nei task successivi.
  > Esito PR2: ___________

---

## Wave A — Audio

> Prerequisito: prerequisiti PR0–PR2 verificati.
> Perimetro: 2 chiavi `useKV` in `AudioSettings.tsx` + 4 accessi diretti `window.spark.kv` in `sound-system.ts`.
> Obiettivo: validare il pattern `updatePreference()` e risolvere R5 (iniezione Supabase nel singleton).

### WA1 — Estendere `src/hooks/use-user-settings.ts` (campi audio)

- [ ] Aggiungere `audioEnabled: boolean` al tipo di ritorno del hook
- [ ] Aggiungere `audioVolume: number` al tipo di ritorno del hook
- [ ] Aggiungere `setAudioEnabled: (v: boolean) => Promise<void>` al tipo di ritorno
- [ ] Aggiungere `setAudioVolume: (v: number) => Promise<void>` al tipo di ritorno
- [ ] Dichiarare stato locale: `const [audioEnabled, setAudioEnabledState] = useState<boolean>(true)`
- [ ] Dichiarare stato locale: `const [audioVolume, setAudioVolumeState] = useState<number>(0.3)`
- [ ] Inizializzare da `userSettings.preferences.audio_enabled` con fallback a `true`
- [ ] Inizializzare da `userSettings.preferences.audio_volume` con fallback a `0.3`
- [ ] Implementare `setAudioEnabled(v)` non ottimistico: `isSettingsLoading = true` → `updatePreference('audio_enabled', v)` → successo: `setAudioEnabledState(v)`, loading false; errore: NON aggiornare stato, `settingsError = messaggio`
- [ ] Implementare `setAudioVolume(v)` non ottimistico (stesso pattern)
- [ ] Aggiungere reset al logout nel `useEffect` esistente: `audioEnabled = true`, `audioVolume = 0.3`
- [ ] Aggiungere `audioEnabled`, `audioVolume`, `setAudioEnabled`, `setAudioVolume` al valore restituito dal hook

### WA2 — Migrazione one-shot Spark → Supabase (Wave A)

- [ ] Implementare rilevamento assenza chiave: verificare se `preferences.audio_enabled` è assente nel record `userSettings` (utente con preferenze Spark esistenti)
- [ ] Se assente: leggere `window.spark.kv.get('audio-enabled')` — se valore trovato, prepararlo per la scrittura
- [ ] Se assente: leggere `window.spark.kv.get('audio-volume')` — se valore trovato, prepararlo per la scrittura
- [ ] Scrivere i valori recuperati su Supabase tramite `updatePreference` (o batch se disponibile)
- [ ] Documentare nel coding plan le chiavi **escluse** dalla migrazione one-shot (`budget-percentages`, `visible-categories`, `dismissed-budget-alerts`, `global-pin-hash`)
- [ ] Gestire il caso fallimento KV: usare default senza errore

### WA3 — Aggiornare `src/components/AudioSettings.tsx`

- [ ] Aggiungere `import` di `useUserSettings` dal percorso corretto
- [ ] Rimuovere `const [audioEnabled, setAudioEnabledKV] = useKV<boolean>('audio-enabled', true)`
- [ ] Rimuovere `const [audioVolume, setAudioVolumeKV] = useKV<number>('audio-volume', 0.3)`
- [ ] Aggiungere destructuring: `const { audioEnabled, audioVolume, setAudioEnabled, setAudioVolume } = useUserSettings()`
- [ ] Il layer `useState` locale (`localEnabled`, `localVolume`) rimane invariato
- [ ] Sostituire le chiamate al setter `useKV` di `audio-enabled` con `setAudioEnabled(v)` negli handler
- [ ] Sostituire le chiamate al setter `useKV` di `audio-volume` con `setAudioVolume(v)` negli handler
- [ ] Rimuovere `import { useKV } from '@github/spark/hooks'` se non usato altrove nel file

### WA4 — Aggiornare `src/lib/sound-system.ts` (iniezione Supabase)

- [ ] Analizzare i 4 accessi diretti: `window.spark.kv.get('audio-enabled')`, `window.spark.kv.get('audio-volume')`, `window.spark.kv.set('audio-enabled', ...)`, `window.spark.kv.set('audio-volume', ...)`
- [ ] Decidere e documentare il meccanismo di iniezione (scegliere tra: `setSupabaseClient(client) + setUserId(id)` oppure `setPreferenceCallbacks({ get, set })`)
- [ ] Implementare il metodo di iniezione scelto nella classe singleton
- [ ] Sostituire `window.spark.kv.get('audio-enabled')` con lettura tramite meccanismo iniettato
- [ ] Sostituire `window.spark.kv.get('audio-volume')` con lettura tramite meccanismo iniettato
- [ ] Sostituire `window.spark.kv.set('audio-enabled', ...)` con scrittura tramite meccanismo iniettato
- [ ] Sostituire `window.spark.kv.set('audio-volume', ...)` con scrittura tramite meccanismo iniettato
- [ ] Aggiungere in `useUserSettings()` la chiamata al metodo di iniezione al mount (con le credenziali Supabase necessarie)
- [ ] Verificare che il singleton rimanga istanziabile senza errori prima dell'iniezione (fallback ai default in-memory)

### Gate A

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → test 01–04 passed
- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] `grep "window.spark.kv" src/lib/sound-system.ts` → 0 righe
- [ ] `grep "useKV" src/components/AudioSettings.tsx` → 0 righe

---

## Wave B — Display

> Prerequisito: Gate A verificato.
> Perimetro: 12 `useKV` in `DisplaySettings.tsx` (writer) + 12 `useKV` in `use-display-preferences.ts` (reader). Migrazione atomica: i due file devono essere aggiornati insieme.

### WB1 — Estendere `src/hooks/use-user-settings.ts` (campi display)

- [ ] Importare o referenziare l'interfaccia `DisplayPreferences` da `use-display-preferences.ts`
- [ ] Aggiungere `displayPreferences: DisplayPreferences` al tipo di ritorno del hook
- [ ] Aggiungere `setDisplayPreference: (key: keyof DisplayPreferences, value: DisplayPreferences[keyof DisplayPreferences]) => Promise<void>` al tipo di ritorno
- [ ] Dichiarare stato locale: `const [displayPreferences, setDisplayPreferencesState] = useState<DisplayPreferences>(defaultDisplayPreferences)`
- [ ] Definire `defaultDisplayPreferences` con i 12 valori di default (stessi dei `useKV` originali)
- [ ] Inizializzare da `userSettings.preferences` con fallback ai 12 default
- [ ] Implementare `setDisplayPreference(key, value)` non ottimistico: `isSettingsLoading = true` → `updatePreference(key_jsonb, value)` → successo: `setDisplayPreferencesState(prev => ({ ...prev, [key]: value }))`, loading false; errore: NON aggiornare stato, `settingsError = messaggio`
- [ ] Aggiungere migrazione one-shot per le 12 chiavi `display-*` (rilevamento assenza `display_show_balances` nel JSONB)
- [ ] Aggiungere reset al logout: `displayPreferences = defaultDisplayPreferences`
- [ ] Aggiungere `displayPreferences`, `setDisplayPreference` al valore restituito dal hook

### WB2 — Aggiornare `src/components/DisplaySettings.tsx`

- [ ] Aggiungere `import` di `useUserSettings` dal percorso corretto
- [ ] Rimuovere le 12 chiamate `useKV` (`display-show-balances`, `display-show-account-icons`, `display-compact-mode`, `display-show-categories`, `display-animations-enabled`, `display-font-size`, `display-currency-display`, `display-number-format`, `display-high-contrast`, `display-show-percentages`, `display-show-transaction-icons`, `display-reduce-motion`)
- [ ] Aggiungere destructuring: `const { displayPreferences, setDisplayPreference, isSettingsLoading } = useUserSettings()`
- [ ] Nell'handler `handleToggle` (o equivalente): sostituire le chiamate ai setter `useKV` con `setDisplayPreference('display_[campo]', nuovoValore)` per ciascuno dei campi booleani
- [ ] Nell'handler `handleFontSizeChange`: sostituire setter `useKV` con `setDisplayPreference('display_font_size', valore)`
- [ ] Nell'handler `handleCurrencyDisplayChange`: sostituire setter `useKV` con `setDisplayPreference('display_currency_display', valore)`
- [ ] Nell'handler `handleNumberFormatChange`: sostituire setter `useKV` con `setDisplayPreference('display_number_format', valore)`
- [ ] Aggiornare i riferimenti ai valori letti da `useKV` con `displayPreferences.[campo]` (es. `displayPreferences.display_show_balances` o il nome del campo nell'interfaccia)
- [ ] Usare `isSettingsLoading` per disabilitare i controlli durante il salvataggio (se già gestito nel componente)
- [ ] Rimuovere `import { useKV } from '@github/spark/hooks'`

### WB3 — Trasformare `src/hooks/use-display-preferences.ts` in thin wrapper

- [ ] Aggiungere `import` di `useUserSettings` dal percorso corretto
- [ ] Rimuovere le 12 chiamate `useKV` nel hook
- [ ] Sostituire il corpo del hook con: `return useUserSettings().displayPreferences`
- [ ] Verificare che l'interfaccia esportata `DisplayPreferences` rimanga invariata
- [ ] Verificare che tutti i consumer di `useDisplayPreferences()` continuino a funzionare senza modifiche
- [ ] Rimuovere `import { useKV } from '@github/spark/hooks'`

### Gate B

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → test 01–04 passed
- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] `grep "useKV" src/components/DisplaySettings.tsx` → 0 righe
- [ ] `grep "useKV" src/hooks/use-display-preferences.ts` → 0 righe
- [ ] `grep "@github/spark/hooks" src/components/DisplaySettings.tsx` → 0 righe

---

## Wave C — ScreenReader + TalkBack

> Prerequisito: Gate B verificato.
> Perimetro: 12 `useKV` in `ScreenReaderSettings.tsx` + 2 `useKV` in `use-accessibility-preferences.ts`.

### WC1 — Estendere `src/hooks/use-user-settings.ts` (campi ScreenReader + TalkBack)

- [ ] Definire o importare l'interfaccia `ScreenReaderPreferences` (12 campi `sr_*`)
- [ ] Definire o importare l'interfaccia `TalkBackAdaptations` (8 campi booleani)
- [ ] Aggiungere `screenReaderPreferences: ScreenReaderPreferences` al tipo di ritorno
- [ ] Aggiungere `setScreenReaderPreference: (key: keyof ScreenReaderPreferences, value: ScreenReaderPreferences[keyof ScreenReaderPreferences]) => Promise<void>` al tipo di ritorno
- [ ] Aggiungere `resetScreenReaderPreferences: () => Promise<void>` al tipo di ritorno
- [ ] Aggiungere `talkBackAdaptations: TalkBackAdaptations` al tipo di ritorno
- [ ] Aggiungere `talkBackManualOverride: boolean | null` al tipo di ritorno
- [ ] Aggiungere `setTalkBackAdaptations: (obj: TalkBackAdaptations) => Promise<void>` al tipo di ritorno
- [ ] Aggiungere `setTalkBackManualOverride: (v: boolean | null) => Promise<void>` al tipo di ritorno
- [ ] Dichiarare stato locale per `screenReaderPreferences` con i 12 valori default
- [ ] Dichiarare stato locale per `talkBackAdaptations` con `DEFAULT_ADAPTATIONS`
- [ ] Dichiarare stato locale per `talkBackManualOverride` con `null`
- [ ] Inizializzare da `userSettings.preferences` con fallback ai default di P25 §3.4
- [ ] Implementare `setScreenReaderPreference(key, value)` non ottimistico (stesso pattern Wave A/B)
- [ ] Implementare `resetScreenReaderPreferences()`: scrivere i 12 valori di default in batch; aggiornare stato locale solo a conferma
- [ ] Implementare `setTalkBackAdaptations(obj)` non ottimistico
- [ ] Implementare `setTalkBackManualOverride(v)` non ottimistico
- [ ] Aggiungere migrazione one-shot per le 12 chiavi `sr-*` (rilevamento assenza `sr_verbosity`)
- [ ] Aggiungere migrazione one-shot per le 2 chiavi `talkback-*` (rilevamento assenza `talkback_adaptations`)
- [ ] Gestire la deserializzazione di `talkback-adaptations` da Spark KV (JSONB con 8 booleani): validare struttura prima della scrittura su Supabase
- [ ] Aggiungere reset al logout: tutti i valori SR e TalkBack ai default
- [ ] Aggiungere tutti i nuovi campi e setter al valore restituito dal hook

### WC2 — Aggiornare `src/components/ScreenReaderSettings.tsx`

- [ ] Aggiungere `import` di `useUserSettings` dal percorso corretto
- [ ] Rimuovere le 12 chiamate `useKV` (`sr-verbosity`, `sr-announce-navigation`, `sr-announce-filters`, `sr-announce-form-changes`, `sr-announce-shortcuts`, `sr-announce-balance-changes`, `sr-announce-budget-alerts`, `sr-announce-progress`, `sr-announce-focus-changes`, `sr-announce-list-position`, `sr-announce-delay`, `sr-reduced-announcements`)
- [ ] Aggiungere destructuring: `const { screenReaderPreferences, setScreenReaderPreference, resetScreenReaderPreferences, isSettingsLoading } = useUserSettings()`
- [ ] Nell'handler di ogni toggle SR: sostituire setter `useKV` con `setScreenReaderPreference('sr_[campo]', nuovoValore)`
- [ ] Nell'handler dello slider `sr-announce-delay`: sostituire setter `useKV` con `setScreenReaderPreference('sr_announce_delay', valore)`
- [ ] Nell'handler della select `sr-verbosity`: sostituire setter `useKV` con `setScreenReaderPreference('sr_verbosity', valore)`
- [ ] Aggiornare i riferimenti ai valori letti da `useKV` con `screenReaderPreferences.[campo]`
- [ ] Aggiornare `handleResetToDefaults`: sostituire il reset manuale dei 12 `localState` con chiamata a `resetScreenReaderPreferences()`
- [ ] Valutare la semplificazione del layer `useState` locale (i 12 `useEffect` di sync al KV non sono più necessari con la sorgente unica) — a discrezione, purché comportamento esterno rimanga invariato
- [ ] Rimuovere `import { useKV } from '@github/spark/hooks'`

### WC3 — Aggiornare `src/hooks/use-accessibility-preferences.ts` (o `use-talkback.ts`)

- [ ] Aggiungere `import` di `useUserSettings` dal percorso corretto
- [ ] Rimuovere `const [talkBackAdaptations, setTalkBackAdaptationsKV] = useKV<TalkBackAdaptations>('talkback-adaptations', DEFAULT_ADAPTATIONS)`
- [ ] Rimuovere `const [talkBackManualOverride, setTalkBackManualOverrideKV] = useKV<boolean | null>('talkback-manual-override', null)`
- [ ] Aggiungere destructuring: `const { talkBackAdaptations, talkBackManualOverride, setTalkBackAdaptations, setTalkBackManualOverride } = useUserSettings()`
- [ ] Aggiornare la funzione `setAdaptations` (o equivalente) per delegare a `setTalkBackAdaptations`
- [ ] Aggiornare la funzione `setManualOverride` (o equivalente) per delegare a `setTalkBackManualOverride`
- [ ] Lo stato transiente `talkBackState` (rilevamento automatico TalkBack, non persistito) rimane in `useState` locale invariato — non toccarlo
- [ ] Rimuovere `import { useKV } from '@github/spark/hooks'`

### Gate C

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → test 01–04 passed
- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] `grep "useKV" src/components/ScreenReaderSettings.tsx` → 0 righe
- [ ] `grep "useKV" src/hooks/use-accessibility-preferences.ts` → 0 righe
- [ ] `grep "@github/spark/hooks" src/components/ScreenReaderSettings.tsx` → 0 righe

---

## Schema Supabase — Verifica colonne `preferences JSONB`

> P25 §3.4 ha già definito tutti i 28 campi. Verificare prima dell'implementazione che lo schema sia allineato.

- [ ] Verificare che la colonna `preferences` di `impostazioni_utente` contenga già `audio_enabled` e `audio_volume` nel seed di default
- [ ] Verificare che la colonna `preferences` contenga già i 12 campi `display_*` nel seed di default
- [ ] Verificare che la colonna `preferences` contenga già i 12 campi `sr_*` nel seed di default
- [ ] Verificare che la colonna `preferences` contenga già `talkback_adaptations` e `talkback_manual_override` nel seed di default
- [ ] Se mancano colonne: aggiungere una migration SQL che popola il seed di default con i valori di P25 §3.4 (documentare in `docs/5 - sql/`)

---

## Verifica finale (= gate P31)

> Tutti i gate A, B, C devono essere verificati prima di questo gate.

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → test 01–04 passed; documentare esito test 05 se fallimento pre-esistente
- [ ] `npx tsc --noEmit` → 0 errori TypeScript
- [ ] `grep "@github/spark/hooks" src/components/DisplaySettings.tsx` → 0 righe
- [ ] `grep "@github/spark/hooks" src/components/AudioSettings.tsx` → 0 righe
- [ ] `grep "@github/spark/hooks" src/components/ScreenReaderSettings.tsx` → 0 righe
- [ ] `grep "useKV" src/hooks/use-display-preferences.ts` → 0 righe
- [ ] `grep "useKV" src/hooks/use-accessibility-preferences.ts` → 0 righe
- [ ] `grep "window.spark.kv" src/lib/sound-system.ts` → 0 righe
- [ ] `useUserSettings()` espone i 28 nuovi campi P31 (verificare a vista in `use-user-settings.ts`)
- [ ] Aggiornamento non ottimistico confermato: lo stato locale non cambia finché Supabase non conferma (testare manualmente)
- [ ] Reset al logout verificato: `displayPreferences`, `audioEnabled`, `audioVolume`, `screenReaderPreferences`, `talkBackAdaptations` tornano ai default al logout
- [ ] Migrazione one-shot: preferenze Spark esistenti preservate al primo accesso (testare con utente che ha preferenze Spark salvate)
- [ ] `budgetPercentages` rimane come `useKV` in `AppDataContext` — `grep "useKV" src/context/AppDataContext.tsx` → 1 sola voce
- [ ] `git diff --name-only HEAD | grep ".github"` → output vuoto
