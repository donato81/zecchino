# P31 — Migrazione preferenze Display/Audio/ScreenReader a `useUserSettings()`

---

## 1. Intestazione

| Campo | Valore |
|---|---|
| **Pacchetto** | P31 — Migrazione preferenze Display/Audio/ScreenReader a `useUserSettings()` |
| **Tipo intervento** | Documento di design (sola lettura) |
| **Branch** | `refactoring-architettura` |
| **Data** | 28 aprile 2026 |
| **Autore** | Agent-Design |
| **File modificati** | Nessuno (solo creazione di questo documento) |
| **Documenti di riferimento** | [P24](./P24-architettura-migrazione-supabase.md) · [P25](./P25-schema-impostazioni-utente-cifrato.md) · [P26](./P26-strato-accesso-dati-supabase.md) · [P27](./P27-migrazione-authcontext-supabase.md) · [P28](./P28-migrazione-appdatacontext-supabase.md) · [P29](./P29-migrazione-usersettings-preferenze-ui.md) · [P30](./P30-migrazione-budgetpercentages-usestate.md) · [DisplaySettings.tsx](../../src/components/DisplaySettings.tsx) · [AudioSettings.tsx](../../src/components/AudioSettings.tsx) · [ScreenReaderSettings.tsx](../../src/components/ScreenReaderSettings.tsx) · [use-display-preferences.ts](../../src/hooks/use-display-preferences.ts) · `src/hooks/use-user-settings.ts` (da creare) |
| **Stato** | Bozza — in attesa di validazione |

> **Questo documento è vincolante per tutti i design operativi successivi (P32 in poi).
> Le decisioni qui contenute sono già state validate e non vengono rimesse in discussione:
> i design successivi possono solo dettagliarne l'implementazione, non cambiarne la sostanza.**

---

## 2. Contesto

P24 §4.7 stabilisce che **`useUserSettings()` è l'unica fonte di verità per tutte le preferenze
utente** dell'applicazione: non solo le preferenze di navigazione (perimetro di P29), ma anche
le preferenze di accessibilità e aspetto visivo. Il perimetro di P29 era deliberatamente ristretto
a `visibleCategories` e `dismissedBudgetAlerts` — le prime due chiavi urgenti per risolvere il
split-brain R2 su `AppDataContext`. P29 §11 registra esplicitamente come punto aperto «22+
preferenze UI rimanenti» (`display-*`, `audio-*`, `sr-*`) da pianificare come Blocco 5 esteso
o Blocco 5b separato.

P30 §9 e §11 confermano che, dopo la rimozione di `useKV('budget-percentages')` da
`AppDataContext`, il blocco immediato al completamento del Blocco 10 (decommissioning) è
rappresentato dalle **26+ chiamate `useKV` nei tre componenti di impostazioni** più quelle nei
file di supporto `use-display-preferences.ts`, `use-talkback.ts` e `sound-system.ts`. P31
chiude questa pendenza.

La verifica di P25 §3.4 (svolta in §4 di questo documento) rivela che **tutte e 28 le chiavi
`display-*`/`audio-*`/`sr-*`/`talkback-*` sono già previste nello schema `preferences JSONB`**
definito da P25. P31 non propone estensioni allo schema: utilizza direttamente le chiavi già
approvate.

La distinzione semantica con P29 è precisa: P29 migrava **preferenze di navigazione** (cosa
mostrare — categorie visibili, alert ignorati); P31 migra **preferenze di accessibilità e
aspetto** (come mostrarlo — dimensioni, contrasto, comportamenti audio e screen reader).
L'infrastruttura è identica — `useUserSettings()` + Supabase — ma la categoria semantica è
diversa. Questa separazione è coerente con la struttura del coding plan del Blocco 5 in P24 §6.

Dopo la distribuzione di P31, **`@github/spark/hooks` non sarà più usato in nessun file
`src/` dell'applicazione**, eccetto `src/test/setup.ts` (mock rimosso nel Blocco 10).

---

## 3. Inventario completo delle chiamate `useKV`

> **Questo inventario è costruito dall'analisi diretta del sorgente.** Ogni chiave è estratta
> dal codice reale; nessuna è stata inferita o inventata.

### 3.1 `DisplaySettings.tsx`

Tutte e 12 le chiavi `display-*` sono **condivise** con `src/hooks/use-display-preferences.ts`,
che le legge in sola lettura tramite un set analogo di `useKV`. `DisplaySettings.tsx` è il
**writer** (espone setter); `use-display-preferences.ts` è il **consumer** (solo lettura). Questa
coppia costituisce il pattern di accesso alle preferenze di visualizzazione dell'intera app.

| Chiave `useKV` (stringa esatta) | Tipo TypeScript | Default | Chiave `preferences` JSONB (snake_case) | Consumatori noti |
|---|---|---|---|---|
| `display-show-balances` | `boolean` | `true` | `display_show_balances` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |
| `display-show-account-icons` | `boolean` | `true` | `display_show_account_icons` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |
| `display-compact-mode` | `boolean` | `false` | `display_compact_mode` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |
| `display-show-categories` | `boolean` | `true` | `display_show_categories` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |
| `display-animations-enabled` | `boolean` | `true` | `display_animations_enabled` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |
| `display-font-size` | `number` | `100` | `display_font_size` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |
| `display-currency-display` | `'symbol' \| 'code' \| 'full'` | `'symbol'` | `display_currency_display` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |
| `display-number-format` | `'standard' \| 'compact'` | `'standard'` | `display_number_format` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |
| `display-high-contrast` | `boolean` | `false` | `display_high_contrast` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |
| `display-show-percentages` | `boolean` | `true` | `display_show_percentages` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |
| `display-show-transaction-icons` | `boolean` | `true` | `display_show_transaction_icons` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |
| `display-reduce-motion` | `boolean` | `false` | `display_reduce_motion` | DisplaySettings.tsx (R/W) · **use-display-preferences.ts** (R) |

> **Nota critica:** `use-display-preferences.ts` è un hook pubblico (esportato) che espone
> l'interfaccia `DisplayPreferences` usata da componenti consumer nell'app. È fuori dal perimetro
> delle tre sezioni §3.1–§3.3 (che coprono solo i componenti), ma è **in scope P31** per
> mandato P24 §4.7 e viene trattato nel §3.4 (riepilogo) e nel §9 (trasformazione file).

---

### 3.2 `AudioSettings.tsx`

Entrambe le chiavi `audio-*` sono **condivise** con `src/lib/sound-system.ts`. A differenza
di `use-display-preferences.ts`, `sound-system.ts` non usa il hook `useKV` ma accede
direttamente al KV store tramite `window.spark.kv.get/set` — è un **singleton di classe non-React**
(4 accessi diretti: `get('audio-enabled')`, `get('audio-volume')`, `set('audio-volume', ...)`,
`set('audio-enabled', ...)`). Questo è il **Rischio R5** identificato in P24 §8: il singleton
non può usare un hook React e richiede iniezione del client Supabase nella fase di inizializzazione.

