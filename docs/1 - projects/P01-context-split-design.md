# P01 — Context Split: AppDataContext e AuthContext

> Documento di design. Nessun file viene modificato in questa fase.  
> Pacchetto: 1 (corrispondente alle Fasi 1 e 2 del piano di refactoring)  
> Data: 22 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

`src/App.tsx` è attualmente un file da **1812 righe** che fa tutto: gestisce i dati salvati sul dispositivo, controlla chi è autenticato, calcola i saldi, costruisce tutta l'interfaccia visiva e risponde agli input dell'utente.

Questo rende il file difficile da leggere, da modificare senza introdurre errori e da testare in isolamento.

Il Pacchetto 1 risolve il problema più urgente: estrarre le **due grandi sacche di stato** dall'App.tsx in file separati e indipendenti.

- **Contenitore dati** (`AppDataContext`): tutto ciò che riguarda conti, movimenti, budget e obiettivi — i dati che l'utente vede e modifica.
- **Contenitore autenticazione** (`AuthContext`): tutto ciò che riguarda PIN, accesso globale e sblocco del conto privato.

Al termine del Pacchetto 1, il comportamento dell'app è **identico** a prima. L'unica differenza è che lo stato non vive più tutto dentro `App.tsx` ma in due file dedicati che `App.tsx` usa come sorgenti.

---

## 2. Perimetro della modifica

### File creati

| Percorso | Scopo |
|---|---|
| `src/context/AppDataContext.tsx` | Contenitore stato dati e handler CRUD (Passo 1 + Passo 3 del piano) |
| `src/context/AuthContext.tsx` | Contenitore stato autenticazione e handler PIN (Passo 2 + Passo 4 del piano) |

La directory `src/context/` non esiste ancora: va creata.

### File modificati

| Percorso | Modifica |
|---|---|
| `src/App.tsx` | Rimozione delle righe di stato e handler migrati; aggiunta dei due provider e degli import dei context |

### File non toccati

Tutto il resto del progetto rimane invariato:

- `src/lib/` — tipi, costanti, helper, crypto, sound, haptic, screen-reader, budget
- `src/hooks/` — tutti gli hook esistenti
- `src/components/` — tutti i ~30 componenti già estratti
- `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`
- Tutta la directory `docs/`
- Tutta la directory `.github/`

---

## 3. Struttura del contenitore dati (`AppDataContext`)

Questo file raccoglie tutto lo stato relativo ai **dati dell'applicazione** — ovvero le informazioni che vengono salvate in modo persistente sul dispositivo dell'utente.

### 3.1 Stato persistito (salvato sul dispositivo)

Queste variabili usano `useKV`, ovvero sopravvivono alla chiusura del browser.

| Variabile | Tipo | Descrizione |
|---|---|---|
| `accounts` / `setAccounts` | Lista di conti (`Account[]`) | Tutti i conti dell'utente (conto corrente, contante, privato, ecc.) |
| `transactions` / `setTransactions` | Lista di movimenti (`Transaction[]`) | Tutti i movimenti registrati (entrate, uscite, trasferimenti) |
| `categories` / `setCategories` | Lista di categorie (`Category[]`) | Le categorie personalizzabili associate ai conti |
| `budgets` / `setBudgets` | Lista di budget (`Budget[]`) | I budget mensili impostati dall'utente |
| `savingsGoals` / `setSavingsGoals` | Lista di obiettivi (`SavingsGoal[]`) | Gli obiettivi di risparmio |
| `visibleCategories` / `setVisibleCategories` | Lista di ID (`string[]`) | Quali categorie sono visibili nella dashboard (filtro attivo) |
| `dismissedAlerts` / `setDismissedAlerts` | Lista di ID (`string[]`) | Alert budget che l'utente ha già chiuso (non mostrare di nuovo) |
| `budgetPercentages` / `setBudgetPercentages` | Mappa ID→percentuale (`Record<string, number>`) | Ultima percentuale di utilizzo notificata per ciascun budget (evita notifiche duplicate) |

