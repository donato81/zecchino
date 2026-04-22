# Project Analysis Report — Zecchino

> Analisi completa del progetto presente nel workspace, generata su richiesta. Documento read-only basato sui file effettivi presenti nel repository.

## 1. Sintesi generale

- **Tipo app**: Web SPA client-side React + TypeScript.
- **Stack**: React 19, Vite, TailwindCSS 4, shadcn/ui, Spark KV storage, D3, Recharts.
- **Entry point**: `src/main.tsx` → `src/App.tsx`.
- **Architettura**: monolite React con logica di business nel root component `App.tsx` (1810 righe). Nessun framework architetturale formalizzato.
- **Persistenza**: Spark KV tramite `useKV` di `@github/spark/hooks`.
- **Autenticazione**: PIN locale SHA-256 con dialog in `PinDialog.tsx`.
- **Stato del progetto**: MVP parzialmente implementato, con funzionalità core attive ma gap critici su cifratura reale e gestione ricorrenze.

## 2. Struttura del workspace

### Root rilevata
- `.github/` — configurazione SCF e framework
- `docs/` — documentazione di progetto
- `src/` — codice app
- `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js` — configurazione build
- `README.md`, `PRD.md`, numerosi audit/documenti di accessibilità

### File chiave
- `src/main.tsx` — mount React e error boundary
- `src/App.tsx` — applicazione principale, stato, UI, handler, tab-based navigation
- `src/lib/types.ts` — modelli dominio: Account, Transaction, Category, Budget, SavingsGoal
- `src/lib/helpers.ts` — calcoli saldi, CSV export, budget progress
- `src/lib/crypto.ts` — funzioni SHA-256 e AES-GCM (non utilizzate)
- `src/components/PinDialog.tsx` — setup e login PIN
- `src/components/AccountDialog.tsx` — creazione/modifica conti
- `src/components/TransactionDialog.tsx` — creazione/modifica movimenti
- `src/components/DataManagement.tsx` — export/import dati JSON
- `src/components/*` — interfaccia, dashboard, report, settings, dialog
- `src/hooks/*` — accessibilità, tastiere, mobile, list navigation

### Cartelle documentazione
- `docs/1 - projects/README.md`
- `docs/2 - coding plans/README.md`
- `docs/3 - todo lists/README.md`
- `docs/4 - reports/README.md`
- `docs/todo.md`
- `docs/api.md`
- `docs/architettura.md`

## 3. Funzionalità implementate

### 3.1 Autenticazione
- PIN globale configurabile e verificato con `verifyPin()`.
- `isSetupMode` abilita setup iniziale.
- PIN privato sblocca account con `isPrivato` ma non cifra realmente i dati.
- File rilevanti: `src/components/PinDialog.tsx`, `src/lib/crypto.ts`, `src/App.tsx`.

### 3.2 Conti bancari e contante
- CRUD conti con tipologie multiple: `bancario`, `prepagata`, `contanti`, `salvadanaio`, `privato`, `investimenti`, `credito`, `paypal`, `crypto`, `pensione`.
- Il conto contante è gestito come tipo di conto, nessuna specializzazione aggiuntiva.
- Dati conti salvati con `useKV<Account[]>('accounts', [])`.
- File rilevanti: `src/components/AccountDialog.tsx`, `src/components/AccountCard.tsx`, `src/lib/constants.ts`.

### 3.3 Transazioni
- CRUD movimenti: `entrata`, `uscita`, `trasferimento`.
- Trasferimenti gestiti con `contoDestinazioneId` e aggiornamento saldo dedotto/sommato.
- Flag ricorrente salvato, ma non è presente alcun generatore di transazioni future.
- File rilevanti: `src/components/TransactionDialog.tsx`, `src/App.tsx`, `src/lib/helpers.ts`.

### 3.4 Categorie
- Categorie predefinite create all’avvio se `categories` è vuoto.
- Gestione categorie presente in `CategoryManagement.tsx`.
- Le categorie sono usate per filtrare solo le uscite.
- File rilevanti: `src/components/CategoryManagement.tsx`, `src/lib/constants.ts`.

### 3.5 Dashboard / overview saldo
- Saldo totale calcolato con `getTotalBalance()`.
- Dashboard raggruppa conti per categorie e mostra velocemente filtri categoria.
- Mostra ultimo 10 movimenti.
- File rilevanti: `src/App.tsx`, componenti Budget/Account.

### 3.6 Storage dei dati
- Persistenza su Spark KV.
- `DataManagement.tsx` implementa export/import JSON.
- Non è presente database nativo come SQLite.

### 3.7 Navigazione
- Tab principale con sezioni `dashboard`, `transactions`, `reports`.
- Nessun router, tutto controllato da `activeTab` in App.
- Scorciatoie tastiera per navigazione e azioni rapide.

### 3.8 Autenticazione / sicurezza
- PIN globale è presente.
- PIN privato esiste come concetto ma non protegge cifratura reale.
- `crypto.ts` contiene metodi di cifratura AES ma non sono integrati nel flusso.

## 4. Analisi tecnica