| Chiave `useKV` (stringa esatta) | Tipo TypeScript | Default | Chiave `preferences` JSONB (snake_case) | Consumatori noti |
|---|---|---|---|---|
| `audio-enabled` | `boolean` | `true` | `audio_enabled` | AudioSettings.tsx (R/W via `useKV`) · **sound-system.ts** (R/W via `window.spark.kv` — accesso diretto, non hook) |
| `audio-volume` | `number` | `0.3` | `audio_volume` | AudioSettings.tsx (R/W via `useKV`) · **sound-system.ts** (R/W via `window.spark.kv` — accesso diretto, non hook) |

> **Nota:** `AudioSettings.tsx` usa un layer `useState` locale (`localEnabled`, `localVolume`)
> per la reattività immediata dell'UI, sincronizzando al KV via `useEffect`. Questo pattern
> locale rimane invariato dopo la migrazione; solo la destinazione di persistenza cambia
> (da Spark KV a Supabase via `updatePreference()`).

---

### 3.3 `ScreenReaderSettings.tsx`

Tutte e 12 le chiavi `sr-*` sono **esclusive** di `ScreenReaderSettings.tsx`: nessun altro file
`src/` le legge o le scrive. I valori sono usati direttamente all'interno del componente per
controllare il comportamento di `useScreenReader()` e `soundSystem` tramite handler locali.
Il componente usa un layer `useState` locale (12 variabili `local*`) con 12 `useEffect`
corrispondenti per la sincronizzazione al KV.

| Chiave `useKV` (stringa esatta) | Tipo TypeScript | Default | Chiave `preferences` JSONB (snake_case) | Consumatori noti |
|---|---|---|---|---|
| `sr-verbosity` | `'conciso' \| 'normale' \| 'verboso'` | `'normale'` | `sr_verbosity` | Solo `ScreenReaderSettings.tsx` |
| `sr-announce-navigation` | `boolean` | `true` | `sr_announce_navigation` | Solo `ScreenReaderSettings.tsx` |
| `sr-announce-filters` | `boolean` | `true` | `sr_announce_filters` | Solo `ScreenReaderSettings.tsx` |
| `sr-announce-form-changes` | `boolean` | `false` | `sr_announce_form_changes` | Solo `ScreenReaderSettings.tsx` |
| `sr-announce-shortcuts` | `boolean` | `true` | `sr_announce_shortcuts` | Solo `ScreenReaderSettings.tsx` |
| `sr-announce-balance-changes` | `boolean` | `true` | `sr_announce_balance_changes` | Solo `ScreenReaderSettings.tsx` |
| `sr-announce-budget-alerts` | `boolean` | `true` | `sr_announce_budget_alerts` | Solo `ScreenReaderSettings.tsx` |
| `sr-announce-progress` | `boolean` | `true` | `sr_announce_progress` | Solo `ScreenReaderSettings.tsx` |
| `sr-announce-focus-changes` | `boolean` | `false` | `sr_announce_focus_changes` | Solo `ScreenReaderSettings.tsx` |
| `sr-announce-list-position` | `boolean` | `true` | `sr_announce_list_position` | Solo `ScreenReaderSettings.tsx` |
| `sr-announce-delay` | `number` | `100` | `sr_announce_delay` | Solo `ScreenReaderSettings.tsx` |
| `sr-reduced-announcements` | `boolean` | `false` | `sr_reduced_announcements` | Solo `ScreenReaderSettings.tsx` |

> **Nota:** `ScreenReaderSettings.tsx` espone il pulsante «Ripristina ai valori predefiniti»
> (`handleResetToDefaults`) che resetta manualmente tutti i 12 `localState`. Dopo la migrazione,
> questo handler chiamerà anche `resetScreenReaderPreferences()` su `useUserSettings()`.

---

### 3.4 Riepilogo numerico

Il perimetro di P31 include i 3 file componenti esplicitamente specificati nel task più i file
di supporto identificati nell'analisi del sorgente, tutti citati in P24 §4.7 come target del
Blocco 5.

| File | N. chiamate `useKV` | N. chiavi uniche | Chiavi condivise | Note |
|---|---|---|---|---|
| `DisplaySettings.tsx` | 12 | 12 | **Tutte 12** con `use-display-preferences.ts` | Writer delle preferenze display |
| `AudioSettings.tsx` | 2 | 2 | **Entrambe** con `sound-system.ts` (accesso diretto, non `useKV`) | Writer delle preferenze audio |
| `ScreenReaderSettings.tsx` | 12 | 12 | Nessuna | Writer esclusivo delle preferenze SR |
| **Totale 3 file target** | **26** | **26** | — | — |
| `use-display-preferences.ts` *(in scope P31)* | 12 | 0 nuove | Stesso set di 12 chiavi `display-*` | Consumer read-only; da migrare nella stessa wave di DisplaySettings |
| `use-talkback.ts` *(in scope P31)* | 2 | **2 nuove** | Nessuna | `'talkback-adaptations'` (`TalkBackAdaptations`, default `DEFAULT_ADAPTATIONS`) e `'talkback-manual-override'` (`boolean \| null`, default `null`) |
| **Totale P31 completo** | **40** | **28** | — | 26 chiavi nei 3 file target + 2 TalkBack da `use-talkback.ts` |

**Chiavi condivise tra più file (attenzione speciale in migrazione):**

| Chiave | File writer | File reader | Impatto migrazione |
|---|---|---|---|
| `display-*` (12 chiavi) | `DisplaySettings.tsx` | `use-display-preferences.ts` | Migrazione coordinata nella stessa wave: se `DisplaySettings` scrive su Supabase ma `use-display-preferences.ts` legge ancora da Spark KV, le due sorgenti divergono. Le due wave devono essere atomiche. |
| `audio-enabled`, `audio-volume` | `AudioSettings.tsx` (via `useKV`) + `sound-system.ts` (via `window.spark.kv.set`) | `sound-system.ts` (via `window.spark.kv.get`) | Il singleton `sound-system` deve ricevere il client Supabase prima che l'app inizi a usare le preferenze migrate (P24 R5). Il rischio di lettura da sorgente sbagliata è reale se la wave non è atomica. |

> **Totale `useKV` eliminarti da P31:** 40 chiamate in 5 file React/hook, più 4 accessi diretti
> `window.spark.kv` in `sound-system.ts` (non conteggiati come `useKV` ma eliminati dalla
> stessa wave).

---

## 4. Verifica dello schema JSONB (P25 §3.4)

### 4.1 Chiavi già previste in P25 §3.4

P25 §3.4 definisce lo schema risultante della tabella `impostazioni_utente`. La colonna
`preferences JSONB` — scelta definitiva di P25 Decisione §3.3, vincolante per P24–P31 —
contiene **esattamente** le chiavi che P31 deve migrare.

