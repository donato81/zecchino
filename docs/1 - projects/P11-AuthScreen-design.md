# P11 — Estrazione `AuthScreen` come componente autonomo

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 11 (corrispondente al Passo 11 del piano di refactoring)  
> Data: 23 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Al termine del Passo 10, `App.tsx` conta **447 righe** e contiene ancora il blocco della schermata di autenticazione, la schermata principale (con navigazione tab e dialog overlay), oltre ai layer di composizione.

Il Passo 11 estrae il blocco JSX del ramo `!isAuthenticated` (righe **240–265**, 26 righe) in un componente dedicato: `src/components/AuthScreen.tsx`.

**Perché adesso**: come `AppHeader` (Passo 10), `AuthScreen` è un componente visivo privo di logica di business propria. Tutta la logica di autenticazione — hashing del PIN, verifica, transizione allo stato autenticato — è già incapsulata in `AuthContext` dai Passi 2 e 4. `AuthScreen` è il "vestito visivo" che avvolge `PinDialog`: quattro layer decorativi di sfondo e un singolo `PinDialog` con le sue props. Il blocco estratto è il più piccolo dell'intera serie (26 righe, incluso il guard `if`).

**Il passo successivo (Passo 12 — `DialogsOverlay`)** sarà il più complesso rimasto: raccoglierà tutti i dialog modali sparsi nel JSX di `App.tsx`. `AuthScreen` viene estratto adesso proprio per sgomberare il percorso verso quel passo.

**Cosa cambia dopo questo passo**: `App.tsx` perde ~25 righe nette e scende da 447 a circa **422 righe**. Il ramo condizionale `!isAuthenticated` rimane in `App.tsx` come guard, ma il suo contenuto JSX diventa un singolo `<AuthScreen />`.

**Cosa NON cambia**: il comportamento visibile dell'app è **identico** a prima. Nessun handler di autenticazione viene modificato.

---

## 2. Perimetro della modifica

### File creati

| Percorso | Scopo |
|---|---|
| `src/components/AuthScreen.tsx` | Componente autonomo che incapsula lo sfondo di autenticazione e il `PinDialog` globale |

### File modificati

| Percorso | Modifica |
|---|---|
| `src/App.tsx` | Rimozione del blocco JSX interno al ramo `!isAuthenticated` (righe 241–265); sostituzione con `<AuthScreen />`; aggiunta import del componente |

### File non toccati

| Percorso | Motivo |
|---|---|
| `src/context/AuthContext.tsx` | Già espone tutti i valori necessari; nessuna modifica richiesta |
| `src/context/AppDataContext.tsx` | `AuthScreen` non dipende dai dati applicazione |
| `src/hooks/use-visible-data.ts` | Non usato da `AuthScreen` |
| `src/hooks/use-app-shortcuts.ts` | Shortcut globali invariate |
| `src/components/AppHeader.tsx` | Già estratto nel Passo 10; invariato |
| `src/components/TransactionsTab.tsx` | Già estratto nel Passo 7; invariato |
| `src/components/DashboardTab.tsx` | Già estratto nel Passo 8; invariato |
| `src/components/ReportsTab.tsx` | Già estratto nel Passo 9; invariato |
| `src/components/PinDialog.tsx` | Importato da `AuthScreen`; invariato — solo consumato, non modificato |
| `src/components/SkipLink.tsx` | Importato da `AuthScreen`; invariato |
| `docs/`, `.github/` | Invariati |

---

## 3. Struttura del componente

`AuthScreen` non riceve props dall'esterno. Legge tutto direttamente da `useAuth()`. Il componente è composto da due soli elementi.

### 3.1 Elemento 1 — Sfondo a gradiente

Il contenitore esterno è un `<>` (Fragment) con due figli: `<SkipLink />` e il `<div>` principale. Il Fragment è necessario per mantenere `<SkipLink />` fuori dal contenitore posizionato (`relative overflow-hidden`).

**Contenitore principale (`<div>` esterno)**:

| Attributo | Valore |
|---|---|
| `className` | `"min-h-screen flex items-center justify-center relative overflow-hidden bg-background touch-manipulation"` |
| `role` | `"main"` |
| `aria-label` | `"Schermata di autenticazione Zecchino"` |

**Layer decorativi interni** (quattro `<div>` con `aria-hidden="true"`):