### 4.1 Pattern di design
- Il progetto usa un pattern React monolitico.
- Componenti presentational e custom hooks sono presenti, ma `App.tsx` funge da controller unico.
- `useKV` funge da persistenza globale, ma non è astratta dietro interfaccia custom.

### 4.2 Gestione dello stato
- Stato globale distribuito in `App.tsx` con `useState` + `useKV`.
- Non esistono provider React dedicati o store esterno.
- Stato di UI (dialog aperti/modifica) e stato dominio sono mischiati.

### 4.3 Modelli dati
- `Account`: id, nome, tipo, saldoIniziale, valuta, isPrivato, dataCreazione.
- `Transaction`: id, data, importo, tipo, contoId, contoDestinazioneId?, categoriaId, descrizione, ricorrente, frequenzaRicorrenza?, cifrato.
- `Category`: id, nome, tipo, predefinita.
- `Budget`: id, nome, importoTarget, periodo, categoriaId?, contoId?, dataInizio, dataFine, attivo.
- `SavingsGoal`: id, nome, descrizione, importoTarget, importoCorrente, dataInizio, dataScadenza?, contoAssociato?, colore, icona, completato, dataCompletamento?.

### 4.4 Persistenza
- Uso di Spark KV via `useKV`.
- Backup JSON in `DataManagement.tsx` legge tutte le chiavi Spark.
- Non c’è storage cifrato di default.

### 4.5 Problemi evidenti
- `crypto.ts` definisce `encryptData` / `decryptData` ma nessun codice li invoca.
- Le transazioni ricorrenti non generano voci nel tempo.
- `App.tsx` è estremamente lungo e difficile da mantenere.
- `zod` e `react-hook-form` sono installati ma non usati.
- Pin hashing con SHA-256 senza salt.
- Cifratura AES derivata senza KDF sicuro.
- `generateId()` usa `Date.now()` e `Math.random()` invece di `uuid`.
- Filtri movimenti insufficienti.
- Nessun test automatico.

### 4.6 Qualità codice
- Naming coerente e comprensibile.
- Separazione logica parziale: `src/lib` è ben organizzato, ma il root `App.tsx` ha troppa responsabilità.
- Qualità media buona, ma la semplicità del codebase è compromessa da file eccessivamente grandi.

### 4.7 Test esistenti
- **Nessuno**.
- Non sono presenti file `*.test.*` / `*.spec.*`, né dipendenze di test.

## 5. GAP analysis

### 🔴 Critico
- Cifratura reale conto privato non implementata.
- Transazioni ricorrenti non auto-generate.
- KDF + salt per PIN/chiave AES mancanti.
- Validazione input incompleta.
- Conferma robusta su cancellazione conto.

### 🟡 Importante
- Filtri avanzati movimenti.
- Virtualizzazione/paginazione liste lunghe.
- Refactor `App.tsx` in componenti più piccoli.
- React Hook Form + Zod per validazione.
- Reset app / wipe dati chiaro.
- Categorie cancellazione sicura.
- Test base.

### 🟢 Nice to have
- Multivaluta reale.
- Ricerca globale.
- Allegati transazione.
- Export PDF.
- Sync cloud opzionale.
- PWA effettiva.
- i18n.
- Theme switch.

## 6. Piano d’azione suggerito

### Task immediati
1. Implementare la cifratura reale per transazioni private con PBKDF2 + AES-GCM.
2. Aggiungere la generazione automatica delle transazioni ricorrenti e la loro gestione temporale.
3. Scomporre `App.tsx` in `AppDataContext` / `AuthContext` / componenti tab-specifici.

### Roadmap in 3 fasi
- **Fase A (MVP)**: cifratura privata, validazione, ricorrenze, PIN salt/KDF, test base.
- **Fase B (completezza)**: filtri transazioni, paginazione, refactor, PWA, reset app, import CSV.
- **Fase C (polish)**: multivaluta, allegati, PDF, ricerca globale, i18n, sync cloud.

### Rischi tecnici
- Lock-in Spark KV.
- App.tsx troppo grande.
- Build con `--noCheck`.
- Claim PWA/cifratura non supportati.

### Suggerimenti specifici
- Usare `react-hook-form` + `zod` per tutti i form.
- Creare `src/lib/storage.ts` come astrazione di persistenza.
- Rimuovere dipendenze inutilizzate.
- Aggiungere test su `helpers.ts`, `crypto.ts`, `budget-alerts.ts`.

## 7. File rilevanti citati
- `src/App.tsx`
- `src/lib/types.ts`
- `src/lib/helpers.ts`
- `src/lib/crypto.ts`
- `src/components/PinDialog.tsx`
- `src/components/AccountDialog.tsx`
- `src/components/TransactionDialog.tsx`
- `src/components/DataManagement.tsx`
- `src/components/CategoryManagement.tsx`
- `src/lib/budget-alerts.ts`
- `src/components/BudgetDialog.tsx`
- `src/components/SavingsGoalDialog.tsx`

---

> Nota: l’analisi è basata sui file effettivi presenti nel repository e su ciò che ho potuto leggere direttamente dai componenti principali e dalle librerie incluse.
