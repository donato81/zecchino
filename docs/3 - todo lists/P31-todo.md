# P31 — Todo: Migrazione UserPreferences SettingsTab (Display / Audio / Accessibilità) a Supabase

> Pacchetto P31 — Blocco 5 esteso: migrazione preferenze Display / Audio / ScreenReader / TalkBack
> Piano di riferimento: `docs/2 - coding plans/P31-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P31-migrazione-preferenze-display-audio-screenreader.md`
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
| `grep "@github/spark/hooks" src/components/DisplaySettings.tsx` → 0 righe | [x] |
| `grep "@github/spark/hooks" src/components/AudioSettings.tsx` → 0 righe | [x] |
| `grep "@github/spark/hooks" src/components/ScreenReaderSettings.tsx` → 0 righe | [x] |
| `grep "useKV" src/hooks/use-display-preferences.ts` → 0 righe | [x] |
| `grep "useKV" src/hooks/use-talkback.ts` → 0 righe | [x] |
| `grep "window.spark.kv" src/lib/sound-system.ts` → 0 righe | [x] |
| `useUserSettings()` espone i 28 nuovi campi P31 (verificare a vista) | [x] |
| `budgetPercentages` rimane come `useKV` in `AppDataContext` (non toccato) | [x] |
| `git diff --name-only HEAD \| grep ".github"` → output vuoto | [x] |

---

## Prima di iniziare

 - [x] Leggere integralmente il coding plan `docs/2 - coding plans/P31-coding-plan.md`
 - [x] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)
 - [x] Verificare che `npm run build` sia exit 0 (baseline pre-P31)
 - [x] Verificare che `npm run test:run` → test 01–04 passed (baseline pre-P31)

---

## Prerequisiti operativi

> Non iniziare la Wave A finché questi prerequisiti non sono verificati.

 - [x] **PR0** — Verificare che `useUserSettings()` esponga gli 8 valori P29 §4:
  ```bash
  grep -n "visibleCategories\|dismissedBudgetAlerts\|isSettingsReady" src/hooks/use-user-settings.ts
  ```
  > Esito PR0: verificato

- [x] **PR1** — Verificare che il repository `impostazioni-utente` esponga `updatePreference`:
  ```bash
  grep -n "updatePreference\|getOrCreate" src/lib/supabase/repositories/impostazioni-utente.ts
  ```
  > Esito PR1: verificato

 - [x] **PR2** — Verifica percorsi esatti dei 6 file in scope:
  ```bash
  ls src/components/DisplaySettings.tsx src/components/AudioSettings.tsx src/components/ScreenReaderSettings.tsx
  ls src/lib/sound-system.ts src/hooks/use-display-preferences.ts src/hooks/use-talkback.ts
  ```
  > Se alcuni percorsi differiscono (es. `src/components/settings/`, `src/services/`), documenta la variante e aggiorna i riferimenti nei task successivi.
  > Esito PR2: percorsi verificati (TalkBack wrapper reale: `src/hooks/use-talkback.ts`)

---

## Wave A — Audio

> Prerequisito: prerequisiti PR0–PR2 verificati.
> Perimetro: 2 chiavi `useKV` in `AudioSettings.tsx` + 4 accessi diretti `window.spark.kv` in `sound-system.ts`.
> Obiettivo: validare il pattern `updatePreference()` e risolvere R5 (iniezione Supabase nel singleton).

### WA1 — Estendere `src/hooks/use-user-settings.ts` (campi audio)

- [x] Aggiungere `audioEnabled`, `audioVolume`, `setAudioEnabled`, `setAudioVolume` alla superficie del hook
- [x] Inizializzare i valori da `userSettings.preferences` con fallback sicuri
- [x] Implementare i setter audio in modalità non ottimistica
- [x] Aggiungere reset al logout e restituzione dei valori audio

### WA2 — Migrazione one-shot Spark → Supabase (Wave A)

- [x] Implementare il rilevamento dell'assenza chiavi audio nel record preferenze
- [x] Leggere le chiavi legacy `audio-enabled` e `audio-volume` da Spark KV quando necessario
- [x] Scrivere i valori recuperati su Supabase con fallback ai default in caso di errore KV

### WA3 — Aggiornare `src/components/AudioSettings.tsx`

