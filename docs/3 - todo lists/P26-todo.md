# P26 — Todo List: Strato di accesso dati Supabase

> Pacchetto 26 — Blocco 2 migrazione Spark→Supabase (fondazione tecnica del layer dati)
> Piano di riferimento: `docs/2 - coding plans/P26-coding-plan.md`
> Design di riferimento: `docs/1 - projects/P26-strato-accesso-dati-supabase.md`
> Branch: `refactoring-architettura`
> Data inizio: 2026-05-01
> Data completamento: —

---

## Esito finale

- [ ] `@supabase/supabase-js` presente in `package.json`
- [ ] `npm run build` exit 0 con tutti i 9 file `src/lib/supabase/**` presenti
- [ ] `npm run test:run` → 5 passed
- [ ] Nessun import `@supabase/supabase-js` fuori da `src/lib/supabase/client.ts`
- [ ] Nessun file `src/` preesistente modificato (confermato con `git diff --name-only`)
- [ ] `toDb()` di `transazioni.ts` non include mai `cifrato` nel payload
- [ ] `toClient()` di ogni repository non include mai `user_id` nell'output
- [ ] `UserPreferences` in `types.ts` ha esattamente 28 chiavi
- [ ] `UserSettings` in `types.ts` non espone `user_id`, `id`, `created_at`, `updated_at`
- [ ] `RepositoryError` è distinguibile a runtime con `instanceof` o proprietà discriminante
- [ ] Nessun file in `.github/` modificato

---

## Prima di iniziare

