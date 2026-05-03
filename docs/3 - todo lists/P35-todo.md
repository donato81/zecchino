# P35 — Todo: Onboarding primo accesso Supabase

> Pacchetto P35 — Blocco 9: OnboardingFlow completo, gate App.tsx, completeOnboarding() in AuthContext
> Piano di riferimento: `docs/2 - coding plans/P35-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P35-onboarding-primo-accesso-supabase.md`
> Branch: `refactoring-architettura`
> Data inizio: —
> Completato: —

---

## Esito finale

| Verifica | Stato |
|---|---|
| `npm run build` exit 0 | [ ] |
| `npx tsc --noEmit` → 0 errori TypeScript | [ ] |
| `npm run test:run` → 5/5 test passed | [ ] |
| `return null` come unico contenuto di `OnboardingFlow.tsx` | [ ] RIMOSSO |
| `completeOnboarding` in interfaccia `AuthContextValue` | [ ] PRESENTE |
| `onboarding_completed?: boolean` in `UserPreferences` | [ ] PRESENTE |
| `seedDefaultCategories` esportata da `categorie.ts` | [ ] PRESENTE |
| RPC `seed_default_categories` applicata a Supabase | [ ] APPLICATA |
| `git diff --name-only HEAD \| grep ".github"` → output vuoto | [ ] |

---

## Prima di iniziare

> Non avviare il Passo A finché questi controlli non sono completati e documentati.