- [x] Sostituire `useKV` con `useUserSettings()` per audio enabled/volume
- [x] Mantenere invariato il layer locale necessario al componente
- [x] Rimuovere l'import di `useKV` dal file

### WA4 — Aggiornare `src/lib/sound-system.ts` (iniezione preferenze)

- [x] Eliminare tutti gli accessi diretti a `window.spark.kv`
- [x] Documentare e implementare il pattern di callback injection
- [x] Iniettare i callback da `useUserSettings()` al mount
- [x] Mantenere il singleton istanziabile anche prima dell'iniezione

### Gate A

- [x] `npm run build` exit 0
- [x] `npm run test:run` → test 01–04 passed
- [x] `npx tsc --noEmit` → 0 errori TypeScript nel perimetro della wave
- [x] `grep "window.spark.kv" src/lib/sound-system.ts` → 0 righe
- [x] `grep "useKV" src/components/AudioSettings.tsx` → 0 righe

---

## Wave B — Display

> Prerequisito: Gate A verificato.
> Perimetro: 12 `useKV` in `DisplaySettings.tsx` (writer) + 12 `useKV` in `use-display-preferences.ts` (reader). Migrazione atomica: i due file devono essere aggiornati insieme.

### WB1 — Estendere `src/hooks/use-user-settings.ts` (campi display)

- [x] Esporre `displayPreferences` e `setDisplayPreference` nella superficie del hook
- [x] Definire defaults display coerenti con i precedenti `useKV`
- [x] Implementare inizializzazione, reset logout e setter non ottimistico
- [x] Aggiungere migrazione one-shot delle 12 chiavi `display-*`

### WB2 — Aggiornare `src/components/DisplaySettings.tsx`

- [x] Sostituire le 12 `useKV` con `displayPreferences` e `setDisplayPreference`
- [x] Aggiornare handler booleani e selettori al nuovo contratto
- [x] Rimuovere `useKV` e relativo import dal file

### WB3 — Trasformare `src/hooks/use-display-preferences.ts` in thin wrapper

- [x] Rimuovere le 12 chiamate `useKV`
- [x] Sostituire il corpo del hook con `return useUserSettings().displayPreferences`
- [x] Mantenere invariata l'interfaccia pubblica esportata

### Gate B

- [x] `npm run build` exit 0
- [x] `npm run test:run` → test 01–04 passed
- [x] `npx tsc --noEmit` → 0 errori TypeScript nel perimetro della wave
- [x] `grep "useKV" src/components/DisplaySettings.tsx` → 0 righe
- [x] `grep "useKV" src/hooks/use-display-preferences.ts` → 0 righe
- [x] `grep "@github/spark/hooks" src/components/DisplaySettings.tsx` → 0 righe

---

## Wave C — ScreenReader + TalkBack

> Prerequisito: Gate B verificato.
> Perimetro: 12 `useKV` in `ScreenReaderSettings.tsx` + 2 `useKV` nel wrapper TalkBack reale `use-talkback.ts`.

### WC1 — Estendere `src/hooks/use-user-settings.ts` (campi ScreenReader + TalkBack)

- [x] Esporre `screenReaderPreferences`, reset e setter relativi
- [x] Esporre `talkBackAdaptations`, `talkBackManualOverride` e relativi setter
- [x] Inizializzare i valori da `userSettings.preferences` con fallback ai default
- [x] Implementare setter e reset non ottimistici
- [x] Aggiungere migrazione one-shot per chiavi `sr-*` e `talkback-*`
- [x] Ripristinare i default al logout

### WC2 — Aggiornare `src/components/ScreenReaderSettings.tsx`

- [x] Rimuovere le 12 chiamate `useKV` e usare `screenReaderPreferences`
- [x] Aggiornare toggle, select, slider e reset al nuovo contratto
- [x] Rimuovere `useKV` e relativo import dal file

### WC3 — Aggiornare `src/hooks/use-talkback.ts`

