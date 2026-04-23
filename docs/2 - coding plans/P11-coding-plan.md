# P11 — Coding Plan: Estrazione `AuthScreen`

> Documento operativo. Nessun file di codice sorgente viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 11 — Creazione di `src/components/AuthScreen.tsx`  
> Design di riferimento: `docs/1 - projects/P11-AuthScreen-design.md`  
> Data: 23 aprile 2026

---

## Note preliminari

- I numeri di riga indicati sono **approssimativi** (±5 righe) e vanno verificati nell'editor prima di ogni modifica. Sono stati ricavati dal codice reale post-P10 sul branch `refactoring-architettura`.
- Questo pacchetto si implementa in **due passi distinti e sequenziali**: prima la creazione del componente, poi la sostituzione in `App.tsx`. Ogni passo va verificato con `npx tsc --noEmit` prima di procedere al successivo.
- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P10.
- P11 è il passo più compatto della serie: un solo file da creare, un solo file da modificare, **nessun context da toccare**. `AuthContext` espone già tutti i valori necessari senza alcuna modifica.
- File non toccati in questo passo:

  | File | Motivo |
  |---|---|
  | `src/context/AuthContext.tsx` | Già espone `showPinDialog`, `isSetupMode`, `handleGlobalPinSubmit`; nessuna modifica necessaria |
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

## Ambiguità rilevate

### AI1 — Righe esatte del blocco da estrarre in `App.tsx` post-P10

**Situazione**: il design indica il blocco `!isAuthenticated` come righe 240–265. Dopo P10 (`App.tsx` a 447 righe), il blocco reale è stato verificato sul codice effettivo.

**Risultato verifica**:

| Elemento | Riga effettiva in App.tsx post-P10 |
|---|---|
| `if (!isAuthenticated) {` | ~240 |
| `return (` | ~241 |
| `<>` (aperta Fragment) | ~242 |
| `<SkipLink />` (primo, nel ramo auth) | ~243 |
| `<div role="main" ...>` | ~244 |
| Layer decorativo 1 (gradient) | ~249 |
| Layer decorativo 2 (radial) | ~250 |
| Layer decorativo 3 (grid) | ~251 |
| Layer decorativo 4 (pulse + `animationDuration`) | ~252 |
| `<PinDialog .../>` | ~253–259 |
| `</div>` | ~260 |
| `</>` (chiusura Fragment) | ~261 |
| `)` (chiusura return) | ~262 |
| `}` (chiusura if) | ~263 |
| `return (` del ramo autenticato | ~265 |

**Blocco JSX da copiare in `AuthScreen`**: le righe 242–261 (contenuto interno al `return`, esclusi `return (` e `)` e la chiusura `}` del guard).

**Decisione**: il coding plan cita le righe 240–263 come blocco `if` completo; le righe 242–261 come JSX da spostare in `AuthScreen`. La struttura `if (!isAuthenticated) { return (<AuthScreen />) }` rimane in `App.tsx`.

### AI2 — Nomi esposti da `useAuth()` per i tre valori necessari

**Situazione**: il design §4 elenca `showPinDialog`, `isSetupMode`, `handleGlobalPinSubmit`. Va verificato che il codice di `AuthContext.tsx` usi esattamente questi nomi senza alias.

**Risultato verifica**: `src/context/AuthContext.tsx` espone:

| Campo | Tipo | Riga (approssimativa) |
|---|---|---|
| `showPinDialog` | `boolean` | riga 21 del tipo `AuthContextValue` |
| `isSetupMode` | `boolean` | riga 19 del tipo `AuthContextValue` |
| `handleGlobalPinSubmit` | `(pin: string) => Promise<void>` | riga 25 del tipo `AuthContextValue` |

**Decisione**: la destructuring in `AuthScreen.tsx` usa esattamente questi nomi, senza alias. Nessuna modifica ad `AuthContext.tsx`.

### AI3 — `SkipLink` e `PinDialog` rimangono necessari in `App.tsx` dopo l'estrazione