- [ ] Leggere integralmente il coding plan `docs/2 - coding plans/P26-coding-plan.md`
- [ ] Verificare di essere sul branch `refactoring-architettura` (`git branch --show-current`)
- [ ] Verificare che `npm run build` sia exit 0 (baseline pre-P26)
- [ ] Verificare che `npm run test:run` → 5 passed (baseline pre-P26)
- [ ] Verificare che P25 sia completato su Supabase (trigger `trg_sync_cifrato` e `trg_propagate_cifrato` attivi, tabella `impostazioni_utente` presente)
- [ ] Verificare la presenza di `.env.local` con `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
  > Esito PR1 — .env.local: _da compilare_ (presente / mancante — chiavi trovate / mancanti)
- [ ] Verificare policy RLS su `categorie` per righe template (`user_id IS NULL`) — punto AI2 del coding plan:
  ```sql
  SELECT policyname, cmd, qual
  FROM pg_policies
  WHERE tablename = 'categorie';
  ```
  > Esito AI2 — RLS categorie template: _da compilare_
- [ ] Verificare e documentare la discrepanza schema DB vs tipi TS (punto AI1 del coding plan):
  - `conti`: campi extra `colore`, `icona`, `archiviato`, `ordine` → strategia: ignorati da `toClient()` ☐ confermata
  - `transazioni`: campi extra `note`, `ricorrenza_fine` → strategia: ignorati da `toClient()` ☐ confermata
  - `categorie`: campi extra `icona`, `colore`, `archiviata` → strategia: ignorati da `toClient()` ☐ confermata
  - `budget`: campo extra `notifica_soglia` → strategia: ignorato da `toClient()` ☐ confermata
  > Esito AI1 — discrepanza schema DB vs tipi TS: _da compilare_ (accettata / richiede estensione types.ts)

---

## Prerequisiti operativi

> Non iniziare il Passo A finché questi prerequisiti non sono verificati.

- [ ] Eseguire `npm install @supabase/supabase-js` nella root del progetto
- [ ] Verificare che `package.json` mostri la dipendenza in `dependencies`
- [ ] Eseguire `npm run build` → atteso exit 0 (solo package.json modificato)
- [ ] Verificare che `npm run test:run` → 5 passed (invariato)

---

## Passo A — Infrastruttura base (`client.ts` + `types.ts`)

> Prerequisito: completare la sezione "Prerequisiti operativi" e documentare gli esiti AI1, AI2, PR1.

### A1 — `src/lib/supabase/client.ts`

- [ ] Creare la cartella `src/lib/supabase/` (se non esiste)
- [ ] Creare `src/lib/supabase/client.ts` con:
  - [ ] Import `createClient` da `@supabase/supabase-js`
  - [ ] Lettura `import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_ANON_KEY`
  - [ ] Throw esplicito se una delle due variabili è assente o vuota
  - [ ] Export di un'unica istanza `supabase`
- [ ] Verificare che sia l'unico file che importa `@supabase/supabase-js`

### A2 — `src/lib/supabase/types.ts`

- [ ] Creare `src/lib/supabase/types.ts` con:
  - [ ] `RepositoryError` — wrapping di `PostgrestError`, distinguibile a runtime
  - [ ] `UserPreferences` — 28 chiavi del JSONB `preferences` (tipizzate secondo P25 §3.4):
    - [ ] 12 chiavi `display_*` presenti con tipo corretto
    - [ ] 12 chiavi `sr_*` presenti con tipo corretto
    - [ ] `audio_enabled`, `audio_volume` presenti
    - [ ] `talkback_adaptations` (oggetto), `talkback_manual_override` (null | ...) presenti
  - [ ] `UserSettings` — senza `user_id`, `id`, `created_at`, `updated_at`
  - [ ] `DbAccount` — tutti i campi reali di `conti` in snake_case (compresi `colore`, `icona`, ecc.)
  - [ ] `DbTransaction` — tutti i campi reali di `transazioni` in snake_case (compresi `note`, `cifrato`, ecc.)
  - [ ] `DbCategory` — tutti i campi reali di `categorie` in snake_case
  - [ ] `DbBudget` — tutti i campi reali di `budget` in snake_case
  - [ ] `DbSavingsGoal` — tutti i campi reali di `obiettivi_risparmio` in snake_case
  - [ ] I tipi `Db*` non vengono esportati fuori da `src/lib/supabase/`

### Gate intermedio Passo A

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → 5 passed
- [ ] Nessun import `@supabase/supabase-js` fuori da `client.ts` (verificare con grep su `src/`)
- [ ] `src/lib/supabase/types.ts` compilato senza errori TypeScript
- [ ] **Passo A completato** — documentare data e esito: _Data: ___ — Esito: ___

---

## Passo B — Repository di dominio

> Non iniziare questo passo finché il gate intermedio del Passo A non è stato firmato.
> I 5 repository possono essere scritti in qualsiasi ordine.

### B1 — `src/lib/supabase/repositories/conti.ts`

- [ ] Creare la cartella `src/lib/supabase/repositories/`
- [ ] Creare `src/lib/supabase/repositories/conti.ts` con:
  - [ ] `toClient(row: DbAccount): Account` — privato; mappa solo i campi di `Account` (ignora `colore`, `icona`, `archiviato`, `ordine`, `user_id`, `created_at`, `updated_at`)
  - [ ] `toDb(data: Partial<Omit<Account, 'id'>>): Partial<DbAccount>` — privato; converte camelCase → snake_case; non include `user_id`
  - [ ] `getAll(): Promise<Account[]>` — ordine `data_creazione ASC`
  - [ ] `getById(id: string): Promise<Account>` — lancia `RepositoryError` se non trovato
  - [ ] `create(data: Omit<Account, 'id'>): Promise<Account>` — inietta `user_id`
  - [ ] `update(id: string, data: Partial<Omit<Account, 'id'>>): Promise<Account>`
  - [ ] `remove(id: string): Promise<void>`

### B2 — `src/lib/supabase/repositories/transazioni.ts`

- [ ] Creare `src/lib/supabase/repositories/transazioni.ts` con:
  - [ ] `toClient(row: DbTransaction): Transaction` — privato; ignora `note`, `ricorrenza_fine`, `user_id`, ecc.; mappa `cifrato` incluso
  - [ ] `toDb(data: Partial<Omit<Transaction, 'id' | 'cifrato'>>)` — privato; **non include mai `cifrato`**
  - [ ] `getAll(filtri?): Promise<Transaction[]>` — filtri opzionali AND; ordine `data DESC`
  - [ ] `getById(id: string): Promise<Transaction>`
  - [ ] `create(data: Omit<Transaction, 'id' | 'cifrato'>): Promise<Transaction>`
  - [ ] `update(id: string, data: Partial<Omit<Transaction, 'id' | 'cifrato'>>): Promise<Transaction>`
  - [ ] `remove(id: string): Promise<void>`
  - [ ] Verificare che `cifrato` non compaia mai nel payload passato a Supabase

### B3 — `src/lib/supabase/repositories/categorie.ts`

- [ ] Creare `src/lib/supabase/repositories/categorie.ts` con:
  - [ ] `toClient(row: DbCategory): Category` — privato; ignora `icona`, `colore`, `archiviata`, `user_id`
  - [ ] `toDb(data)` — privato
  - [ ] `getAll(): Promise<Category[]>` — include template (`user_id IS NULL`)
  - [ ] `create(data: Omit<Category, 'id'>): Promise<Category>`
  - [ ] `update(id: string, data: Partial<Omit<Category, 'id'>>): Promise<Category>` — lancia `RepositoryError` su tentativo su riga template
  - [ ] `remove(id: string): Promise<void>` — lancia `RepositoryError` su tentativo su riga template

### B4 — `src/lib/supabase/repositories/budget.ts`

- [ ] Creare `src/lib/supabase/repositories/budget.ts` con:
  - [ ] `toClient(row: DbBudget): Budget` — privato; ignora `notifica_soglia`, `user_id`
  - [ ] `toDb(data)` — privato
  - [ ] `getAll(): Promise<Budget[]>` — ordine `data_inizio DESC`
  - [ ] `getById(id: string): Promise<Budget>`
  - [ ] `create(data: Omit<Budget, 'id'>): Promise<Budget>`
  - [ ] `update(id: string, data: Partial<Omit<Budget, 'id'>>): Promise<Budget>`
  - [ ] `remove(id: string): Promise<void>`

### B5 — `src/lib/supabase/repositories/obiettivi-risparmio.ts`

- [ ] Creare `src/lib/supabase/repositories/obiettivi-risparmio.ts` con:
  - [ ] `toClient(row: DbSavingsGoal): SavingsGoal` — privato
  - [ ] `toDb(data)` — privato
  - [ ] `getAll(): Promise<SavingsGoal[]>`
  - [ ] `getById(id: string): Promise<SavingsGoal>`
  - [ ] `create(data: Omit<SavingsGoal, 'id'>): Promise<SavingsGoal>`
  - [ ] `update(id: string, data: Partial<Omit<SavingsGoal, 'id'>>): Promise<SavingsGoal>`
  - [ ] `updateProgress(id: string, importoCorrente: number): Promise<SavingsGoal>` — atomica; aggiorna `importo_corrente` + `completato` + `data_completamento` in un'unica UPDATE
  - [ ] `remove(id: string): Promise<void>`

### Gate intermedio Passo B

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → 5 passed
- [ ] Nessun import `@supabase/supabase-js` fuori da `src/lib/supabase/client.ts`
- [ ] Nessun file `src/` preesistente modificato (`git diff --name-only` non mostra file fuori da `src/lib/supabase/` e `package.json`)
- [ ] **Passo B completato** — documentare data e esito: _Data: ___ — Esito: ___

---

## Passo C — Repository `impostazioni-utente`

> Non iniziare questo passo finché il gate intermedio del Passo B non è stato firmato.
> Dipendenza diretta: P25 completato su Supabase (tabella e trigger presenti).

### C1 — `src/lib/supabase/repositories/impostazioni-utente.ts`

- [ ] Creare `src/lib/supabase/repositories/impostazioni-utente.ts` con:
  - [ ] `toClient(row)` — privato; converte il record DB in `UserSettings` (senza `user_id`, `id`, `created_at`, `updated_at`); il campo `preferences` viene tipizzato come `UserPreferences`
  - [ ] `getOrCreate(): Promise<UserSettings>` — usa upsert o select+insert; crea con default P25 §3.4 se il record non esiste; non restituisce mai null
  - [ ] `updateField(campo, valore): Promise<UserSettings>` — per `nomeVisualizzato`, `valutaDefault`, `pinPrivatoHash`; non usare per `preferences`
  - [ ] `updatePreference(chiave: keyof UserPreferences, valore): Promise<UserSettings>` — merge JSONB chirurgico (`||`); non sovrascrive altre chiavi
  - [ ] `updatePinHash(hash: string | null): Promise<void>` — alias semantico di `updateField('pinPrivatoHash', hash)`
  - [ ] Verificare che `updatePreference` usi UPDATE SQL con operatore JSONB, non read-modify-write JS

### Gate finale (Passo C)

- [ ] `npm run build` exit 0
- [ ] `npm run test:run` → 5 passed
- [ ] Nessun import `@supabase/supabase-js` fuori da `src/lib/supabase/client.ts`
- [ ] Nessun file `src/` preesistente modificato (`git diff --name-only`)
- [ ] **Facoltativo** (se `.env.local` e P25 su Supabase): verifica manuale `getOrCreate()` → record restituito con 28 chiavi in `preferences`
- [ ] **Passo C completato** — documentare data e esito: _Data: ___ — Esito: ___

---

## Check finale

- [ ] Tutti i gate intermedi (A, B, C) firmati
- [ ] Tutti gli esiti AI1, AI2, PR1 documentati
- [ ] `npm run build` exit 0 finale
- [ ] `npm run test:run` → 5 passed finale
- [ ] Elenco completo dei file creati in `src/lib/supabase/`:
  - [ ] `client.ts`
  - [ ] `types.ts`
  - [ ] `repositories/conti.ts`
  - [ ] `repositories/transazioni.ts`
  - [ ] `repositories/categorie.ts`
  - [ ] `repositories/budget.ts`
  - [ ] `repositories/obiettivi-risparmio.ts`
  - [ ] `repositories/impostazioni-utente.ts`
- [ ] `docs/todo.md` aggiornato (P25 in completati, P26 in attivi)
- [ ] Nessun file `.github/` modificato
- [ ] **P26 completato** — documentare data: _Data: ___