### 3.2 Valori "sicuri" (wrapper null-coalescing)

Variabili derivate immediatamente dallo stato persistito. Garantiscono che il codice non riceva `null` o `undefined` nelle fasi iniziali di caricamento.

> **Implementazione**: questi cinque valori vanno definiti con `useMemo`, in modo che vengano ricalcolati solo quando cambia la variabile sorgente (es. `accounts`) e non ad ogni aggiornamento dell'app.

| Variabile | Variabile sorgente | Descrizione |
|---|---|---|
| `safeAccounts` | `accounts` | `accounts` oppure lista vuota `[]` |
| `safeTransactions` | `transactions` | `transactions` oppure `[]` |
| `safeCategories` | `categories` | `categories` oppure `[]` |
| `safeBudgets` | `budgets` | `budgets` oppure `[]` |
| `safeSavingsGoals` | `savingsGoals` | `savingsGoals` oppure `[]` |

### 3.3 Effetto di inizializzazione

| Trigger | Comportamento |
|---|---|
| Primo avvio (mount) | Se `categories` è vuota, popola automaticamente le categorie di default da `DEFAULT_CATEGORIES` (`src/lib/constants.ts`) |

### 3.4 Handler CRUD (Passi 3 del piano — si spostano dopo lo stato)

Questi handler vengono migrati in una fase successiva all'interno dello stesso `AppDataContext`:

| Handler | Cosa fa |
|---|---|
| `handleSaveAccount(account)` | Crea o aggiorna un conto |
| `handleSaveTransaction(transaction)` | Crea o aggiorna un movimento; controlla i budget |
| `checkBudgetNotifications(transactions)` | Verifica se un budget ha superato una soglia; mostra toast + suono |
| `handleSaveBudget(budget)` | Crea o aggiorna un budget |
| `handleSaveSavingsGoal(goal)` | Crea o aggiorna un obiettivo risparmio |
| `handleAddFundsToGoal(goal)` | Apre il dialog obiettivo in modalità modifica |
| `handleDeleteConfirm()` | Elimina il conto/movimento/budget/obiettivo selezionato |
| `handleExportCSV()` | Esporta i movimenti visibili in un file CSV |
| `toggleCategoryVisibility(id)` | Attiva/disattiva la visibilità di una singola categoria |
| `toggleAllCategories()` | Attiva/disattiva tutte le categorie in un colpo solo |
| `handleDismissBudgetAlert(id)` | Segna un alert budget come "già visto" |
| `handleViewBudget(id)` | Naviga al tab Reports e apre il budget selezionato |

---

## 4. Struttura del contenitore autenticazione (`AuthContext`)

Questo file raccoglie tutto lo stato relativo all'**identità dell'utente** — ovvero chi può accedere all'app e al conto privato.

### 4.1 Stato persistito (salvato sul dispositivo)

| Variabile | Tipo | Descrizione |
|---|---|---|
| `globalPinHash` / `setGlobalPinHash` | Testo (`string`) | Hash crittografico del PIN globale. Vuoto se il PIN non è ancora stato creato. |
| `privatePinHash` / `setPrivatePinHash` | Testo (`string`) | Hash crittografico del PIN per il conto privato. Vuoto se non ancora creato. |

### 4.2 Stato effimero (solo in memoria, si azzera alla chiusura)

| Variabile | Tipo | Descrizione |
|---|---|---|
| `isAuthenticated` | Vero/Falso | `true` dopo che l'utente ha inserito il PIN corretto |
| `isPrivateUnlocked` | Vero/Falso | `true` dopo che l'utente ha sbloccato il conto privato |
| `isSetupMode` | Vero/Falso | `true` solo al primo avvio, quando il PIN globale non esiste ancora |
| `showPinDialog` | Vero/Falso | Controlla se il dialog PIN globale è aperto |
| `showPrivatePinDialog` | Vero/Falso | Controlla se il dialog PIN privato è aperto |