**Situazione**: il design §6 segnala il rischio di import inutilizzati in `App.tsx`. Va verificato se `SkipLink` e `PinDialog` sono usati nel ramo autenticato.

**Risultato verifica**:

| Import | Riga autenticata | Esito |
|---|---|---|
| `SkipLink` | ~267 — secondo `<SkipLink />` nel `return` autenticato | ✔ **rimane necessario** |
| `PinDialog` | ~345 — `<PinDialog open={showPrivatePinDialog} ...>` per il PIN privato | ✔ **rimane necessario** |

**Decisione**: **non rimuovere** né `import { SkipLink }` né `import { PinDialog }` da `App.tsx` nel Passo B. Entrambi rimangono in uso nel ramo autenticato.

---

## Rischi

### R1 — Fragment `<>` come radice obbligatorio — 🔴 Alto

Il `return` di `AuthScreen` deve avere un Fragment `<>...</>` come radice, non un singolo `<div>`. Il Fragment garantisce che `<SkipLink />` rimanga **fuori** dal contenitore `<div>` con `relative overflow-hidden`. Se si usa un `<div>` come radice, `<SkipLink />` finisce dentro il contenitore posizionato e smette di funzionare correttamente.

**Mitigazione**: copiare esattamente il contenuto JSX righe 242–261. Verificare dopo il Passo A che il DOM del componente abbia `<SkipLink />` come figlio diretto del Fragment e **non** come figlio del `<div>` principale.

### R2 — `animationDuration` inline nel quarto layer — 🔴 Alto

Il quarto layer decorativo ha `style={{ animationDuration: '4s' }}` come inline style React. Questo stile non è una classe Tailwind: TypeScript **non segnala errori** se viene omesso, e l'animazione non si interrompe visivamente in modo immediato (usa il valore default di `animate-pulse`). Il rischio è omissione silenziosa durante la copia.

**Mitigazione**: copiare la riga del quarto layer direttamente dall'originale (~riga 252 di `App.tsx`). Dopo il Passo B, verificare visivamente che il ciclo di pulsazione sia lento (~4 secondi), non quello default di Tailwind (~2 secondi).

### R3 — Il guard `if (!isAuthenticated)` rimane in `App.tsx` — 🔴 Alto

`AuthScreen` non deve verificare la propria visibilità. Il guard `if (!isAuthenticated) { return (<AuthScreen />) }` rimane in `App.tsx`. Spostare il guard dentro `AuthScreen` o aggiungere `isAuthenticated` al destructuring di `useAuth()` in `AuthScreen` è un errore architetturale.

**Mitigazione**: firma senza props, nessun destructuring di `isAuthenticated` in `AuthScreen`. Dopo il Passo B: `grep "isAuthenticated" src/components/AuthScreen.tsx` → zero risultati.

### R4 — Import non necessari in `AuthScreen` — 🟡 Medio

Aggiungere import da `useAppData`, `useVisibleData`, `useIsMobile`, `soundSystem`, `hapticSystem`, componenti UI (`Button`, `Tooltip`) o icone Phosphor viola il perimetro di `AuthScreen` e introduce dipendenze non documentate.

**Mitigazione**: importare solo `useAuth`, `SkipLink`, `PinDialog`. Nessun altro import.

### R5 — Props condizionali di `PinDialog` da preservare integralmente — 🟡 Medio

`PinDialog` riceve cinque props: `open`, `title`, `description`, `onSubmit`, `confirmMode`. Tutte e cinque sono presenti nell'originale. Non aggiungere né rimuovere props rispetto all'originale.

**Mitigazione**: copiare il blocco `<PinDialog ... />` esattamente dall'originale (~righe 253–259 di `App.tsx`). Non semplificare le props condizionali.

### R6 — Apostrofo nella `description` — 🟢 Basso

