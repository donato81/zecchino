# Report — Revisione ragionata della catena P25→P36

**Data:** 4 maggio 2026  
**Tipo:** Analisi read-only post-migrazione  
**Oggetto:** Coerenza logica dei 12 passi di migrazione da Spark KV a Supabase  
**Agente:** Agent-Analyze  

---

## Indice

1. [Riepilogo esecutivo](#1-riepilogo-esecutivo)
2. [Perimetro di analisi](#2-perimetro-di-analisi)
3. [Mappa dei contributi per passo](#3-mappa-dei-contributi-per-passo)
4. [Analisi per area](#4-analisi-per-area)
   - 4.1 [Autenticazione e sessione (P27, P32, P35)](#41-autenticazione-e-sessione)
   - 4.2 [Dati di dominio (P28, P30, P33, P36)](#42-dati-di-dominio)
   - 4.3 [Preferenze utente (P25, P29, P31)](#43-preferenze-utente)
   - 4.4 [Categorie (P28, P33)](#44-categorie)
   - 4.5 [Cache offline e stati di errore (P36)](#45-cache-offline-e-stati-di-errore)
5. [Problemi rilevati](#5-problemi-rilevati)
   - 5.1 [CRITICO — Dashboard vuota per nuovi utenti](#51-critico--dashboard-vuota-per-nuovi-utenti)
   - 5.2 [MINORE — showBalances default errato](#52-minore--showbalances-default-errato)
   - 5.3 [MINORE — audioEnabled default errato](#53-minore--audioenabled-default-errato)
   - 5.4 [MINORE — removePin non esposto nell'UI](#54-minore--removepin-non-esposto-nellui)
   - 5.5 [OSSERVAZIONE — Tipo TalkBackAdaptations duplicato](#55-osservazione--tipo-talkbackadaptations-duplicato)
   - 5.6 [OSSERVAZIONE — onboarding_completed come gate di rientro](#56-osservazione--onboarding_completed-come-gate-di-rientro)
   - 5.7 [OSSERVAZIONE — DataManagement scrive tramite repository diretto](#57-osservazione--datamanagement-scrive-tramite-repository-diretto)
6. [Analisi sicurezza logout](#6-analisi-sicurezza-logout)
7. [Verdetto complessivo](#7-verdetto-complessivo)

---

## 1. Riepilogo esecutivo

**Semaforo generale: 🟡 GIALLO**

La catena P25→P36 è architetturalmente coerente: i 12 passi si sovrappongono in modo additivo senza conflitti strutturali. Il repository pattern (P26), la migrazione Auth (P27), la migrazione dati (P28–P33), la migrazione preferenze (P29, P31, P32), la gestione import/export (P34), l'onboarding (P35) e la cache offline (P36) si incastrano correttamente.

Tuttavia sono stati rilevati **1 problema critico** e **3 problemi minori** che richiedono fix prima di un test end-to-end con utenti nuovi. Tutti i problemi si concentrano nella mappatura dei default JSONB → stato client in `src/hooks/use-user-settings.ts`.

Il codice di sicurezza (logout, cache isolation, bcrypt PIN) è **corretto e sicuro**.

---

## 2. Perimetro di analisi

### Documenti letti
| Documento | Argomento |
|-----------|-----------|
| P24 | Architettura migrazione Supabase |
| P25 | Schema impostazioni utente cifrato |
| P26 | Strato accesso dati Supabase |
| P27 | Migrazione AuthContext |
| P28 | Migrazione AppDataContext |
| P29 | VisibleData + UserSettings (prima parte) |
| P30 | budgetPercentages → useState |
| P31 | Display/Audio/SR preferences |
| P32 | PIN privato → impostazioni_utente |
| P33 | CategoryManagement split-brain |
| P34 | DataManagement import/export |
| P35 | OnboardingFlow e completeOnboarding |
| P36 | Cache offline e use-online-status |

### File sorgente letti
| File | Passo principale |
|------|-----------------|
| `src/context/AuthContext.tsx` | P27, P32, P35 |
| `src/context/AppDataContext.tsx` | P28, P30, P33, P36 |
| `src/context/UserSettingsContext.tsx` | P29 |
| `src/hooks/use-user-settings.ts` | P29, P31, P32 |
| `src/hooks/use-visible-data.ts` | P29 |
| `src/hooks/use-display-preferences.ts` | P31 |
| `src/hooks/use-talkback.ts` | P31 |
| `src/hooks/use-online-status.ts` | P36 |
| `src/components/CategoryManagement.tsx` | P33 |
| `src/components/SecuritySettings.tsx` | P27, P32 |
| `src/components/DataManagement.tsx` | P34, P36 |
| `src/components/DisplaySettings.tsx` | P31 |
| `src/components/AudioSettings.tsx` | P31 |
| `src/components/ScreenReaderSettings.tsx` | P31 |
| `src/lib/supabase/cache.ts` | P36 |
| `src/lib/supabase/repositories/impostazioni-utente.ts` | P26, P25 |
| `src/lib/supabase/repositories/conti.ts` | P26 |
| `src/lib/crypto.ts` | P32 |
| `src/App.tsx` | P35 |

---

## 3. Mappa dei contributi per passo

La tabella mostra, per ogni file chiave, quali passi lo hanno toccato e se le modifiche sono coerenti.

| File | Passi coinvolti | Tipo modifiche | Coerenza |
|------|----------------|----------------|----------|
| `AuthContext.tsx` | P27, P32, P35 | Additive | ✅ |
| `AppDataContext.tsx` | P28, P30, P33, P36 | Additive | ✅ |
| `use-user-settings.ts` | P29, P31 | Additive | ⚠️ 3 bug default |
| `use-visible-data.ts` | P29 | Nuovo | ⚠️ Dipende dai bug sopra |
| `use-display-preferences.ts` | P31 | Sostitutivo (wrapper) | ✅ |
| `use-talkback.ts` | P31 | Adattamento | ⚠️ tipo duplicato |
| `SecuritySettings.tsx` | P27, P32 | Sostitutivo | ⚠️ removePin mancante |
| `CategoryManagement.tsx` | P28, P33 | Sostitutivo | ✅ |
| `DataManagement.tsx` | P34, P36 | Sostitutivo | ✅ (bypass design intenzionale) |
| `cache.ts` | P36 | Nuovo | ✅ |
| `impostazioni-utente.ts` | P26, P25 | Nuovo | ✅ |
| `crypto.ts` | P32 | Adattamento | ✅ |

### Sequenza di build logica verificata

```
P24 (arch) → P25 (schema) → P26 (repositories) → P27 (auth) → P28 (data)
→ P29 (settings v1) → P30 (budgetPercentages) → P31 (settings v2)
→ P32 (PIN privato) → P33 (category split-brain) → P34 (data import/export)
→ P35 (onboarding) → P36 (cache offline)
```

Nessun passo presuppone un passo successivo. La dipendenza verso il basso è rispettata.

---

## 4. Analisi per area

### 4.1 Autenticazione e sessione

**Passi coperti:** P27, P32, P35  
**Stato: ✅ COERENTE (con osservazione minore)**

#### Cosa funziona correttamente

- `AuthContext.tsx` usa Supabase Auth (`supabase.auth.signInWithPassword`, `supabase.auth.signUp`) senza alcun residuo di `useKV` o `window.spark.kv`.
- La sessione è gestita via `onAuthStateChange` — il listener è il singolo punto di verità per `user`, `session`, `isAuthenticated`.
- `isPrivateEnabled` è derivato correttamente: `privatePinHashCache !== null && !== undefined && !== ''`.
- `privatePinHashCache` non è esposto nella superficie pubblica del context (encapsulamento corretto).
- `hashPin` / `verifyPin` in `src/lib/crypto.ts` usano `bcryptjs` con salt factor 12 — conforme a P32.
- `signOut()` chiama `invalidateCache(user.id)` **prima** di `supabase.auth.signOut()` — ordine corretto per sicurezza cache.

#### Funzioni presenti nel context ma non esposte nell'UI

`removePin` è implementata in `AuthContext` (P32) ma `SecuritySettings.tsx` non la destructura né mostra un pulsante "Rimuovi PIN". Dettaglio al §5.4.

#### Gate di navigazione in App.tsx

La sequenza in `AppContent()` è:
1. `!isAuthReady` → spinner
2. `!isAuthenticated` → `<AuthScreen />`
3. `needsOnboarding` → `<OnboardingFlow />`
4. `!isDataReady` → spinner
5. → dashboard

Nessun dato utente è accessibile prima del gate `isAuthenticated`. ✅

---

### 4.2 Dati di dominio

**Passi coperti:** P28, P30, P33, P36  
**Stato: ✅ COERENTE**

#### Repository pattern rispettato

`AppDataContext.tsx` non chiama `supabase.from(...)` direttamente. Ogni operazione CRUD passa attraverso i repository in `src/lib/supabase/repositories/`. I `RepositoryError` vengono propagati al chiamante.

#### Invarianti verificate

- Al logout (`!isAuthenticated || !user?.id`): tutti gli array (`accounts`, `transactions`, `categories`, `budgets`, `savingsGoals`) vengono resettati a `[]` via `useEffect`.
- Al login: carica da Supabase (o cache se offline) via `loadBootstrapData()`.
- `budgetPercentages` è `useState<Record<string,number>>({})` — P30 completato, nessun `useKV` residuo.
- `writeCache` si aggiorna tramite `useEffect` su ogni cambio dei 5 array (condizionato a `isAuthenticated && isDataReady`) — la cache è sempre aggiornata.

#### DataManagement — bypass intenzionale

`DataManagement.tsx` importa repository direttamente per le operazioni di import/ripristino. Questo è un bypass progettato esplicitamente da P34 §3.1: per le operazioni batch di import, il passaggio attraverso `AppDataContext` introdurrebbe la complessità della gestione degli array in-flight. Dopo l'import, `refreshAll()` risincronizza il context. Per l'export, legge correttamente da `useAppData()`. Dettaglio al §5.7.

---

### 4.3 Preferenze utente

**Passi coperti:** P25, P29, P31, P32  
**Stato: ⚠️ PARZIALMENTE COERENTE — 3 bug nel default JSONB**

Il contesto P25 definisce che la colonna `preferences` ha DEFAULT `'{}'::jsonb` e che "le chiavi mancanti vengono gestite lato client applicando i default documentati". La mappatura in `use-user-settings.ts` applica correttamente questo principio per la maggior parte dei campi, ma sbaglia l'operatore per tre campi con default `TRUE`.

**Regola attesa:** campi con default `TRUE` → usare `!== false`; campi con default `FALSE` → usare `=== true`.

**Mapping errati rilevati:**

| Campo JSONB | Default P25/P31 | Codice attuale | Effetto se assente |
|------------|----------------|----------------|-------------------|
| `display_show_balances` | `TRUE` | `=== true` | `false` ❌ |
| `audio_enabled` | `TRUE` | `=== true` | `false` ❌ |
| `visible_category_ids` | tutte le categorie | `[]` se absent | `[]` ❌ |

Il caso `visible_category_ids` è il più grave: causa una dashboard vuota. Dettaglio al §5.1.

**Mapping corretti verificati (campione):**

| Campo JSONB | Default P31 | Codice | Corretto |
|------------|-------------|--------|----------|
| `display_show_account_icons` | `TRUE` | `!== false` | ✅ |
| `display_compact_mode` | `FALSE` | `=== true` | ✅ |
| `display_animations_enabled` | `TRUE` | `!== false` | ✅ |
| `display_high_contrast` | `FALSE` | `=== true` | ✅ |
| `sr_announce_navigation` | `TRUE` | `!== false` | ✅ |
| `sr_announce_form_changes` | `FALSE` | `=== true` | ✅ |

I 26 campi SR e la maggior parte dei campi display sono mappati correttamente.

---

### 4.4 Categorie

**Passi coperti:** P28, P33  
**Stato: ✅ COERENTE**

Il split-brain R2 (P33) è risolto: `CategoryManagement.tsx` legge esclusivamente da `useAppData()` (`safeCategories`, `addCategory`, `updateCategory`, `removeCategory`). Nessun `useKV` residuo. La FK error `23503` su `removeCategory` è gestita correttamente.

---

### 4.5 Cache offline e stati di errore

**Passi coperti:** P36  
**Stato: ✅ COERENTE**

#### Isolamento per user_id

Chiave: `zecchino_cache_{userId}_{table}`. Nessuna possibilità di leakage tra utenti. Se l'utente A si disconnette e l'utente B accede, la cache di A è inaccessibile a B per costruzione.

#### TTL e invalidazione

- `CACHE_TTL_MS = 24 * 60 * 60 * 1000` (24h) ✅
- `invalidateCache(userId)` rimuove le 5 chiavi al logout esplicito ✅
- `isCacheStale()` distingue cache fresca da obsoleta ✅

#### Scadenza session server-side (nessun rischio)

Se la sessione scade lato server (senza passare per `signOut()`), `invalidateCache` non viene chiamato. Ma questo non crea rischi: le chiavi cache sono user-ID-prefissate, quindi un altro utente non può leggerle. Quando l'utente A riaccede, `isCacheStale` verificherà il TTL.

#### useOnlineStatus

`src/hooks/use-online-status.ts` è corretto: registra listener su `window.online/offline`. Usato per il banner UI. Il check offline in `AppDataContext` usa `navigator.onLine` direttamente (parallelo ma non confliggente).

---

## 5. Problemi rilevati

### 5.1 CRITICO — Dashboard vuota per nuovi utenti

**Impatto:** Alto — l'utente vede zero conti dopo il primo login  
**File:** `src/hooks/use-user-settings.ts` (~riga 186)  
**Dipende da:** `src/hooks/use-visible-data.ts`

#### Causa tecnica

```typescript
// codice attuale
const rawVisible = prefs?.visible_category_ids
setVisibleCategoriesState(Array.isArray(rawVisible) ? (rawVisible as string[]) : [])
```

Per un nuovo utente, `preferences = {}` (default DB), quindi `rawVisible = undefined`, quindi `visibleCategories = []`.

In `use-visible-data.ts`:
```typescript
const filteredGroupedAccounts = useMemo(() => {
  const safeVisibleCategories = visibleCategories || []
  return groupedAccounts.filter(group => safeVisibleCategories.includes(group.id))
}, [groupedAccounts, visibleCategories])
```

Con `visibleCategories = []`, `filteredGroupedAccounts = []` → la dashboard non mostra nessun gruppo di conti.

#### Scenario impatto

1. Utente crea account
2. Completa onboarding (P35 non scrive `visible_category_ids`)
3. Aggiunge un conto bancario
4. Dashboard vuota — il conto non è visibile

#### Fix richiesto

```typescript
// fix
const rawVisible = prefs?.visible_category_ids
setVisibleCategoriesState(
  Array.isArray(rawVisible) && rawVisible.length > 0
    ? (rawVisible as string[])
    : ACCOUNT_CATEGORIES.map(c => c.id)
)
```

---

### 5.2 MINORE — showBalances default errato

**Impatto:** Basso — i saldi sono nascosti al primo accesso  
**File:** `src/hooks/use-user-settings.ts`

#### Causa tecnica

```typescript
// codice attuale
showBalances: prefs.display_show_balances === true,
```

Se `display_show_balances` è assente dal JSONB, `=== true` ritorna `false`. Il design P25/P31 specifica default `TRUE`. Gli altri campi "default true" usano correttamente `!== false` (es. `showAccountIcons: prefs.display_show_account_icons !== false`).

#### Fix richiesto

```typescript
showBalances: prefs.display_show_balances !== false,
```

---

### 5.3 MINORE — audioEnabled default errato

**Impatto:** Basso — l'audio è disabilitato al primo accesso  
**File:** `src/hooks/use-user-settings.ts`

#### Causa tecnica

Stesso pattern del §5.2:

```typescript
// codice attuale
setAudioEnabledState(prefs.audio_enabled === true)
```

P25/P31 specifica default `TRUE` per `audio_enabled`. Con JSONB vuoto, il risultato è `false`.

#### Fix richiesto

```typescript
setAudioEnabledState(prefs.audio_enabled !== false)
```

---

### 5.4 MINORE — removePin non esposto nell'UI

**Impatto:** Medio — l'utente non può rimuovere il PIN privato dall'UI  
**File:** `src/components/SecuritySettings.tsx`

#### Causa tecnica

`AuthContext` espone `removePin` come da P32. Ma `SecuritySettings.tsx` destructura solo:

```typescript
const { user, resetPassword, isPrivateEnabled, setPin, changePin } = useAuth()
// removePin NON destructurato
```

La sezione PIN privato mostra solo il pulsante "Modifica / Configura". Non esiste un pulsante "Rimuovi PIN".

#### Fix richiesto

Aggiungere `removePin` al destructuring e un pulsante "Rimuovi PIN" visibile solo quando `isPrivateEnabled === true`, con richiesta del PIN attuale per conferma.

---

### 5.5 OSSERVAZIONE — Tipo TalkBackAdaptations duplicato

**Impatto:** Nessuno (structural typing TypeScript)  
**File:** `src/hooks/use-talkback.ts` e `src/lib/supabase/types.ts`

Le due definizioni sono strutturalmente identiche ma sono dichiarazioni separate. `use-user-settings.ts` importa la versione da `@/lib/supabase/types`; `use-talkback.ts` usa la propria versione locale.

**Raccomandazione:** `use-talkback.ts` dovrebbe importare `TalkBackAdaptations` da `@/lib/supabase/types` ed eliminare la definizione locale.

---

### 5.6 OSSERVAZIONE — onboarding_completed come gate di rientro

**Impatto:** Nessuno se OnboardingFlow scrive correttamente  
**File:** `src/context/AuthContext.tsx`

`completeOnboarding()` imposta solo `setNeedsOnboarding(false)` in locale senza scrivere su Supabase:

```typescript
const completeOnboarding = useCallback(() => {
  setNeedsOnboarding(false)
}, [])
```

La persistenza è affidata al fatto che `OnboardingFlow` scriva `nomeVisualizzato` prima di chiamare `completeOnboarding()`. Al re-login, `needsOnboarding = !settings.nomeVisualizzato`.

Questo è corretto IF `OnboardingFlow` scrive il nome. Ma il campo usato come gate (`nomeVisualizzato`) e il flag semantico (`onboarding_completed`) sono cose diverse. Se un utente avesse `nomeVisualizzato = ''` o `null` (es. errore di rete durante onboarding), al re-login vedrebbe di nuovo l'onboarding.

**Non è un bug nell'attuale design**, ma la dipendenza implicita è fragile. Se in futuro si volesse permettere l'uso dell'app senza nome visualizzato, il gate romperebbe.

---

### 5.7 OSSERVAZIONE — DataManagement scrive tramite repository diretto

**Impatto:** Nessuno (design intenzionale)  
**File:** `src/components/DataManagement.tsx`

`DataManagement.tsx` importa repository direttamente per le operazioni di import:

```typescript
import { create as createConto, getById as getContoById, update as updateConto }
  from '@/lib/supabase/repositories/conti'
```

Questo è un bypass del pattern "AppDataContext come unica fonte di verità per le scritture". P34 §3.1 lo prevede esplicitamente per le operazioni batch di import/ripristino. Il `refreshAll()` finale risincronizza il context.

**Merita monitoraggio:** se in futuro si aggiungono trigger, validazioni o side-effect in `AppDataContext` (es. notifiche budget dopo import), questi non sarebbero attivati dalle scritture dirette tramite repository.

---

## 6. Analisi sicurezza logout

**Verdetto: SICURO**

| Verifica | Risultato |
|---------|-----------|
| `invalidateCache` chiamato prima di `supabase.auth.signOut()` | ✅ |
| Chiavi cache con prefisso `user_id` (no cross-user leakage) | ✅ |
| Arrays dati resettati a `[]` quando `!isAuthenticated` | ✅ |
| `App.tsx` mostra `<AuthScreen />` prima che i dati del vecchio utente siano accessibili | ✅ |
| `privatePinHashCache` resettato via `onAuthStateChange` | ✅ |
| `isPrivateUnlocked` resettato a `false` al logout | ✅ |
| Inattività gestita via `useInactivityTimer` → chiama `signOut()` | ✅ |

**Finestra di esposizione:** nulla — `App.tsx` controlla `isAuthenticated` come primo gate, i dati in memoria non sono mai accessibili all'interfaccia prima del login.

---

## 7. Verdetto complessivo

### Semaforo: 🟡 GIALLO

| Area | Stato |
|------|-------|
| Autenticazione (P27, P32, P35) | ✅ Coerente |
| Dati di dominio (P28, P30, P33, P36) | ✅ Coerente |
| Preferenze utente (P25, P29, P31) | ⚠️ 3 bug nel mapping default |
| Categorie (P28, P33) | ✅ Coerente |
| Cache offline (P36) | ✅ Coerente |
| Sicurezza logout | ✅ Sicuro |

### Fix richiesti prima del test con utenti nuovi

| # | Priorità | File | Fix |
|---|----------|------|-----|
| 1 | CRITICO | `use-user-settings.ts` ~riga 186 | `visibleCategories` default → `ACCOUNT_CATEGORIES.map(c => c.id)` |
| 2 | MINORE | `use-user-settings.ts` | `showBalances`: `=== true` → `!== false` |
| 3 | MINORE | `use-user-settings.ts` | `audioEnabled`: `=== true` → `!== false` |
| 4 | MINORE | `SecuritySettings.tsx` | Aggiungere pulsante "Rimuovi PIN" + `removePin` |

### Debito tecnico (non bloccante)

| # | File | Note |
|---|------|------|
| 5 | `use-talkback.ts` | Importare `TalkBackAdaptations` da `@/lib/supabase/types` |
| 6 | `AuthContext.tsx` | Valutare se `onboarding_completed` dovrebbe essere il gate invece di `nomeVisualizzato` |
| 7 | `DataManagement.tsx` | Monitorare se future aggiunte di side-effect in `AppDataContext` richiedano refactoring del bypass |

### Conclusione

La catena P25→P36 realizza correttamente la migrazione architetturale da Spark KV a Supabase. I 12 passi sono sequenzialmente coerenti, non si sovrascrivono a vicenda e non lasciano residui `window.spark.kv.*` nel codice di produzione. L'unica area critica è il mapping dei default JSONB → stato client in `use-user-settings.ts`, dove tre operatori sbagliati producono comportamenti errati per i nuovi utenti (dashboard vuota, saldi nascosti, audio disabilitato). I tre fix sono chirurgici e non richiedono modifiche architetturali.