**Chiavi `display-*` già in P25 §3.4 `preferences`:**

| Chiave Spark KV | Chiave JSONB (`preferences`) | Tipo | Default |
|---|---|---|---|
| `display-show-balances` | `display_show_balances` | `BOOLEAN` | `true` |
| `display-show-account-icons` | `display_show_account_icons` | `BOOLEAN` | `true` |
| `display-compact-mode` | `display_compact_mode` | `BOOLEAN` | `false` |
| `display-show-categories` | `display_show_categories` | `BOOLEAN` | `true` |
| `display-animations-enabled` | `display_animations_enabled` | `BOOLEAN` | `true` |
| `display-font-size` | `display_font_size` | `SMALLINT` | `100` |
| `display-currency-display` | `display_currency_display` | `TEXT` | `'symbol'` |
| `display-number-format` | `display_number_format` | `TEXT` | `'standard'` |
| `display-high-contrast` | `display_high_contrast` | `BOOLEAN` | `false` |
| `display-show-percentages` | `display_show_percentages` | `BOOLEAN` | `true` |
| `display-show-transaction-icons` | `display_show_transaction_icons` | `BOOLEAN` | `true` |
| `display-reduce-motion` | `display_reduce_motion` | `BOOLEAN` | `false` |

**Chiavi `sr-*` già in P25 §3.4 `preferences`:**

| Chiave Spark KV | Chiave JSONB (`preferences`) | Tipo | Default |
|---|---|---|---|
| `sr-verbosity` | `sr_verbosity` | `TEXT` | `'normale'` |
| `sr-announce-navigation` | `sr_announce_navigation` | `BOOLEAN` | `true` |
| `sr-announce-filters` | `sr_announce_filters` | `BOOLEAN` | `true` |
| `sr-announce-form-changes` | `sr_announce_form_changes` | `BOOLEAN` | `false` |
| `sr-announce-shortcuts` | `sr_announce_shortcuts` | `BOOLEAN` | `true` |
| `sr-announce-balance-changes` | `sr_announce_balance_changes` | `BOOLEAN` | `true` |
| `sr-announce-budget-alerts` | `sr_announce_budget_alerts` | `BOOLEAN` | `true` |
| `sr-announce-progress` | `sr_announce_progress` | `BOOLEAN` | `true` |
| `sr-announce-focus-changes` | `sr_announce_focus_changes` | `BOOLEAN` | `false` |
| `sr-announce-list-position` | `sr_announce_list_position` | `BOOLEAN` | `true` |
| `sr-announce-delay` | `sr_announce_delay` | `SMALLINT` | `100` |
| `sr-reduced-announcements` | `sr_reduced_announcements` | `BOOLEAN` | `false` |

**Chiavi `audio-*` già in P25 §3.4 `preferences`:**

| Chiave Spark KV | Chiave JSONB (`preferences`) | Tipo | Default |
|---|---|---|---|
| `audio-enabled` | `audio_enabled` | `BOOLEAN` | `true` |
| `audio-volume` | `audio_volume` | `NUMERIC(4,3)` | `0.300` |

**Chiavi `talkback-*` già in P25 §3.4 `preferences`:**

| Chiave Spark KV | Chiave JSONB (`preferences`) | Tipo | Default |
|---|---|---|---|
| `talkback-adaptations` | `talkback_adaptations` | `JSONB` | oggetto `DEFAULT_ADAPTATIONS` (8 campi booleani) |
| `talkback-manual-override` | `talkback_manual_override` | `BOOLEAN \| NULL` | `null` |

### 4.2 Chiavi nuove che P31 aggiunge

**Nessuna.** Tutte e 28 le chiavi identificate nell'inventario §3 sono già previste in P25 §3.4.
P31 non propone alcuna estensione dello schema JSONB. Il coding plan del Blocco 5 esteso può
procedere senza modifiche DDL alla tabella `impostazioni_utente`.

### 4.3 Struttura flat vs annidata — Decisione confermata

**STRUTTURA FLAT — confermata da P25.**

P25 §3.1 ha già analizzato le due opzioni e P25 §3.3 ha scelto Opzione 2 (JSONB) con struttura
**flat** (tutte le 28 chiavi allo stesso livello in `preferences`). P31 non rimette in discussione
questa scelta. Le motivazioni di P25 che rimangono valide con 28 chiavi:

- **Semplicità di `updatePreference()`**: il repository P26 §7.6 usa l'operatore `||` di JSONB
  per aggiornare un singolo campo chirurgicamente: `preferences || '{"chiave": valore}'`. Con
  struttura flat, questo funziona identicamente per tutte le 28 chiavi.
- **Leggibilità sufficiente**: 28 chiavi flat in un JSONB è ordinato e navigabile; la struttura
  annidata (es. `preferences.display.showBalances`) renderebbe `updatePreference()` più complesso
  senza benefici reali (non ci sono query SQL che filtrano per prefisso di chiave).
- **Coerenza con P29**: `visible_category_ids` e `dismissed_budget_alert_ids` sono già flat nello
  stesso JSONB. Una struttura ibrida (alcune chiavi flat, altre annidate) sarebbe incoerente.
- **Nessun indice parziale**: l'app non esegue query PostgreSQL su singole chiavi `preferences`;
  tutte le letture caricano l'intero record. La struttura flat è quindi equivalente alla struttura
  annidata in termini di performance.

---

## 5. Decisione A — Strategia di migrazione: wave unica o wave separate

### 5.1 Le due opzioni

**OPZIONE 1 — Wave unica**

Tutti e cinque i file in scope P31 (`DisplaySettings.tsx`, `use-display-preferences.ts`,
`AudioSettings.tsx`, `ScreenReaderSettings.tsx`, `use-talkback.ts`) più `sound-system.ts`
vengono migrati in un unico blocco di implementazione. Un solo coding plan, un solo PR, un
solo ciclo di test. Il perimetro è 40 chiamate `useKV` in 5 file React/hook + 4 accessi diretti
in 1 singleton.

**OPZIONE 2 — Tre wave separate**

La migrazione avviene in tre sotto-blocchi sequenziali, ciascuno con il proprio coding plan e PR:

- **Wave A** — AudioSettings: 2 chiavi `useKV` in `AudioSettings.tsx` + 4 accessi diretti in
  `sound-system.ts`. Perimetro minimo (2 chiamate React + 1 singleton). Valida il pattern
  `updatePreference()` e il meccanismo di iniezione Supabase nel singleton prima di affrontare
  file più complessi.
- **Wave B** — Display: 12 chiavi `useKV` in `DisplaySettings.tsx` + 12 in
  `use-display-preferences.ts`. Perimetro più ampio (24 chiamate in 2 file strettamente legati).
  La coppia writer/reader deve essere migrata atomicamente (vedi §3.4 chiavi condivise).
- **Wave C** — ScreenReader+TalkBack: 12 chiavi `useKV` in `ScreenReaderSettings.tsx` + 2 in
  `use-talkback.ts`. Il gruppo di accessibilità — con il layer `useState` locale più articolato
  di tutti e 12 `useEffect` da ristrutturare.

