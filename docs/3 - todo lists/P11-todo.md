# P11 — Todo List: Estrazione `AuthScreen`

> Checklist operativa sequenziale per il Pacchetto 11.  
> Coding Plan di riferimento: `docs/2 - coding plans/P11-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P11-AuthScreen-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [x] Leggere `docs/2 - coding plans/P11-coding-plan.md` per intero
- [x] Prendere nota dell'ambiguità **AI1** (blocco da estrarre: JSX alle righe ~242–261 di `App.tsx`; il guard `if (!isAuthenticated)` a ~riga 240 rimane in `App.tsx`)
- [x] Prendere nota dell'ambiguità **AI2** (`useAuth()` espone `showPinDialog`, `isSetupMode`, `handleGlobalPinSubmit` senza alias — nessuna modifica ad `AuthContext.tsx`)
- [x] Prendere nota dell'ambiguità **AI3** (`SkipLink` a ~riga 267 e `PinDialog` a ~riga 345 sono ancora usati nel ramo autenticato → entrambi gli import rimangono necessari in `App.tsx`)
- [x] Prendere nota di **R1** (radice JSX è Fragment `<>` — obbligatorio; `<SkipLink />` deve stare **fuori** dal `<div>` con `relative overflow-hidden`)
- [x] Prendere nota di **R2** (`style={{ animationDuration: '4s' }}` nel quarto layer — non è una classe Tailwind, TypeScript non segnala se manca — verifica visiva obbligatoria)
- [x] Prendere nota di **R3** (il guard `if (!isAuthenticated)` rimane in `App.tsx`; `isAuthenticated` non va destructurato in `AuthScreen`)
- [x] Verificare di essere sul branch `refactoring-architettura`
- [x] Eseguire `npm run build` e confermare che compila senza errori **prima** di iniziare

---

## Passo A — Creazione `src/components/AuthScreen.tsx`

> **Prerequisito**: nessuno (P01–P10 già presenti nel branch).

### A.1 Creazione del file e import

- [x] Creare il file `src/components/AuthScreen.tsx` vuoto
- [x] Aggiungere import da `@/context/AuthContext`: `useAuth`
- [x] Aggiungere import da `@/components/SkipLink`: `SkipLink`
- [x] Aggiungere import da `@/components/PinDialog`: `PinDialog`
- [x] ⚠️ **Non importare** `useAppData`, `useVisibleData`, `useIsMobile` — `AuthScreen` non dipende dai dati applicazione
- [x] ⚠️ **Non importare** `soundSystem`, `hapticSystem` — il feedback è gestito dentro `handleGlobalPinSubmit` in `AuthContext`
- [x] ⚠️ **Non importare** componenti UI (`Button`, `Tooltip`, ecc.) né icone Phosphor — non presenti nel blocco

### A.2 Firma del componente

- [x] Aprire con:
  ```tsx
  export function AuthScreen() {
  ```
- [x] ⚠️ Nessuna props nella firma
- [x] ⚠️ Nessuno `useState` locale nel corpo del componente

### A.3 Sorgenti dati

- [x] Aggiungere destructuring da `useAuth()`:
  ```tsx
  const { showPinDialog, isSetupMode, handleGlobalPinSubmit } = useAuth()
  ```
- [x] ⚠️ **Non destructurare `isAuthenticated`** — il componente non controlla la propria visibilità (R3)
- [x] Verificare che i tre nomi corrispondano esattamente a quelli esposti da `AuthContextValue` (AI2)

### A.4 JSX del componente

- [x] Copiare il contenuto JSX di `src/App.tsx` righe **~242–261** come `return (…)`
- [x] ⚠️ **R1**: verificare che la radice del `return` sia un Fragment `<>...</>` — **non** un singolo `<div>`
- [x] ⚠️ **R1**: verificare che `<SkipLink />` sia il **primo figlio** del Fragment, **fuori** dal `<div>` con `relative overflow-hidden`
- [x] Verificare che il `<div>` esterno abbia `role="main"` e `aria-label="Schermata di autenticazione Zecchino"`
- [x] Verificare che i **quattro layer decorativi** siano tutti presenti e tutti abbiano `aria-hidden="true"`:
  - [x] Layer 1: `bg-gradient-to-br from-primary/90 via-secondary/80 to-accent/90` + `aria-hidden="true"`
  - [x] Layer 2: `bg-[radial-gradient(circle_at_30%_50%,...)]` + `aria-hidden="true"`
  - [x] Layer 3: `bg-[linear-gradient(...)] bg-[size:50px_50px]` con `mask-image` + `aria-hidden="true"`
  - [x] Layer 4: `animate-pulse` + `aria-hidden="true"`
- [x] ⚠️ **R2**: verificare che il layer 4 abbia `style={{ animationDuration: '4s' }}` — questo è un **inline style React**, non una classe Tailwind; TypeScript non segnala se manca
- [x] Verificare che `<PinDialog />` abbia esattamente cinque props:
  - [x] `open={showPinDialog}`
  - [x] `title={isSetupMode ? 'Imposta PIN Globale' : 'Inserisci PIN'}`
  - [x] `description={isSetupMode ? 'Crea un PIN per proteggere l\'applicazione' : 'Inserisci il tuo PIN per accedere'}`
  - [x] `onSubmit={handleGlobalPinSubmit}`
  - [x] `confirmMode={isSetupMode}`
- [x] ⚠️ **Non aggiungere** props non presenti nell'originale a `<PinDialog />`

### A.5 Verifica del Passo A

- [x] Salvare il file
- [x] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Verificare con grep: `grep "isAuthenticated" src/components/AuthScreen.tsx` → **zero risultati**
- [x] Verificare che `App.tsx` non sia stato modificato → il comportamento dell'app è invariato
- [x] ⚠️ Non procedere al Passo B fino a zero errori TypeScript

---

## Passo B — Modifica `src/App.tsx`

> **Prerequisito**: Passo A completato e verificato (`tsc --noEmit` a zero errori) ✓

### B.1 Aggiunta import di `AuthScreen`

- [x] Aprire `src/App.tsx`
- [x] Aggiungere tra gli import dei componenti estratti (dopo l'import di `AppHeader`, ~riga 40):
  ```tsx
  import { AuthScreen } from '@/components/AuthScreen'
  ```

### B.2 Rimozione del JSX interno al ramo `!isAuthenticated`

- [x] Individuare il Fragment `<>` (~riga 242) dentro `return (…)` del guard `if (!isAuthenticated)`
- [x] Rimuovere l'intero Fragment `<>...</>` dalle righe ~242 a ~261 (~20 righe di JSX)
- [x] ⚠️ Il guard `if (!isAuthenticated) {` (~riga 240) **rimane in `App.tsx`** — non va rimosso
- [x] ⚠️ Il `return (` e la `)` del ramo auth **rimangono in `App.tsx`** — non vanno rimossi

### B.3 Sostituzione con `<AuthScreen />`

- [x] Nella posizione esatta dove si trovava il Fragment rimosso, inserire:
  ```tsx
  <AuthScreen />
  ```
- [x] Verificare che la struttura risultante sia:
  ```tsx
  if (!isAuthenticated) {
    return (
      <AuthScreen />
    )
  }
  ```
- [x] ⚠️ Il guard `if (!isAuthenticated)` **rimane in `App.tsx`** — non spostarlo in `AuthScreen`

### B.4 Verifica import — non rimuovere `SkipLink` né `PinDialog`

- [x] ⚠️ **Non rimuovere** `import { SkipLink }` da `App.tsx` — usato a ~riga 267 nel ramo autenticato
- [x] ⚠️ **Non rimuovere** `import { PinDialog }` da `App.tsx` — usato a ~riga 345 per il dialogo PIN privato
- [x] Verificare che entrambi gli import siano ancora presenti dopo la modifica

### B.5 Verifica del Passo B

- [x] Salvare il file
- [x] Eseguire `npx tsc --noEmit` → zero errori TypeScript
- [x] Eseguire `npm run build` → compilazione riuscita
- [x] Verificare con grep: `App.tsx` contiene `<AuthScreen />`
- [x] Verificare con grep: `App.tsx` non contiene più `<div ... role="main" aria-label="Schermata di autenticazione Zecchino">`
- [x] Verificare con grep: `App.tsx` contiene `import { SkipLink }` e `import { PinDialog }`

---

## Verifica finale

### Test di compilazione

- [x] `npx tsc --noEmit` → zero errori
- [x] `npm run build` → zero errori, bundle generato

### Verifica grep post-implementazione

- [x] `grep "isAuthenticated" src/components/AuthScreen.tsx` → **zero risultati**
- [x] `grep "AuthScreen" src/App.tsx` → almeno 2 risultati (import + JSX `<AuthScreen />`)
- [x] `grep "SkipLink" src/App.tsx` → almeno 1 risultato (import + uso nel ramo autenticato)
- [x] `grep "PinDialog" src/App.tsx` → almeno 1 risultato (import + `showPrivatePinDialog`)

### Test manuale — Struttura visiva (da design §7)

- [ ] Al primo avvio (nessun PIN impostato), compare la schermata `AuthScreen` con sfondo sfumato
- [ ] Lo sfondo a gradiente è visivamente identico alla versione pre-estrazione (quattro layer)
- [ ] Il quarto layer (`animate-pulse`) è animato con il ciclo corretto (~4 secondi — non ~2 secondi default Tailwind)
- [ ] Il `PinDialog` è visibile sopra lo sfondo, centrato nella pagina

### Test manuale — Modalità setup (`isSetupMode === true`)

- [ ] Il `PinDialog` mostra il titolo "Imposta PIN Globale"
- [ ] Il `PinDialog` mostra la descrizione "Crea un PIN per proteggere l'applicazione"
- [ ] `confirmMode={true}` è passato al `PinDialog` (il dialog chiede di inserire il PIN due volte)
- [ ] Inserendo un PIN valido, viene creato l'hash e l'app transita alla schermata principale

### Test manuale — Modalità login (`isSetupMode === false`)

- [ ] Il `PinDialog` mostra il titolo "Inserisci PIN"
- [ ] Il `PinDialog` mostra la descrizione "Inserisci il tuo PIN per accedere"
- [ ] `confirmMode={false}` è passato al `PinDialog`
- [ ] Inserendo il PIN corretto, l'app si sblocca
- [ ] Inserendo un PIN errato, compare il toast di errore e il dialog rimane aperto

### Test manuale — Accessibilità

- [ ] `<SkipLink />` è presente nel DOM come primo figlio del Fragment, **fuori** dal contenitore posizionato
- [ ] Il `<div>` esterno ha `role="main"` e `aria-label="Schermata di autenticazione Zecchino"`
- [ ] I quattro layer decorativi hanno tutti `aria-hidden="true"`

### Test manuale — Comportamento strutturale

- [ ] `App.tsx` non contiene più il JSX della schermata di autenticazione (solo `<AuthScreen />`)
- [ ] Il guard `if (!isAuthenticated)` rimane in `App.tsx`, non è stato spostato in `AuthScreen`
- [ ] `AuthScreen` non contiene nessuna chiamata a `useAuth().isAuthenticated`

### Test di regressione

- [ ] `AppHeader` continua a funzionare correttamente (saldo aggiornato, tooltip, pulsante scorciatoie)
- [ ] Tab Movimenti (`TransactionsTab`) funziona correttamente — nessuna regressione
- [ ] Tab Dashboard (`DashboardTab`) funziona correttamente — nessuna regressione
- [ ] Tab Report (`ReportsTab`) funziona correttamente — nessuna regressione
- [ ] I dialog PIN privato funzionano correttamente nel ramo autenticato

---

**Nota stato verifica**: `npx tsc --noEmit`, `npm run build` e i controlli grep/strutturali sono stati eseguiti con esito positivo il 2026-04-23. I test manuali UI/accessibilità e i flussi PIN end-to-end restano da eseguire in ambiente interattivo locale, perché il repository non include un framework di test browser/e2e già configurato.