- [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P35-coding-plan.md`
- [ ] Verificare di essere sul branch `refactoring-architettura`:
  ```
  git branch --show-current
  ```

### BL1 — Baseline build

- [ ] `npm run build` → exit 0
  > Esito BL1 build: _

### BL2 — Baseline test

- [ ] `npm run test:run` → tutti i test passed — annotare il numero:
  > Esito BL2 test: _ / _ passed

### BL3 — Baseline TypeScript

- [ ] `npx tsc --noEmit` → 0 errori
  > Esito BL3 tsc: _

### BL4 — Verifica stato `App.tsx`

- [ ] Verificare che il gate `needsOnboarding` e l'import `OnboardingFlow` siano già presenti in `App.tsx`:
  ```
  grep -n "needsOnboarding\|OnboardingFlow" src/App.tsx
  ```
  > Esito BL4: gate e import [ ] presenti / [ ] mancanti (segnalare se mancanti)

### BL5 — Verifica assenza `onboarding_completed` in `UserPreferences`

- [ ] Verificare che la chiave non sia già presente:
  ```
  grep "onboarding_completed" src/lib/supabase/types.ts
  ```
  > Esito BL5: [ ] assente (procedere con Passo A) / [ ] già presente (saltare Passo A)

---

## Passo A — `src/lib/supabase/types.ts`: aggiunta `onboarding_completed`

> Prerequisito: BL1–BL5 verificati.
> Perimetro: solo l'interfaccia `UserPreferences`. Nessun altro tipo modificato.

### A1 — Aggiungere la chiave opzionale

- [ ] Aggiungere `onboarding_completed?: boolean` in fondo a `UserPreferences`, dopo `talkback_manual_override`

### A2 — Aggiornare il commento

- [ ] Aggiornare il commento sopra l'interfaccia da «Esattamente 28 chiavi» a «29 chiavi — 28 da P25 §3.1 Opzione 2 + onboarding_completed aggiunta da P35»

### Gate A

- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run build` → exit 0

---

## Passo B — `src/context/AuthContext.tsx`: aggiunta `completeOnboarding()`

> Prerequisito: Gate A verificato.
> Perimetro: interfaccia `AuthContextValue`, corpo del provider, valore del context.

### B1 — Aggiornare `AuthContextValue`

- [ ] Aggiungere `completeOnboarding: () => void` all'interfaccia `AuthContextValue`, dopo `needsOnboarding: boolean`

### B2 — Implementare la funzione nel provider

- [ ] Aggiungere `completeOnboarding` come `useCallback` nel corpo di `AuthProvider`; la funzione chiama `setNeedsOnboarding(false)` senza effetti collaterali su Supabase

### B3 — Aggiungere al valore del context

- [ ] Aggiungere `completeOnboarding` al valore restituito dal `useMemo` del context, dopo `needsOnboarding`

### Gate B

- [ ] `npm run build` → exit 0
- [ ] Verifica presenza:
  ```
  grep -n "completeOnboarding" src/context/AuthContext.tsx
  ```
  > Atteso: almeno 3 righe (interfaccia, implementazione, valore context)

---

## Passo C — SQL: RPC `seed_default_categories`

> Prerequisito: Gate B verificato.
> Perimetro: creazione file SQL + applicazione a Supabase. Nessun file TypeScript modificato.

### C1 — Creare il file SQL

- [ ] Creare `docs/5 - sql/P35-seed-default-categories.sql` con la funzione `seed_default_categories()`:
  - Tipo: `RETURNS void`, attributo `SECURITY DEFINER`
  - Logica: itera sulle 18 categorie di `DEFAULT_CATEGORIES`; per ciascuna verifica l'esistenza di una riga con lo stesso `nome`, `tipo` e `predefinita = true` con `user_id IS NULL`; inserisce solo le righe mancanti
  - Permessi: `GRANT EXECUTE ON FUNCTION seed_default_categories() TO authenticated`

### C2 — Applicare la SQL a Supabase

- [ ] Aprire Supabase Dashboard → SQL Editor e applicare il contenuto di `P35-seed-default-categories.sql`
  > Esito C2: [ ] applicata con successo / [ ] errore (annotare)

### Gate C

- [ ] Verificare che `seed_default_categories` compaia tra le funzioni disponibili in Supabase:
  ```
  select proname from pg_proc where proname = 'seed_default_categories';
  ```
  > Atteso: 1 riga restituita.

---

## Passo D — `src/lib/supabase/repositories/categorie.ts`: aggiunta `seedDefaultCategories()`

> Prerequisito: Gate C verificato (la RPC deve esistere su Supabase prima del test runtime).
> Perimetro: solo aggiunta in coda al file; gli export esistenti sono invariati.

### D1 — Aggiungere la funzione

- [ ] Aggiungere in fondo al file la funzione esportata `seedDefaultCategories()`:
  - Chiama `supabase.rpc('seed_default_categories')`
  - In caso di errore, rilancia un `RepositoryError` con il messaggio ricevuto
  - Restituisce `Promise<void>`

### D2 — Verifica export

- [ ] Verificare che la funzione sia esportata correttamente:
  ```
  grep -n "seedDefaultCategories" src/lib/supabase/repositories/categorie.ts
  ```
  > Atteso: presente come `export async function seedDefaultCategories`

### Gate D

- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run build` → exit 0

---

## Passo E — `src/test/smoke/test-utils.ts`: aggiornamento mock

> Prerequisito: Gate D verificato.
> Perimetro: solo aggiunta di `completeOnboarding` a `MockAuthState`. Nessuna modifica logica ai test.

### E1 — Aggiungere `completeOnboarding` al mock

- [ ] Aggiungere `completeOnboarding: () => {}` a `MockAuthState`, dopo `needsOnboarding`
- [ ] Verificare che `needsOnboarding: false` rimanga invariato nel mock (i test smoke esistenti non devono attivare il flusso di onboarding)

### Gate E

- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → 5/5 passed

---

## Passo F — `src/components/OnboardingFlow.tsx`: implementazione completa

> Prerequisito: Gate E verificato.
> Perimetro: sostituzione completa del placeholder con il componente a 6 passi.

### F1 — Struttura base

- [ ] Importare tutte le dipendenze: `useAuth`, `useAppData`, `updateField`, `updatePreference`, `seedDefaultCategories`, `create` (da conti), `toast`, `useScreenReader`, componenti UI
- [ ] Definire lo stato locale `currentStep` (intero da 1 a 6) e gli altri stati necessari (`nomeValue`, `valutaValue`, `isSaving`, `seedStatus`, stati del form conto)
- [ ] Implementare la struttura di rendering: switch su `currentStep` che restituisce il JSX del passo corrente
- [ ] Implementare l'indicatore di avanzamento visivo («Passo N di 5») con region `aria-live="polite"`
- [ ] Implementare la navigazione con `handleNext` e `handleBack`; il pulsante «Indietro» è disabilitato al passo 1 e nascosto al passo 6
- [ ] Implementare il `useEffect` per il focus sul titolo del passo corrente ad ogni cambio di `currentStep`

### F2 — Passo 1: Benvenuto

- [ ] Implementare il passo 1: titolo, descrizione app, riepilogo passi, pulsante «Inizia»
- [ ] Nessuna chiamata a Supabase
- [ ] Annuncio screen reader all'ingresso del passo

### F3 — Passo 2: Nome visualizzato

- [ ] Implementare lo stato `nomeValue` inizializzato da `useAuth().userSettings?.nomeVisualizzato ?? ''`
- [ ] Mostrare come placeholder la parte locale dell'email se il campo è vuoto
- [ ] Implementare il handler di avanzamento: chiama `updateField('nomeVisualizzato', nomeValue)`; blocca l'avanzamento fino a successo; mostra errore inline in caso di fallimento
- [ ] Verificare la pre-compilazione PA-5: se `nomeVisualizzato` è già valorizzato, il campo mostra il valore esistente

### F4 — Passo 3: Valuta preferita

- [ ] Implementare lo stato `valutaValue` inizializzato da `useAuth().userSettings?.valutaDefault ?? 'EUR'`
- [ ] Implementare il menu di selezione con i 7 codici ISO 4217 da PA-3 (EUR, USD, GBP, CHF, JPY, CAD, AUD)
- [ ] Implementare il handler di avanzamento: chiama `updateField('valutaDefault', valutaValue)`; stesso pattern di errore inline del passo 2
- [ ] Verificare la pre-selezione PA-5: se `valutaDefault` è già valorizzata, il menu mostra quella valuta

### F5 — Passo 4: Seed categorie

- [ ] Implementare `seedStatus: 'idle' | 'running' | 'done' | 'error'`
- [ ] Implementare il `useEffect` che si attiva all'ingresso del passo 4 (`currentStep === 4`) e chiama `seedDefaultCategories()`
- [ ] Stato `running`: spinner + messaggio «Stiamo preparando le categorie di spesa predefinite...» + live region screen reader
- [ ] Stato `done`: messaggio di conferma «Categorie pronte» + pulsante «Avanti» abilitato
- [ ] Stato `error`: messaggio di errore inline + pulsante «Riprova»; al click su Riprova chiama nuovamente `seedDefaultCategories()`
- [ ] Il pulsante «Avanti» è disabilitato fino a `seedStatus === 'done'`
- [ ] Verificare idempotenza PA-2: un secondo run del passo (dopo interruzione) non deve produrre errori

### F6 — Passo 5: Primo conto (saltabile)

- [ ] Al mount del passo, rilevare se `useAppData().accounts.length > 0` (PA-5)
- [ ] Se conti esistenti: mostrare il messaggio «Hai già un conto configurato», elenco dei conti e due pulsanti («Salta per ora» / «Aggiungi un altro conto»)
- [ ] Se nessun conto: mostrare direttamente il form con nome conto, tipo (select da `ACCOUNT_TYPE_LABELS`) e saldo iniziale (default 0)
- [ ] Implementare il handler «Crea conto e continua»: chiama `conti.create(datiConto)` con `valuta` derivata da `userSettings.valutaDefault`; in caso di errore, messaggio inline con retry
- [ ] Il pulsante «Salta per ora» avanza a `currentStep = 6` senza scritture Supabase
- [ ] Annuncio screen reader appropriato per entrambe le branch (conto esistente / form nuovo conto)

### F7 — Passo 6: Completamento

- [ ] Implementare la schermata di riepilogo con nome, valuta e indicazione «categorie pronte»
- [ ] Implementare il pulsante «Inizia a usare Zecchino»: si disabilita al click con indicatore visivo
- [ ] Step 6a: chiama `updatePreference('onboarding_completed', true)`; in caso di errore, mostra messaggio con retry e riabilita il pulsante
- [ ] Step 6b: al successo, chiama `refreshAll()` da `useAppData()`; pulsante rimane disabilitato
- [ ] Step 6c: al completamento di `refreshAll()`, chiama `completeOnboarding()` da `useAuth()`
- [ ] Verificare che `aria-busy="true"` sia impostato sul pulsante durante le operazioni asincrone

### F8 — Accessibilità

- [ ] Verificare che ogni transizione di passo aggiorni la region `aria-live="polite"` con «Passo N di 5»
- [ ] Verificare che il focus si sposti sul titolo del passo (`h2`) ad ogni transizione
- [ ] Verificare che i messaggi di errore inline abbiano `role="alert"`
- [ ] Verificare che il pulsante «Indietro» al passo 1 abbia `disabled` e `aria-disabled="true"`
- [ ] Verificare che `aria-busy="true"` sia impostato correttamente al passo 6

### Gate F (intermedio)

- [ ] `npm run build` → exit 0
- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npm run test:run` → 5/5 passed

---

## Verifica riprendibilità (PA-5)

> Questa sezione verifica il comportamento del flusso dopo interruzione simulata. Eseguire dopo Gate F.

- [ ] **Simulazione interruzione dopo passo 2**: applicare manualmente il valore `nome_visualizzato` nella tabella `impostazioni_utente` su Supabase → verificare che al rimount di `OnboardingFlow` il passo 2 mostri quel valore pre-compilato nel campo
- [ ] **Simulazione interruzione dopo passo 3**: applicare manualmente il valore `valuta_default = 'USD'` → verificare che al rimount il passo 3 mostri 'USD' pre-selezionato
- [ ] **Simulazione interruzione dopo passo 4 (seed già eseguito)**: con categorie template già presenti, verificare che al passo 4 il seed completi con successo (idempotenza) senza errori
- [ ] **Simulazione passo 5 con conto già presente**: con almeno un conto su Supabase, verificare che il passo 5 mostri il messaggio «Hai già un conto configurato» e il pulsante «Salta per ora»

---

## Verifica finale

- [ ] Il placeholder `return null` non è più presente come unico contenuto di `OnboardingFlow.tsx`
- [ ] `completeOnboarding` è presente nell'interfaccia `AuthContextValue` in `AuthContext.tsx`
- [ ] `onboarding_completed?: boolean` è presente in `UserPreferences` in `types.ts`
- [ ] `seedDefaultCategories` è esportata da `src/lib/supabase/repositories/categorie.ts`
- [ ] RPC `seed_default_categories` è applicata a Supabase e il grant è attivo per il ruolo `authenticated`
- [ ] I passi 1–6 di `OnboardingFlow` corrispondono alla specifica P35 §6
- [ ] La sequenza dei passi 6a → 6b → 6c è implementata nell'ordine corretto
- [ ] Il flusso non accede a `window.spark.kv.*` in nessun punto

---

## Checklist gate finale

| Gate | Atteso | Effettivo |
|---|---|---|
| `npm run build` | exit 0 | |
| `npx tsc --noEmit` | 0 errori | |
| `npm run test:run` | 5/5 passed | |
| `grep "return null" src/components/OnboardingFlow.tsx` | 0 risultati (placeholder rimosso) | |
| `grep "completeOnboarding" src/context/AuthContext.tsx` | ≥ 3 righe | |
| `grep "onboarding_completed" src/lib/supabase/types.ts` | 1 riga | |
| `grep "seedDefaultCategories" src/lib/supabase/repositories/categorie.ts` | ≥ 1 riga | |
| `grep "window.spark" src/components/OnboardingFlow.tsx` | 0 risultati | |
| `git diff --name-only HEAD \| grep ".github"` | output vuoto | |