### 5.2 Analisi comparativa

| Dimensione | Opzione 1 — Wave unica | Opzione 2 — Tre wave |
|---|---|---|
| **Rischio di regressione** | **Alto**: 40 chiamate `useKV` in 5 file modificati in un unico PR. Un errore di chiave JSONB (es. `display_fontSize` anziché `display_font_size`) è silenzioso e difficile da individuare. Il reviewer vede 5 file cambiati contemporaneamente. | **Ridotto**: ogni wave ha al massimo 24 chiamate modificate. La Wave A (2 chiamate) valida il pattern in isolamento; se emerge un bug, è circoscritto prima di propagarsi. |
| **Dimensione del PR e revisione** | **Grande**: 5+ file modificati, 40+ chiamate da verificare, 1 singleton da ristrutturare. Difficile da revisionare in modo efficace. | **Progressivo**: Wave A ~2 file, Wave B ~2 file, Wave C ~2 file. Ogni PR è revisionabile in modo indipendente. |
| **Complessità del testing** | Alta — tutti i percorsi (display, audio, SR, talkback) devono essere testati in un unico ciclo, aumentando la dimensione della matrice test. | Modulare — ogni wave introduce nuovi test su un sottoinsieme di preferenze; Wave A diventa la base di regressione per B e C. |
| **Velocità complessiva di completamento** | **Potenzialmente più rapida** se tutto va bene al primo tentativo. | Leggermente più lenta ma con higher confidence a ogni step. |
| **Coerenza dello stato intermedio** | N/A (un solo PR) | **Garantita**: tra Wave A e Wave B, il codebase ha solo `audio-*` migrati e funzionanti; le `display-*` e `sr-*` restano su Spark KV senza interferenza. Nessuna chiave è a metà migrazione. |
| **Validazione del pattern prima della complessità** | Non disponibile: `sound-system.ts` (caso più complesso — R5 di P24) e `DisplaySettings` (12 chiavi) entrano insieme senza precedente validato. | **Disponibile**: Wave A valida l'iniezione del client Supabase nel singleton `sound-system` e il flusso `updatePreference()` con 2 chiavi. Wave B scala lo stesso pattern a 12+12 chiavi. |

### 5.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 2 — Tre wave separate.**

Il fattore determinante è il **numero reale di chiamate `useKV` per file**: con 12 chiavi in
`DisplaySettings.tsx`, 12 in `use-display-preferences.ts` e 12 in `ScreenReaderSettings.tsx`,
un'implementazione monolitica produce un PR di 40+ modifiche su 5 file che combina il caso più
complesso (il singleton `sound-system.ts`, Rischio R5 di P24) con i casi più voluminosi (display
e SR) senza rete di sicurezza.

`AudioSettings.tsx` ha **solo 2 chiamate `useKV`** — il caso più semplice dell'intero Blocco 5
esteso. Migrarlo per primo in Wave A permette di validare:

1. Il flusso `updatePreference()` con chiavi semplici (`boolean`, `number`);
2. L'iniezione del client Supabase nel singleton `sound-system.ts` (R5) in isolamento, prima che
   il pattern venga replicato su display e SR;
3. Il comportamento del layer `useState` locale di `AudioSettings` post-migrazione.

Se Wave A introduce una regressione su `audio-enabled` o `audio-volume`, il problema emerge su
2 chiavi in 2 file — non su 40 chiavi in 6 file. Wave B e Wave C ereditano il pattern validato
da Wave A e lo scalano. Questa progressione riduce la probabilità di un errore difficile da
localizzare e mantiene il codebase in stato coerente tra una wave e l'altra.

---

## 6. Decisione B — Estensione della superficie pubblica di `useUserSettings()`

### 6.1 Le due opzioni

**OPZIONE 1 — API esplicita per ogni preferenza (o gruppo di preferenze)**

`useUserSettings()` espone ogni preferenza come campo nominato con il proprio setter tipizzato.
Per le 12 preferenze display, è possibile riutilizzare l'interfaccia `DisplayPreferences` già
esistente in `use-display-preferences.ts` esponendola come oggetto singolo:
`displayPreferences: DisplayPreferences`. Idem per le preferenze SR e TalkBack.

La superficie aggiunta da P31 sulla base di P29 §4 include (senza essere esaustiva):
`displayPreferences`, `setDisplayPreference(key, value)`, `audioEnabled`, `audioVolume`,
`setAudioEnabled(v)`, `setAudioVolume(v)`, `screenReaderPreferences`,
`setScreenReaderPreference(key, value)`, `talkBackAdaptations`, `talkBackManualOverride`,
`setTalkBackAdaptations(obj)`, `setTalkBackManualOverride(v)`.

**OPZIONE 2 — API generica con `getPreference/setPreference`**

`useUserSettings()` espone un'API dinamica:
- `getPreference(key)`: legge una chiave dal JSONB
- `setPreference(key, value)`: scrive una chiave tramite `updatePreference()` (P26 §7.6)

I componenti chiamano `getPreference('display_font_size')` anziché leggere un campo tipizzato.

### 6.2 Analisi comparativa

| Dimensione | Opzione 1 — API esplicita | Opzione 2 — API generica |
|---|---|---|
| **Type safety a compile time** | **Piena**: ogni campo è tipizzato. `displayPreferences.fontSize` è `number`; TypeScript rileva assegnazioni di tipo errato. | **Assente**: `getPreference(key)` restituisce `unknown` o `any`; il casting è a carico del consumer. |
| **Facilità di uso nei componenti consumer** | **Alta**: `useUserSettings().displayPreferences.showBalances` è auto-completato dall'IDE; nessun rischio di typo sulla chiave. | **Media**: `getPreference('display_show_balances')` richiede di ricordare la chiave esatta in snake_case; un typo è un bug silenzioso. |
| **Verbosità dell'API** | Più lunga: ~12 campi + ~12 setter per P31 (in aggiunta agli 8 di P29). La superficie cresce, ma i setter possono essere raggruppati (`setDisplayPreference(key, value)` con tipo restretto). | Minima: 2 funzioni generiche per l'intera superficie. |
| **Facilità di aggiunta di nuove preferenze future** | Media: aggiunge un campo e un setter al hook. Richiede una modifica al tipo TypeScript, ma il tipo è documentazione. | Alta: si aggiunge la chiave al JSONB senza toccare il hook. |
| **Coerenza con P29 §4** | **Piena**: P29 §4 ha già stabilito `visibleCategories`, `dismissedBudgetAlerts`, `setVisibleCategories`, `dismissBudgetAlert`, `resetDismissedAlerts` come API esplicita con campi nominati. L'Opzione 1 è la scelta naturale per la continuità dell'interfaccia. | **Incompatibile**: introdurrebbe un'API ibrida (P29 usa campi espliciti, P31 usa generici). I componenti consumer avrebbero due pattern diversi per il medesimo hook. |