### 4.3 Handler autenticazione (Passo 4 del piano — si spostano dopo lo stato)

Questi handler vengono migrati in una fase successiva all'interno dello stesso `AuthContext`:

| Handler | Cosa fa |
|---|---|
| `handleGlobalPinSubmit(pin)` | In setup: crea il PIN e autentica. In login: verifica il PIN e autentica. Gestisce suono, haptic, toast e annuncio screen reader. |
| `handlePrivatePinSubmit(pin)` | In setup: crea il PIN privato e sblocca il conto. In login: verifica il PIN e sblocca. Gestisce suono, haptic, toast e annuncio del saldo al screen reader. |

> **Nota su `handlePrivatePinSubmit`**: questo handler usa `visibleAccounts` e `visibleTransactions` per annunciare il saldo via screen reader dopo lo sblocco. Questi dati derivano da `AppDataContext`. La dipendenza trasversale viene risolta con il pattern **callback opzionale**: il context auth riceve una `onUnlocked?: (balance: number) => void` che il chiamante può iniettare, oppure l'annuncio viene spostato come side-effect in `App.tsx`. La decisione finale è nel Passo 4.

---

## 5. Cosa NON si sposta in questo pacchetto

Il Pacchetto 1 crea i due contenitori e vi sposta **solo lo stato e gli handler** elencati sopra. Le seguenti parti di `App.tsx` rimangono invariate e verranno affrontate nei pacchetti successivi:

| Elemento | Dove rimane | Pacchetto previsto |
|---|---|---|
| `showAccountDialog`, `showTransactionDialog`, `showBudgetDialog`, ecc. | `App.tsx` | P02 (estrazione DialogsOverlay) |
| `editingAccount`, `editingTransaction`, `editingBudget`, `editingSavingsGoal` | `App.tsx` | P02 |
| `deletingItem` | `App.tsx` | P02 |
| `activeTab`, `previousTab`, `chartPeriod` | `App.tsx` | P02/P03 |
| `showKeyboardHelp` | `App.tsx` | P02 |
| Tutti i `useMemo` (valori derivati) | `App.tsx` | P02 → `use-visible-data.ts` |
| Tutti gli effetti `useEffect` tab-change e delete-dialog | `App.tsx` | P02/P03 |
| `recentTransactionsNav`, `allTransactionsNav` | `App.tsx` | P02 con i tab |
| `useKeyboardShortcuts` (configurazione 15 shortcut) | `App.tsx` | P03 → `use-app-shortcuts.ts` |
| Tutto il JSX (AuthScreen, AppHeader, DashboardTab, TransactionsTab, ReportsTab, DialogsOverlay) | `App.tsx` | P02–P04 |

---

## 6. Come `App.tsx` si collega ai due nuovi file

Al termine del Pacchetto 1, `App.tsx` non contiene più lo stato che ha spostato nei context. Lo **usa** invece attraverso due meccanismi:

### 6.1 Provider (contenitore)

I due nuovi file espongono ciascuno un **Provider**: un componente React invisibile che "avvolge" l'app e mette a disposizione lo stato a tutti i componenti figli.

```tsx
// src/App.tsx — struttura dopo il Pacchetto 1
function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        {/* tutto il resto dell'app */}
      </AppDataProvider>
    </AuthProvider>
  )
}
```

`AuthProvider` viene messo all'esterno perché `AppDataContext` non dipende dall'autenticazione per conservare i dati; è `use-visible-data` (Passo 5, pacchetto futuro) a filtrare i dati in base allo stato auth.

### 6.2 Hook di accesso

I due file espongono anche un **hook** (funzione speciale di React) per leggere i dati da qualsiasi componente figlio:

| Hook | Cosa restituisce |
|---|---|
| `useAppData()` | Tutto lo stato dati + handler CRUD |
| `useAuth()` | Tutto lo stato auth + handler PIN |