La stringa `description` del ramo `isSetupMode` nell'originale è `'Crea un PIN per proteggere l\'applicazione'` (apostrofo escaped in una stringa single-quoted). In JSX, l'apostrofo può essere reso anche come `"Crea un PIN per proteggere l'applicazione"` (stringa double-quoted). Entrambe le forme sono equivalenti.

**Mitigazione**: copiare l'originale senza modifiche, oppure usare la forma con doppio apice. Verificare che la stringa sia sintatticamente corretta dopo il Passo A (`tsc --noEmit` rileva errori di sintassi JSX).

---

## Passo A — Creazione `src/components/AuthScreen.tsx`

### Rischio: 🔴 Alto (il Passo B dipende da questo)
### Prerequisito: P01–P10 completati; branch `refactoring-architettura`

### A.1 Import

```tsx
import { useAuth } from '@/context/AuthContext'
import { SkipLink } from '@/components/SkipLink'
import { PinDialog } from '@/components/PinDialog'
```

> ✔ Import esatti: nessun import da `useAppData`, `useVisibleData`, `useIsMobile`, `soundSystem`, `hapticSystem`, componenti UI, o icone Phosphor.  
> ✔ Nessun import di `isAuthenticated` né di hook non elencati.

### A.2 Firma del componente

```tsx
export function AuthScreen() {
```

> ⚠️ Nessuna props nella firma — il componente è zero-props.  
> ⚠️ Nessuno `useState` locale nel corpo.

### A.3 Sorgenti dati

```tsx
  const { showPinDialog, isSetupMode, handleGlobalPinSubmit } = useAuth()
```

> ✔ Tre valori, esattamente quelli elencati in AI2.  
> ⚠️ **Non destructurare `isAuthenticated`** — il componente non controlla la propria visibilità (design §5 e R3).

### A.4 JSX del componente

Copiare il contenuto delle righe **242–261** di `src/App.tsx` come `return (…)`.

Verifiche obbligatorie durante la copia:

| Attributo / struttura | Riga originale in App.tsx | Note |
|---|---|---|
| Fragment `<>` come radice del `return` | ~242 | ⚠️ **R1** — obbligatorio, non usare `<div>` come radice |
| `<SkipLink />` come **primo figlio del Fragment**, fuori dal `<div>` | ~243 | ⚠️ **R1** — deve precedere il `<div>` esterno |
| `<div role="main" aria-label="Schermata di autenticazione Zecchino">` | ~244–248 | Attributi ARIA obbligatori |
| Layer 1: `bg-gradient-to-br from-primary/90 ...` + `aria-hidden="true"` | ~249 | ⚠️ preservare `aria-hidden` |
| Layer 2: `bg-[radial-gradient(circle_at_30% ...)]` + `aria-hidden="true"` | ~250 | ⚠️ preservare `aria-hidden` |
| Layer 3: `bg-[linear-gradient(...)] bg-[size:50px_50px]` + `aria-hidden="true"` | ~251 | ⚠️ preservare `aria-hidden` |
| Layer 4: `animate-pulse` + `style={{ animationDuration: '4s' }}` + `aria-hidden="true"` | ~252 | ⚠️ **R2** — `animationDuration` è inline style, non classe Tailwind |
| `<PinDialog open={showPinDialog} ... />` | ~253–259 | ⚠️ **R5** — cinque props, tutte condizionali ove previsto |
| `title={isSetupMode ? 'Imposta PIN Globale' : 'Inserisci PIN'}` | ~255 | Condizionale su `isSetupMode` |
| `description={isSetupMode ? 'Crea un PIN per proteggere l\'applicazione' : 'Inserisci il tuo PIN per accedere'}` | ~256 | ⚠️ **R6** — apostrofo nella stringa |
| `onSubmit={handleGlobalPinSubmit}` | ~257 | Valore diretto da `useAuth()` |
| `confirmMode={isSetupMode}` | ~258 | Condizionale su `isSetupMode` |

### Criterio di verifica — Passo A

- `npx tsc --noEmit` → zero errori TypeScript
- `grep "isAuthenticated" src/components/AuthScreen.tsx` → zero risultati
- Il componente esiste come file ma `App.tsx` non è ancora stato modificato → comportamento dell'app invariato

---

## Passo B — Modifica `src/App.tsx`

### Rischio: 🟡 Medio (dipende dal Passo A completato)
### Prerequisito: Passo A verificato con `tsc --noEmit` a zero errori

### B.1 Aggiunta import di `AuthScreen`

Aggiungere tra gli import dei componenti estratti (dopo l'import di `AppHeader`, ~riga 40):

```ts
import { AuthScreen } from '@/components/AuthScreen'
```

### B.2 Rimozione del JSX interno al ramo `!isAuthenticated` (~righe 242–261)

Rimuovere il contenuto JSX interno al `return (…)` del guard `!isAuthenticated` — cioè il Fragment `<>...</>` alle righe 242–261 (~20 righe di JSX).

```
<>
  <SkipLink />
  <div
    className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background touch-manipulation"
    role="main"
    aria-label="Schermata di autenticazione Zecchino"
  >
    <div className="absolute inset-0 bg-gradient-to-br ..." aria-hidden="true"></div>
    <div className="absolute inset-0 bg-[radial-gradient(...)]" aria-hidden="true"></div>
    <div className="absolute inset-0 bg-[linear-gradient(...)]" aria-hidden="true"></div>
    <div className="absolute inset-0 bg-[radial-gradient(...)] animate-pulse" style={{ animationDuration: '4s' }} aria-hidden="true"></div>
    <PinDialog
      open={showPinDialog}
      title={...}
      description={...}
      onSubmit={handleGlobalPinSubmit}
      confirmMode={isSetupMode}
    />
  </div>
</>
```

### B.3 Sostituzione con `<AuthScreen />`

Nella posizione esatta dove si trovava il Fragment rimosso, la struttura risultante deve essere:

```tsx
  if (!isAuthenticated) {
    return (
      <AuthScreen />
    )
  }
```

> ⚠️ Il guard `if (!isAuthenticated) { return (…) }` **rimane in `App.tsx`** — non va rimosso né spostato in `AuthScreen`.  
> ⚠️ Il secondo `<SkipLink />` (~riga 267 del ramo autenticato) rimane in `App.tsx` — non va rimosso.

### B.4 Verifica import — non rimuovere `SkipLink` né `PinDialog`

> ⚠️ **AI3 risolta**: sia `SkipLink` che `PinDialog` rimangono in uso nel ramo autenticato di `App.tsx`:
> - `SkipLink` a ~riga 267 (secondo `<SkipLink />` nel `return` autenticato)
> - `PinDialog` a ~riga 345 (`<PinDialog open={showPrivatePinDialog} ...>` per il PIN privato)
>
> **Non rimuovere** nessuno dei due import da `App.tsx`. TypeScript segnalerebbe errore se si tentasse comunque.

### Criterio di verifica — Passo B

- `npx tsc --noEmit` → zero errori TypeScript
- `npm run build` → compilazione riuscita
- `grep "isAuthenticated" src/components/AuthScreen.tsx` → zero risultati
- `App.tsx` contiene `<AuthScreen />` dentro il guard `!isAuthenticated`
- `App.tsx` non contiene più il Fragment `<>` + quattro layer decorativi dell'auth screen
- `App.tsx` contiene ancora `import { SkipLink }` e `import { PinDialog }` (usati nel ramo autenticato)
- Il secondo `<SkipLink />` (~riga 267) è presente nel JSX autenticato di `App.tsx`
- Il `<PinDialog open={showPrivatePinDialog} ...>` (~riga 345) è presente nel JSX autenticato

---

## Schema riepilogativo

| Passo | File | Operazione | Verifica |
|---|---|---|---|
| A | `AuthScreen.tsx` | Nuovo componente: 3 import, firma zero-props, destructuring `useAuth()`, JSX Fragment copiato da righe 242–261 | `tsc --noEmit` |
| B | `App.tsx` | +import `AuthScreen`; -~20 righe JSX auth; +`<AuthScreen />`; import `SkipLink` e `PinDialog` invariati | `tsc --noEmit` + `npm run build` |