### 6.3 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — API esplicita.**

P29 §4 ha già stabilito il pattern: `useUserSettings()` espone valori nominati e tipizzati,
non un'API dinamica. Cambiare pattern in P31 produrrebbe un'interfaccia ibrida dove metà delle
preferenze si legge con `visibleCategories` e l'altra metà con `getPreference('display_show_balances')`.
Questa incoerenza sarebbe fonte di confusione e di errori nell'implementazione.

Per contenere la verbosità della superficie con 28 nuovi campi, l'Opzione 1 viene declinata
con **raggruppamento per categoria**:

- `displayPreferences: DisplayPreferences` — riusa l'interfaccia già definita in
  `use-display-preferences.ts`; setter raggruppato `setDisplayPreference(key, value)` con `key`
  vincolato alle chiavi di `DisplayPreferences`.
- `audioEnabled: boolean` + `audioVolume: number` + setter individuali `setAudioEnabled(v)`,
  `setAudioVolume(v)` — due soli valori, setter individuali sono preferibili al raggruppamento.
- `screenReaderPreferences: ScreenReaderPreferences` — interfaccia analoga a `DisplayPreferences`;
  setter raggruppato `setScreenReaderPreference(key, value)`.
- `talkBackAdaptations: TalkBackAdaptations` + `talkBackManualOverride: boolean | null` + setter
  individuali o raggruppati.

Il raggruppamento mantiene la **piena type safety** (le chiavi dei setter sono vincolate alle
interfacce tipizzate) senza esporre 52+ campi flat sulla superficie del hook.

---

## 7. Decisione C — Migrazione dati storici (Spark KV → Supabase) per utenti esistenti

### 7.1 Il problema

Gli utenti che usano l'app con Spark hanno già salvato le loro preferenze nel KV store: tema
ad alto contrasto, font aumentato al 130%, suoni disabilitati, verbosità screen reader su
«verboso». Al primo accesso post-distribuzione di P31, se nessuna logica di migrazione è
presente, `preferences` in Supabase sarà vuoto e l'app mostrerà i valori di default — per
esempio font al 100% a un utente ipovedente che aveva impostato 130%.

### 7.2 Le due opzioni

**OPZIONE 1 — Migrazione one-shot al primo accesso**

Al primo login post-distribuzione P31, `useUserSettings()` rileva che `preferences` è vuoto
(o che mancano le chiavi `display-*`, `audio-*`, `sr-*`, `talkback-*`). In quel caso:

1. Legge le chiavi corrispondenti dal KV store Spark tramite `window.spark.kv.get` per ciascuna
   delle 28 chiavi (o tramite `window.spark.kv.keys()` + lettura batch).
2. Scrive i valori recuperati su Supabase in una singola operazione batch (`updatePreferences(batch)`)
   tramite il repository `impostazioni-utente` di P26.
3. Al secondo login e successivi, `preferences` è già popolato: nessuna logica di migrazione viene
   eseguita.

L'utente non percepisce discontinuità: le sue preferenze sono preservate.

**OPZIONE 2 — Reset ai default, migrazione ignorata**

Al primo login post-distribuzione P31, le preferenze iniziano dai valori di default definiti in
P25 §3.4. L'utente riconfigura manualmente. Nessuna logica di migrazione da implementare.

### 7.3 Analisi comparativa