| # | Tipo | Descrizione visiva |
|---|---|---|
| 1 | Gradiente solido | `bg-gradient-to-br from-primary/90 via-secondary/80 to-accent/90` — copre l'intera area |
| 2 | Radial gradients | Due cerchi radiali con trasparenza bianca (~15% e ~12%) agli angoli 30/50% e 70/80% |
| 3 | Griglia | Pattern a linee bianche 50×50 px con `mask-image` ellittico per effetto dissolvenza ai bordi |
| 4 | Cerchio pulsante | Radial gradient al centro con `animate-pulse` e `animationDuration: '4s'` (inline style) |

⚠️ Tutti e quattro i layer hanno `aria-hidden="true"`: sono puramente decorativi.  
⚠️ Il layer 4 ha `style={{ animationDuration: '4s' }}` come inline style React — va preservato esattamente.

### 3.2 Elemento 2 — `PinDialog` condizionale

Il `PinDialog` è renderizzato direttamente dentro il contenitore principale, **non** è condizionato da `{showPinDialog && ...}` nel JSX — la prop `open` gestisce la visibilità internamente al componente.

**Props passate a `PinDialog`**:

| Prop | Valore | Provenienza |
|---|---|---|
| `open` | `{showPinDialog}` | `useAuth()` |
| `title` | `{isSetupMode ? 'Imposta PIN Globale' : 'Inserisci PIN'}` | `useAuth()` — condizionale su `isSetupMode` |
| `description` | `{isSetupMode ? "Crea un PIN per proteggere l'applicazione" : "Inserisci il tuo PIN per accedere"}` | `useAuth()` — condizionale su `isSetupMode` |
| `onSubmit` | `{handleGlobalPinSubmit}` | `useAuth()` |
| `confirmMode` | `{isSetupMode}` | `useAuth()` |

⚠️ La stringa nella `description` del ramo `isSetupMode` contiene un apostrofo escaped (`\'`): va preservato o convertito in `"Crea un PIN per proteggere l'applicazione"` (entrambe le forme sono equivalenti in JSX).  
⚠️ Non aggiungere props non presenti nell'originale (es. non aggiungere `aria-label` al `PinDialog` se non è nell'originale).

---

## 4. Dipendenze complete del componente

```
AuthScreen
├── useAuth()
│   ├── showPinDialog         → prop `open` di PinDialog
│   ├── isSetupMode           → discrimina title, description, confirmMode
│   └── handleGlobalPinSubmit → prop `onSubmit` di PinDialog
├── Componenti
│   ├── SkipLink    (@/components/SkipLink)
│   └── PinDialog   (@/components/PinDialog)
└── (nessun import da @/lib/*, @/hooks/*, @/context/AppDataContext)
```

`AuthScreen` **non** dipende da:
- `useAppData()` — nessun dato applicazione necessario
- `useVisibleData()` — nessun dato derivato necessario
- `useIsMobile()` — nessun comportamento responsivo proprio
- `soundSystem` / `hapticSystem` — il feedback audio/aptico è gestito dentro `handleGlobalPinSubmit` in `AuthContext`, non qui
- Componenti UI (`Button`, `Tooltip`, ecc.) — non presenti nel blocco
- Icone Phosphor — non presenti nel blocco

**Valori di `useAuth()` verificati su `src/context/AuthContext.tsx`**:

| Campo | Tipo | Esposto in `AuthContextValue` |
|---|---|---|
| `showPinDialog` | `boolean` | ✔ riga 21 |
| `isSetupMode` | `boolean` | ✔ riga 19 |
| `handleGlobalPinSubmit` | `(pin: string) => Promise<void>` | ✔ riga 25 |

Tutti e tre i valori sono già esposti dal context — nessuna modifica ad `AuthContext.tsx` è necessaria.

---

## 5. Cosa il componente NON fa

- Non gestisce la logica di hashing del PIN (è in `handleGlobalPinSubmit` dentro `AuthContext`)
- Non decide se il login è riuscito (è `isAuthenticated`, calcolato in `AuthContext`)
- Non legge né scrive dati persistiti (nessun `useKV`)
- Non dipende da `AppDataContext`
- Non riceve props dall'esterno: tutte le dipendenze arrivano da `useAuth()`
- Non controlla la propria visibilità: il guard `if (!isAuthenticated)` rimane in `App.tsx` — è `App.tsx` a decidere quando renderizzare `<AuthScreen />`, non il componente stesso