`App.tsx` (e i componenti futuri) chiameranno questi hook invece di tenere lo stato localmente.

### 6.3 Nessun cambio visivo o funzionale

Per l'utente finale nulla cambia: i dati vengono ancora letti e scritti nelle stesse chiavi KV (`'accounts'`, `'global-pin-hash'`, ecc.), i PIN funzionano allo stesso modo, i toast e i suoni sono identici. La differenza è solo organizzativa: il codice è distribuito in file con responsabilità chiare.

---

## 7. Criteri di verifica

Dopo aver implementato il Pacchetto 1, eseguire i seguenti controlli nell'app:

1. **Autenticazione intatta**: aprire l'app, inserire il PIN globale corretto → l'app si sblocca normalmente. Inserire un PIN errato → appare il toast di errore.

2. **Dati persistiti**: dopo aver aggiunto un conto o un movimento, chiudere e riaprire l'app (F5 nel browser) → i dati sono ancora presenti.

3. **Conto privato**: sbloccare il conto privato con il PIN → il conto appare nella dashboard e il saldo viene annunciato dallo screen reader (se attivo).

4. **Console browser senza errori**: aprire gli strumenti sviluppatore (F12) → nessun errore rosso in console durante la navigazione normale.

5. **Categorie default al primo avvio**: aprire l'app in una sessione pulita (localStorage svuotato) → le categorie di default appaiono automaticamente senza azione dell'utente.

---

## 8. Rischi e note

### R1 — Dipendenza circolare tra AuthContext e dati visibili

`handlePrivatePinSubmit` (AuthContext) usa `visibleAccounts` e `visibleTransactions` per annunciare il saldo. Questi valori derivano da `AppDataContext`. Importare `AppDataContext` dentro `AuthContext` creerebbe una dipendenza circolare.

**Soluzione**: Il contesto auth riceve una callback opzionale `onUnlocked?: (balance: number) => void`. Chi chiama il dialog PIN (in futuro `DialogsOverlay` o `App.tsx`) inietta la callback calcolando il saldo dai dati disponibili. In alternativa: l'annuncio del saldo viene gestito come `useEffect` in `App.tsx` che reagisce al cambio di `isPrivateUnlocked`. Entrambe le soluzioni sono valide; la scelta va documentata nel Passo 4.

### R2 — `deletingItem` non è ancora nel context

`handleDeleteConfirm` (da spostare in `AppDataContext`) legge `deletingItem`, che è uno stato UI di `App.tsx`. Finché `deletingItem` non viene spostato, la funzione riceverà questo valore come **parametro** anziché leggerlo direttamente dal context.

**Soluzione applicata nel piano**: `handleDeleteConfirm` accetta `item: { type, id }` come parametro esplicito nel Passo 3.

### R3 — `handleViewBudget` usa setter UI

`handleViewBudget` chiama `setActiveTab`, `setEditingBudget`, `setShowBudgetDialog` — tutti stati ancora in `App.tsx`. Come per R2, la funzione accetterà una callback `onNavigate` fino a quando questi setter non saranno nei context corretti.

### R4 — Ordine dei provider

`AuthProvider` deve essere esterno a `AppDataProvider` nella gerarchia React. Se l'ordine viene invertito, il `useAppData()` potrebbe essere chiamato fuori dal suo provider e generare un errore di runtime.

### R5 — Passi incrementali

Il Pacchetto 1 si implementa in **4 passi distinti** (1, 2, 3, 4 del piano), non in un unico commit. Ogni passo deve superare la verifica prima di procedere al successivo. In particolare:

- **Passo 1** (stato KV dati) e **Passo 2** (stato auth) sono indipendenti e a rischio basso.
- **Passo 3** (handler CRUD) e **Passo 4** (handler PIN) dipendono dai rispettivi passi di stato e sono a rischio medio per le dipendenze trasversali descritte sopra.