| Dimensione | Opzione 1 — Migrazione one-shot | Opzione 2 — Reset ai default |
|---|---|---|
| **Impatto UX per utenti con preferenze di accessibilità personalizzate** | **Nullo**: font aumentato, contrasto alto, verbosità SR, suoni disabilitati — tutto preservato automaticamente. | **Alto**: un utente ipovedente con `display_font_size = 130` si ritrova al 100% senza avviso. Un utente non udente con `audio_enabled = false` si ritrova con suoni attivati. Un utente con `display_high_contrast = true` perde la modalità ad alto contrasto. Non è un inconveniente estetico: è una barriera all'accessibilità. |
| **Complessità di implementazione** | Media: richiede una logica di one-shot detection (chiave `preferences` vuota o flag `legacy_migration_done` nel JSONB) + lettura batch dal KV + upsert batch su Supabase. | **Minima**: nessun codice aggiuntivo. |
| **Dipendenza dalla disponibilità del Spark KV store** | Presente: se il KV store non è accessibile al momento della migrazione one-shot, il fallback ai default è accettabile (l'utente riconfigurerà). Il meccanismo esatto è un punto aperto del coding plan (§12). | Assente. |
| **Coerenza con il Blocco 7 (DataManagement)** | Coerente: il Blocco 7 già pianifica una migrazione one-shot per i dati di dominio (transazioni, categorie). La migrazione delle preferenze usa lo stesso approccio. | Divergente: i dati di dominio vengono migrati, le preferenze no. Incoerenza percepita dall'utente. |

### 7.4 Decisione finale e motivazione

**OPZIONE SCELTA: Opzione 1 — Migrazione one-shot al primo accesso.**

Le preferenze di accessibilità non sono preferenze estetiche intercambiabili: `display_font_size`,
`display_high_contrast`, `display_reduce_motion`, `sr_verbosity`, `sr_reduced_announcements`,
`audio_enabled` e le 8 adattazioni TalkBack sono configurazioni che permettono a utenti con
esigenze speciali di **fruire dell'applicazione**. Resettarle ai default al momento della
migrazione è equivalente a rimuovere temporaneamente l'accessibilità dell'app per quegli utenti.

Per un'app di finanza personale che gestisce dati sensibili, questo impatto è inaccettabile:
un utente ipovedente con font a 130% e contrasto alto che si trova improvvisamente con font
al 100% e contrasto normale potrebbe non riuscire a leggere i propri saldi. La complessità
aggiuntiva della migrazione one-shot è marginale rispetto al beneficio di UX.

Il meccanismo esatto di lettura dal KV store Spark (singole `window.spark.kv.get` per chiave,
vs lettura batch tramite `window.spark.kv.keys()`, vs uso del `DataManagement.tsx` esistente
che già esegue `window.spark.kv.keys()` + get loop) è **rimandato al coding plan della Wave A**
(il punto di ingresso più appropriato, essendo `audio-*` le chiavi più semplici da migrare
come prova di concetto). La scelta tecnica è un punto aperto documentato in §12.

---

## 8. Flusso di inizializzazione delle nuove preferenze in `useUserSettings()`

Questa sezione descrive il ciclo di vita delle 28 nuove preferenze (display, audio, SR, talkback)
nel hook `useUserSettings()`. Il flusso è **coerente con P29 §8** (stessa struttura, stessi
principi architetturali) e lo estende alle categorie semantiche di P31.

**1. Precondizione (invariata da P29 §8 punto 1)**

Il record `UserSettings` completo — inclusi i 28 valori JSONB di P31 — è già disponibile in
memoria perché `AuthProvider` ha eseguito `getOrCreate()` al bootstrap (P27 §3.1) e lo ha
passato via context a `UserSettingsProvider` (P29 Decisione A). `UserSettingsProvider` **non**
esegue una seconda chiamata Supabase.

**2. Primo accesso — chiavi assenti nel JSONB**

Se alcune chiavi `display-*`, `audio-*`, `sr-*` o `talkback-*` sono assenti in `preferences`
(utente nuovo, onboarding appena completato), `useUserSettings()` usa i **medesimi valori di
default** che i `useKV` originali usavano:

- `display_show_balances = true`, `display_font_size = 100`, `display_high_contrast = false`, ecc.
- `audio_enabled = true`, `audio_volume = 0.3`
- `sr_verbosity = 'normale'`, tutti i flag `sr_announce_*` ai loro default originali
- `talkback_adaptations = DEFAULT_ADAPTATIONS`, `talkback_manual_override = null`

Questo garantisce continuità comportamentale: un utente che non ha mai configurato queste
preferenze vede lo stesso stato che vedeva con Spark KV. I valori di default di P25 §3.4 e
quelli del sorgente attuale (§3.1–§3.3) sono **identici** — nessun disallineamento.

**3. Accesso normale**

Il JSONB `preferences` viene deserializzato e i 28 valori vengono mappati sulle interfacce
tipizzate: `DisplayPreferences` (12 campi), struttura audio inline (2 campi),
`ScreenReaderPreferences` (12 campi), `TalkBackAdaptations` (8 campi booleani) + `boolean | null`.
I valori mancanti nel JSONB (chiavi non ancora scritte) usano i default del punto 2. Il
risultato è disponibile come `displayPreferences`, `audioEnabled`, `audioVolume`,
`screenReaderPreferences`, `talkBackAdaptations`, `talkBackManualOverride`.

**4. Aggiornamento — non ottimistico (coerente con P29 §8 punto 7)**

Quando un componente chiama `setDisplayPreference('display_font_size', 120)`,
`setScreenReaderPreference('sr_verbosity', 'verboso')` o qualsiasi setter di P31:

- `isSettingsLoading` diventa `true`
- `updatePreference(key, value)` (P26 §7.6) viene invocato
- Lo stato locale (`displayPreferences` ecc.) viene aggiornato **solo dopo conferma DB**
- `isSettingsLoading` torna `false`

Il componente può disabilitare il controllo durante il salvataggio usando `isSettingsLoading`.
Per le preferenze audio, dove `AudioSettings.tsx` usa già un layer `localState` per la
reattività immediata dello slider, il layer locale rimane: aggiorna `soundSystem` in tempo
reale, e la persistenza su Supabase avviene al debounce finale (pattern già in uso).

**5. Logout — reset ai default (coerente con P29 §8 punto 6)**

Al logout, `useUserSettings()` resetta **tutti** i valori (sia quelli di P29 che quelli di P31)
ai valori di default: `displayPreferences` torna al set di default, `audioEnabled` torna `true`,
`screenReaderPreferences` torna ai default, ecc. Il record Supabase non viene modificato. Al
prossimo login, il record verrà ricaricato con le preferenze effettive dell'utente.

**6. Errore su `updatePreference()` — rollback implicito**

Se `updatePreference()` fallisce (errore di rete, timeout, errore RLS), lo stato locale
**non viene aggiornato** (rollback automatico: l'aggiornamento non ottimistico implica che
lo stato locale riflette solo valori confermati dal DB). `settingsError` viene valorizzato
con il messaggio di errore. Il valore precedente della preferenza rimane attivo.

---

## 9. Trasformazione dei cinque file in scope P31

### 9.1 `src/components/DisplaySettings.tsx`

**Stato attuale (Spark):** 12 chiamate `useKV` per lettura e scrittura delle preferenze di
visualizzazione. Import di `useKV` da `@github/spark/hooks`. Ogni handler di modifica (toggle,
slider, select) chiama il setter `useKV` direttamente.

**Stato dopo P31:** Legge le 12 preferenze da `useUserSettings().displayPreferences`
(interfaccia `DisplayPreferences`). Le scritture avvengono tramite `setDisplayPreference(key, value)`
di `useUserSettings()`. Gli handler `handleToggle`, `handleFontSizeChange`,
`handleCurrencyDisplayChange`, `handleNumberFormatChange` rimangono invariati nella logica UI
(toast, screenReader.announce, soundSystem.play); cambiano solo nel target di persistenza.

**Eliminato:** le 12 chiamate `useKV`, l'import di `useKV` da `@github/spark/hooks`.

**Aggiunto:** import di `useUserSettings` da `@/hooks/use-user-settings` (o percorso equivalente).

**Dopo P31:** nessuna dipendenza da `@github/spark/hooks`.

---

### 9.2 `src/hooks/use-display-preferences.ts`

**Stato attuale (Spark):** Hook pubblico che esporta `useDisplayPreferences(): DisplayPreferences`.
12 chiamate `useKV` in sola lettura, stesse chiavi di `DisplaySettings.tsx`. Consumato dai
componenti che hanno bisogno di leggere le preferenze display senza modificarle.

**Stato dopo P31:** Il hook diventa un **wrapper thin** di `useUserSettings()`:
restituisce `useUserSettings().displayPreferences` senza nessuna logica propria. L'interfaccia
esportata `DisplayPreferences` rimane invariata e viene riutilizzata come tipo nella superficie
di `useUserSettings()` (Decisione B). Tutti i consumer esistenti continuano a funzionare senza
modifiche.

**Eliminato:** le 12 chiamate `useKV`, l'import di `useKV` da `@github/spark/hooks`.

**Aggiunto:** import di `useUserSettings`.

**Dopo P31:** nessuna dipendenza da `@github/spark/hooks`. Il file rimane (non viene eliminato)
per preservare la compatibilità con i consumer.

---

### 9.3 `src/components/AudioSettings.tsx`

**Stato attuale (Spark):** 2 chiamate `useKV` per `audio-enabled` e `audio-volume`. Layer
`useState` locale (`localEnabled`, `localVolume`) per la reattività immediata dell'UI. Sincronizzazione
via `useEffect` che chiama i setter `useKV` e `soundSystem.setEnabled/setVolume`. Dipende
implicitamente da `sound-system.ts` che legge le stesse chiavi direttamente da `window.spark.kv`
all'inizializzazione del singleton.

**Stato dopo P31:** Le 2 `useKV` vengono sostituite con `audioEnabled` e `audioVolume` da
`useUserSettings()`. Il layer `useState` locale rimane: `localEnabled` e `localVolume` continuano
ad aggiornare `soundSystem` in tempo reale; la persistenza su Supabase avviene tramite i setter
di `useUserSettings()` al debounce. `sound-system.ts` riceve il client Supabase alla
sua inizializzazione (P24 R5) e legge/scrive `audio_enabled` e `audio_volume` direttamente
tramite il repository `impostazioni-utente` invece di `window.spark.kv`.

**Eliminato:** le 2 chiamate `useKV`, l'import di `useKV` da `@github/spark/hooks`.

**Aggiunto:** import di `useUserSettings`.

**In `sound-system.ts`:** eliminati i 4 accessi `window.spark.kv.get/set`; aggiunta iniezione
del client Supabase per la lettura/scrittura delle preferenze audio. Il meccanismo esatto
dell'iniezione è un punto aperto documentato in §12.

**Dopo P31:** nessuna dipendenza da `@github/spark/hooks` né da `window.spark.kv` in entrambi
i file.

---

### 9.4 `src/components/ScreenReaderSettings.tsx`

**Stato attuale (Spark):** 12 chiamate `useKV` per lettura e scrittura delle preferenze SR.
Layer `useState` locale (12 variabili `localAnnounce*`, `localVerbosity`, ecc.) con 12 `useEffect`
corrispondenti che sincronizzano al KV tramite setter `useKV`. Handler `handleResetToDefaults`
ripristina manualmente tutti i 12 `localState`. Import di `useKV` da `@github/spark/hooks`.

**Stato dopo P31:** Le 12 `useKV` vengono sostituite con `screenReaderPreferences` da
`useUserSettings()`. Il layer `useState` locale può essere semplificato: con una sorgente unica
(`useUserSettings()`), i 12 `useEffect` di sincronizzazione al KV non sono più necessari. I
valori locali potrebbero derivare direttamente da `screenReaderPreferences` senza stato
duplicato. La ristrutturazione del layer locale è scelta implementativa (non vincolante da questo
documento). `handleResetToDefaults` chiama `resetScreenReaderPreferences()` su `useUserSettings()`.

**Eliminato:** le 12 chiamate `useKV`, l'import di `useKV` da `@github/spark/hooks`.

**Aggiunto:** import di `useUserSettings`.

**Dopo P31:** nessuna dipendenza da `@github/spark/hooks`.

---

### 9.5 `src/hooks/use-talkback.ts`

**Stato attuale (Spark):** 2 chiamate `useKV` — `'talkback-adaptations'` (oggetto
`TalkBackAdaptations` con 8 booleani) e `'talkback-manual-override'` (`boolean | null`). Esporta
`useTalkBack()` con stato locale `talkBackState` (non persistito) e i setter `setAdaptations`,
`setManualOverride` che scrivono sul KV.

**Stato dopo P31:** Le 2 `useKV` vengono sostituite con `talkBackAdaptations` e
`talkBackManualOverride` da `useUserSettings()`. Le scritture (`setAdaptations`, `setManualOverride`)
chiamano i setter di `useUserSettings()` che usano `updatePreference()`. Lo stato transiente
`talkBackState` (rilevamento automatico di TalkBack, non persistito) rimane in `useState` locale
invariato.

**Eliminato:** le 2 chiamate `useKV`, l'import di `useKV` da `@github/spark/hooks`.

**Aggiunto:** import di `useUserSettings`.

**Dopo P31:** nessuna dipendenza da `@github/spark/hooks`.

---

## 10. Impatto sul decommissioning Spark (Blocco 10)

P30 §9 ha stabilito il conteggio residuo di chiamate `useKV` dopo la rimozione di
`budget-percentages` da `AppDataContext`. P31 aggiorna quel conteggio eliminando le 40 chiamate
nei 5 file React/hook in scope.

**Situazione prima di P31 (post-P30):**

| File | Chiamate `useKV` |
|---|---|
| `src/components/DisplaySettings.tsx` | 12 |
| `src/hooks/use-display-preferences.ts` | 12 |
| `src/components/ScreenReaderSettings.tsx` | 12 |
| `src/components/AudioSettings.tsx` | 2 |
| `src/hooks/use-talkback.ts` | 2 |
| `src/context/AuthContext.tsx` | 2 |
| `src/components/SecuritySettings.tsx` | 2 |
| `src/components/CategoryManagement.tsx` | 1 |
| `src/test/setup.ts` | 1 (mock) |
| **Totale** | **46** |

**Situazione dopo P31 (40 chiamate eliminate dai 5 file in scope):**

| File | Chiamate `useKV` dopo P31 | Blocco che le risolve |
|---|---|---|
| `src/context/AuthContext.tsx` | 2 | P27 (implementazione) — gestione PIN hash |
| `src/components/SecuritySettings.tsx` | 2 | Blocco PIN (P32) |
| `src/components/CategoryManagement.tsx` | 1 | P28 (implementazione) — chiave `categories` |
| `src/test/setup.ts` | 1 (mock) | Blocco 10 — rimozione mock nel decommissioning |
| **Totale residuo** | **6** | — |

Dopo P31, il blocco al completamento del Blocco 10 non è più nei componenti di impostazioni
(tutti azzerati) ma nei **4 file sopra** — tutti con percorsi di risoluzione già identificati
dai rispettivi documenti di design.

**Accessi diretti `window.spark.kv` residui dopo P31:**

Oltre ai `useKV`, nell'analisi del sorgente sono emersi accessi diretti non via hook:

- `src/components/DataManagement.tsx`: usa `window.spark.kv.keys()`, `window.spark.kv.get(key)`,
  `window.spark.kv.set(key, value)` per l'export/import generale del KV store — questo file è
  il **target del Blocco 7** e non viene toccato da P31.
- `src/context/AuthContext.tsx`: usa `window.spark.kv.get('global-pin-hash')` direttamente
  (oltre ai 2 `useKV`) — risolto in P27 implementazione.

Dopo P31 + Blocco 7 + P27 implementazione, **nessun file `src/` userà più `window.spark.kv`
o `useKV`**, eccetto `src/test/setup.ts` (mock rimosso nel Blocco 10).

---

## 11. Impatto sui blocchi successivi

| Blocco P24 | Dipendenza da P31 | Note |
|---|---|---|
| **Blocco 7 — DataManagement** | **Dipendente** | L'importazione one-shot da Spark KV (Decisione C) deve gestire le 28 chiavi P31 oltre alle chiavi di dominio. `DataManagement.tsx` usa già `window.spark.kv.keys()` + loop: questa logica può essere riutilizzata per la migrazione one-shot delle preferenze. Le chiavi `talkback-adaptations` (JSONB annidato) richiedono mappatura specifica: `talkback-adaptations` → `preferences.talkback_adaptations` (non è una stringa semplice). |
| **Blocco 8 — PIN privato (P32)** | **Indipendente** | Nessuna sovrapposizione. P32 gestisce `pin_privato_hash` come colonna tipizzata separata, non in `preferences` JSONB. |
| **Blocco 9 — Onboarding** | **Dipendente** | Il seed iniziale di `preferences` al completamento dell'onboarding deve includere i valori di default delle 28 chiavi P31 (già definiti in P25 §3.4). La funzione `seed_default_categories()` di P24 §4.6 è fuori scope; il seed del record `impostazioni_utente` deve usare i default di P25 §3.4 incluse le chiavi P31. |
| **Blocco 10 — Decommissioning** | **Dipendente** | P31 è prerequisito diretto: dopo P31, la dipendenza `@github/spark/hooks` può essere rimossa da 5 file. Rimangono 4 file (§10) da risolvere. Il Blocco 10 può avanzare solo quando tutti sono azzerati. `src/test/setup.ts` (mock `useKV`) viene rimosso in questo blocco. |
| **Blocchi P32+ (futuri design)** | **Dipendente sulla superficie** | I nuovi design devono considerare `useUserSettings()` come includente i 28 campi P31 nella sua superficie pubblica (Decisione B). Nessun nuovo design deve introdurre `useKV` per preferenze utente. |

---

## 12. Punti aperti residui

- **Meccanismo di iniezione del client Supabase in `sound-system.ts`** (P24 Rischio R5): il
  singleton è una classe non-React e non può usare hook. Il meccanismo esatto — iniezione
  tramite un metodo `soundSystem.setSupabaseClient(client)` chiamato da `useUserSettings()` al
  mount, oppure esposizione di un callback di get/set per le preferenze audio — deve essere
  documentato e deciso nel **coding plan della Wave A**. P31 definisce il risultato atteso
  (il singleton legge/scrive da Supabase) ma non il come.

- **Lettura dal KV store Spark nella migrazione one-shot (Decisione C Opzione 1)**: il meccanismo
  esatto di lettura delle 28 chiavi Spark al primo accesso post-distribuzione va documentato nel
  **coding plan del Blocco 5 esteso**. Opzioni candidate: singole `window.spark.kv.get(key)` per
  ciascuna delle 28 chiavi; lettura di tutto il KV tramite `window.spark.kv.keys()` + loop (come
  già fa `DataManagement.tsx`); riuso della funzione di export di `DataManagement.tsx`. Il
  meccanismo scelto deve garantire che `talkback-adaptations` (valore JSONB) sia correttamente
  deserializzato e validato prima della scrittura su Supabase.

- **Coordinamento `session_timeout_minutes` con `AuthProvider`** (ereditato da P29 §11): la
  chiave `session_timeout_minutes` in `preferences` JSONB è letta e scritta da `AuthProvider`
  direttamente (P27 Decisione B). P31 non tocca questa chiave. Il coordinamento tra `AuthProvider`
  e `useUserSettings()` per questa chiave rimane aperto e da chiarire nel Blocco 8 o nel design
  del hook completo.

- **Pulizia chiave `budget-percentages` nel Spark KV** (ereditato da P30 §11): la chiave
  `budget-percentages` esiste nel KV store degli utenti e non ha corrispondente in Supabase (P30
  Decision A la rimuove dalla superficie pubblica). La migrazione one-shot della Wave A deve
  **escludere** questa chiave dalla scrittura su Supabase. Il coding plan deve documentare la
  lista delle chiavi da escludere.

- **Discrepanza P25 vs P29 su `visible_categories`**: P25 §3.4 definisce `visible_categories`
  come colonna `TEXT[]` separata; P29 §4 la colloca in `preferences.visible_category_ids`
  (JSONB). P31 non ha perimetro su queste chiavi, ma la discrepanza va chiarita prima
  dell'implementazione del Blocco 5. P24 prevale in caso di conflitto: P24 §4.7 dice «tutte le
  24 chiavi + visible-categories confluiscono in `impostazioni_utente`» senza specificare colonna
  vs JSONB. Il coding plan deve dichiarare quale fonte è autorevole.

---

## 13. Criteri di accettazione del documento

- [x] Tutte le sezioni (1–13) sono presenti e non vuote.
- [x] §3 costruita da analisi reale del sorgente: le 26 chiavi nei 3 file componenti sono
      estratte riga per riga dal codice (`DisplaySettings.tsx` linee 17–28,
      `AudioSettings.tsx` linee 24–25, `ScreenReaderSettings.tsx` linee 49–60). Nessuna chiave
      è stata inventata.
- [x] §3.4 contiene il totale complessivo delle chiamate `useKV` (26 nei 3 file target, 40
      nell'intero perimetro P31) e segnala le chiavi condivise: tutte le 12 `display-*` con
      `use-display-preferences.ts`; le 2 `audio-*` con `sound-system.ts` (accesso diretto).
- [x] §4 risponde esplicitamente: le 28 chiavi (26 dai 3 file + 2 talkback da `use-talkback.ts`)
      sono **già tutte previste in P25 §3.4**; P31 non propone estensioni. La struttura flat è
      confermata da P25 §3.3 (Decisione vincolante) con motivazione.
- [x] Decisione §4 (flat vs nested): scelta definitiva — flat, motivazione in §4.3.
- [x] Decisione A (§5): wave separate — scelta definitiva con citazione del numero reale di
      chiavi per file (AudioSettings 2, DisplaySettings 12+12, ScreenReaderSettings 12+2) come
      fattore nella scelta.
- [x] Decisione B (§6): API esplicita — scelta definitiva con citazione della coerenza con P29
      §4 (API già stabilita come esplicita e nominata) come motivazione principale.
- [x] Decisione C (§7): migrazione one-shot — scelta definitiva con paragrafo dedicato agli
      utenti con preferenze di accessibilità (fontSize, highContrast, srVerbosity, audioEnabled,
      talkBackAdaptations) e motivazione che il reset ai default non è un inconveniente estetico.
- [x] §8 coerente con P29 §8: stessa struttura (6 punti), stessi principi — non ottimistico,
      reset al logout, default identici ai `useKV` originali, rollback implicito su errore.
- [x] §9 dichiara esplicitamente che dopo P31 nessuno dei cinque file (DisplaySettings,
      use-display-preferences, AudioSettings, ScreenReaderSettings, use-talkback) ha più
      dipendenze da `@github/spark/hooks`.
- [x] §10 aggiorna il conteggio di P30 §9: da 46 a 6 chiamate `useKV` residue in `src/`,
      identificando esattamente i 4 file rimanenti e il loro blocco di risoluzione.
- [x] §11 copre Blocco 7 (DataManagement), Blocco 9 (Onboarding) e Blocco 10 (Decommissioning)
      con dipendenza e note operative specifiche.
- [x] §12 documenta 4 punti aperti residui: iniezione Supabase in `sound-system.ts`, meccanismo
      lettura KV per migrazione one-shot, coordinamento `session_timeout_minutes`, discrepanza
      P25 vs P29 su `visible_categories`.
- [x] Nessuna contraddizione con P24–P30 rilevata. Dove esiste una tensione (discrepanza
      P25/P29 su `visible_categories`), è documentata come punto aperto in §12.
- [x] Tutti i link `src/` usano path relativi (`../../src/...`).
- [x] Nessun frammento di codice TypeScript, JSX o SQL eseguibile in tutto il documento.