- [x] Aggiungere `import` di `useUserSettings` dal percorso corretto
- [x] Rimuovere `const [talkBackAdaptations, setTalkBackAdaptationsKV] = useKV<TalkBackAdaptations>('talkback-adaptations', DEFAULT_ADAPTATIONS)`
- [x] Rimuovere `const [talkBackManualOverride, setTalkBackManualOverrideKV] = useKV<boolean | null>('talkback-manual-override', null)`
- [x] Aggiungere destructuring: `const { talkBackAdaptations, talkBackManualOverride, setTalkBackAdaptations, setTalkBackManualOverride } = useUserSettings()`
- [x] Aggiornare la funzione `setAdaptations` (o equivalente) per delegare a `setTalkBackAdaptations`
- [x] Aggiornare la funzione `setManualOverride` (o equivalente) per delegare a `setTalkBackManualOverride`
- [x] Lo stato transiente `talkBackState` (rilevamento automatico TalkBack, non persistito) rimane in `useState` locale invariato
- [x] Rimuovere `import { useKV } from '@github/spark/hooks'`

### Gate C

- [x] `npm run build` exit 0
- [x] `npm run test:run` → test 01–04 passed
- [x] `npx tsc --noEmit` → 0 errori TypeScript nel perimetro della wave
- [x] `grep "useKV" src/components/ScreenReaderSettings.tsx` → 0 righe
- [x] `grep "useKV" src/hooks/use-talkback.ts` → 0 righe
- [x] `grep "@github/spark/hooks" src/components/ScreenReaderSettings.tsx` → 0 righe

---

## Schema Supabase — Verifica colonne `preferences JSONB`

> P25 §3.4 ha già definito tutti i 28 campi. Verificare prima dell'implementazione che lo schema sia allineato.

- [x] Verificare che la colonna `preferences` di `impostazioni_utente` contenga già `audio_enabled` e `audio_volume` nel seed di default
- [x] Verificare che la colonna `preferences` contenga già i 12 campi `display_*` nel seed di default
- [x] Verificare che la colonna `preferences` contenga già i 12 campi `sr_*` nel seed di default
- [x] Verificare che la colonna `preferences` contenga già `talkback_adaptations` e `talkback_manual_override` nel seed di default
- [x] Nessuna migration SQL aggiuntiva necessaria: lo schema P25 §3.4 era già allineato

---

## Verifica finale (= gate P31)

> Tutti i gate A, B, C devono essere verificati prima di questo gate.

- [x] `npm run build` exit 0
- [x] `npm run test:run` → test 01–04 passed; documentare esito test 05 se fallimento pre-esistente
- [x] `npx tsc --noEmit` → 0 errori TypeScript nel perimetro P31
- [x] `grep "@github/spark/hooks" src/components/DisplaySettings.tsx` → 0 righe
- [x] `grep "@github/spark/hooks" src/components/AudioSettings.tsx` → 0 righe
- [x] `grep "@github/spark/hooks" src/components/ScreenReaderSettings.tsx` → 0 righe
- [x] `grep "useKV" src/hooks/use-display-preferences.ts` → 0 righe
- [x] `grep "useKV" src/hooks/use-talkback.ts` → 0 righe
- [x] `grep "window.spark.kv" src/lib/sound-system.ts` → 0 righe
- [x] `useUserSettings()` espone i 28 nuovi campi P31 (verificato a vista in `use-user-settings.ts`)
- [x] Aggiornamento non ottimistico confermato: lo stato locale non cambia finché Supabase non conferma
- [x] Reset al logout verificato: `displayPreferences`, `audioEnabled`, `audioVolume`, `screenReaderPreferences`, `talkBackAdaptations` tornano ai default al logout
- [x] Migrazione one-shot: preferenze Spark esistenti preservate al primo accesso
- [x] `budgetPercentages` rimane come `useKV` in `AppDataContext` — `grep "useKV" src/context/AppDataContext.tsx` → 1 sola voce
- [x] `git diff --name-only HEAD | grep ".github"` → output vuoto

## Esito finale

- Data di completamento implementazione: 2026-05-03
- Commit: `b6eece490ce5430ed5910652230297fbc71e63cd`
- Gate finale: PASS (build exit 0, test 01–04 passed, tsc 0 errori perimetro P31)
- Decisione D applicata: sistema a callback per `sound-system.ts` (callback injection), non `setSupabaseClient()`
- Errori TypeScript preesistenti fuori perimetro P31: 2 in `src/context/AppDataContext.tsx` riga 456; 1 in `src/context/AuthContext.tsx` riga 59
- Note operative: il wrapper reale per TalkBack è `src/hooks/use-talkback.ts` (non `use-accessibility-preferences.ts` come indicato nel coding plan). Documentato e aggiornato nei TODO e in `architettura.md`.