---

## 6. Rischi e avvertenze

| Rischio | Mitigazione |
|---|---|
| Perdita dei layer decorativi dello sfondo | Copiare esattamente i quattro `<div aria-hidden>` dall'originale senza omissioni; verificare visivamente dopo il Passo B |
| Perdita dell'`animationDuration` inline | Il `style={{ animationDuration: '4s' }}` del quarto layer è un inline style React — non è una classe Tailwind e non viene rilevato da TypeScript se omesso; verificare visualmente l'animazione |
| `SkipLink` incluso dentro il contenitore posizionato | `<SkipLink />` deve restare **fuori** dal `<div>` con `relative overflow-hidden`, non dentro. Usare il Fragment `<>` come nell'originale |
| Il guard `if (!isAuthenticated)` viene spostato dentro `AuthScreen` | **Non fare questo**: il guard rimane in `App.tsx`. `AuthScreen` non controlla la propria visibilità |
| `isAuthenticated` importato dentro `AuthScreen` | `AuthScreen` non ha bisogno di `isAuthenticated`: non deve importare né usare questo valore |
| Regressioni nel flusso di login | Verificare entrambe le modalità (setup e login) dopo l'estrazione |
| Import inutilizzati in `App.tsx` dopo il Passo B | `PinDialog` e `SkipLink` rimangono importati in `App.tsx` anche dopo l'estrazione (il secondo `<SkipLink />` è nel ramo autenticato, riga 267; i dialog in `App.tsx` potrebbero ancora usarli) — non rimuovere import senza conferma TypeScript |

---

## 7. Criteri di verifica (definition of done)

### Schermata di login — struttura visiva

- [ ] Al primo avvio (nessun PIN impostato), compare la schermata `AuthScreen` con sfondo sfumato
- [ ] Lo sfondo a gradiente è visivamente identico alla versione pre-estrazione (quattro layer)
- [ ] Il quarto layer (`animate-pulse`) è animato con il ciclo corretto (~4 secondi)
- [ ] Il `PinDialog` è visibile sopra lo sfondo, centrato nella pagina

### Modalità setup (primo avvio — `isSetupMode === true`)

- [ ] Il `PinDialog` mostra il titolo "Imposta PIN Globale"
- [ ] Il `PinDialog` mostra la descrizione "Crea un PIN per proteggere l'applicazione"
- [ ] `confirmMode={true}` è passato al `PinDialog` (il dialog chiede di inserire il PIN due volte)
- [ ] Inserendo un PIN valido, viene creato l'hash e l'app transita alla schermata principale

### Modalità login (accessi successivi — `isSetupMode === false`)

- [ ] Il `PinDialog` mostra il titolo "Inserisci PIN"
- [ ] Il `PinDialog` mostra la descrizione "Inserisci il tuo PIN per accedere"
- [ ] `confirmMode={false}` è passato al `PinDialog`
- [ ] Inserendo il PIN corretto, l'app si sblocca
- [ ] Inserendo un PIN errato, compare il toast di errore e il dialog rimane aperto

### Accessibilità

- [ ] `<SkipLink />` è presente nel DOM come primo figlio del Fragment, **fuori** dal contenitore posizionato
- [ ] Il `<div>` esterno ha `role="main"` e `aria-label="Schermata di autenticazione Zecchino"`
- [ ] I quattro layer decorativi hanno tutti `aria-hidden="true"`

### Comportamento strutturale

- [ ] `App.tsx` non contiene più il JSX della schermata di autenticazione (solo `<AuthScreen />`)
- [ ] Il guard `if (!isAuthenticated)` rimane in `App.tsx`, non viene spostato in `AuthScreen`
- [ ] `AuthScreen` non contiene nessuna chiamata a `useAuth().isAuthenticated`

### Test di regressione

- [ ] Nessuna regressione nel tab Movimenti (`TransactionsTab`)
- [ ] Nessuna regressione nel tab Dashboard (`DashboardTab`)
- [ ] Nessuna regressione nel tab Report (`ReportsTab`)
- [ ] `AppHeader` continua a funzionare correttamente (saldo aggiornato, tooltip, pulsante scorciatoie)
