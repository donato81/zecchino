# P17 — Fix navigazione frecce e accessibilità liste

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 17  
> Data: 24 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Il report diagnostico post-P13 (`docs/4 - reports/Diagnostic-Analysis-Post-P13.md`, §2 e §7 priorità 3) classifica il problema come **"REGRESSIONE — Alto (accessibilità)"**: il meccanismo di navigazione con le frecce nelle liste del progetto Zecchino è strutturalmente non funzionante per gli utenti che dipendono da uno screen reader.

### 1.1 Situazione attuale per un utente con screen reader

Un utente che usa TalkBack su Android o VoiceOver su iOS e macOS per navigare l'app Zecchino si trova nella seguente condizione:

Quando la focus è su un qualsiasi elemento e preme `ArrowDown` o `ArrowUp`, accade una delle seguenti cose dal punto di vista dello screen reader:
- **Nulla** — l'utente non sente nessun annuncio.
- **Nessun movimento** — il cursore dello screen reader non si sposta.
- **Nessuna percezione del cambiamento** — anche se visivamente una riga della lista acquista un bordo colorato e un'ombra, questa variazione è puramente visiva e non viene comunicata all'albero di accessibilità.

La ragione è che il hook `src/hooks/use-list-navigation.ts` aggiorna solo uno stato React interno (`focusedIndex`) e applica classi CSS (`bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20`), ma non compie mai l'azione che attiva gli screen reader: spostare il focus DOM sull'elemento. Gli screen reader reagiscono agli eventi di focus nativo del sistema, non alle classi CSS.

In aggiunta, le righe delle liste non hanno attributi semantici (`tabIndex`, `role`, `aria-label`), quindi per un utente che naviga a tab non sono mai raggiungibili, e per uno screen reader in modalità di lettura lineare non hanno un nome accessibile che li distingua dal contenuto circostante.

### 1.2 Cosa si ottiene con questo passo

Al termine del Passo 17:

- Premere `ArrowDown` o `ArrowUp` sposta il focus DOM sull'elemento della lista corrispondente.
- TalkBack su Android annuncia il contenuto della riga quando il focus vi arriva, usando l'etichetta strutturata che descrive importo, tipo (entrata/uscita/trasferimento), descrizione, data e conto.
- VoiceOver su iOS e macOS annuncia la stessa informazione e permette di navigare la lista con i gesti di scorrimento standard.
- L'overlay visivo del focus (`src/components/FocusIndicator.tsx`) si aggancia alle righe delle liste, mostrando il tooltip contestuale già utilizzato per gli altri elementi interattivi.
- La navigazione con le frecce non si attiva quando un dialogo Radix è aperto (guard per la protezione dell'input nei form dei dialoghi).
- Le callback passate al hook non cambiano identità ad ogni render, eliminando il churn di ri-registrazione del listener.

### 1.3 Perché questo passo ha priorità alta

Il report indica questo fix come "Alto (a11y)" al punto 3 del piano d'azione. Zecchino ha una documentazione di accessibilità estesa (`docs/accessibility/`), supporto per TalkBack e VoiceOver, haptic feedback e sound system dedicati. Avere una funzionalità dichiarata come navigazione liste da tastiera che non funziona per gli utenti con screen reader è una contraddizione con quella priorità dichiarata. I Passi 15 e 16 hanno risolto i gate di qualità (lint) e sicurezza (vulnerabilità); questo passo affronta la lacuna di accessibilità strutturale.

**Il comportamento visivo esistente non cambia**: le classi CSS di highlight restano presenti e attive. Il fix aggiunge la dimensione DOM al meccanismo già esistente — non la sostituisce.

---

## 2. Perimetro della modifica

### 2.1 File da modificare

| File | Area toccata | Tipo di modifica |
|---|---|---|
| `src/hooks/use-list-navigation.ts` | Intero hook | Aggiunta focus DOM, guard dialogo, stabilizzazione callback |
| `src/components/DashboardTab.tsx` | Sezione "Movimenti Recenti" (lista `recentTransactions`) | Attributi di accessibilità sulle righe, data attribute, containerRef |
| `src/components/TransactionsTab.tsx` | Lista `sortedTransactions` | Attributi di accessibilità sulle righe, data attribute, containerRef |
| `src/components/FocusIndicator.tsx` | Condizione `handleFocusIn` | Estensione del selettore per includere `[data-list-item]` |

### 2.2 File non toccati

| File / Area | Motivazione |
|---|---|
| `src/hooks/use-keyboard-shortcuts.ts` | Non modificato — ma il documento descrive la sua relazione con `use-list-navigation.ts` per i listener concorrenti (§5) |
| `src/hooks/use-app-shortcuts.ts` | Non coinvolto |
| `src/context/AppDataContext.tsx` | Non coinvolto |
| `src/context/AuthContext.tsx` | Non coinvolto |
| `src/App.tsx` | Non coinvolto — il problema `useEffect` con dipendenze instabili (§3.4 del report) è separato e fuori perimetro di questo passo |
| `src/lib/` (tutti i file) | Non coinvolti |
| `src/components/` (tutti gli altri componenti) | Non coinvolti |
| `eslint.config.js` | Invariato — creato in P15 |
| `package.json` | Invariato — aggiornato in P16 |
| `tailwind.config.js`, `tsconfig.json`, `vite.config.ts` | Non coinvolti |
| `.github/` | Protetto da `framework-guard.instructions.md` |
| `docs/` (tutti i file di documentazione esistenti) | Non modificati in fase di coding — aggiornati solo in fase di documentazione del passo |

---

## 3. Dettaglio delle operazioni

### 3.1 `src/hooks/use-list-navigation.ts`

#### Il pattern "roving tabindex"

La tecnica corretta per rendere accessibile una lista di elementi navigabile con le frecce si chiama **roving tabindex** (tabindex scorrevole). Il principio è:

In una lista con N righe, in ogni momento solo **un elemento** ha `tabIndex=0` (è quindi raggiungibile con il tasto Tab e diventa il punto di ingresso della lista). Tutti gli altri elementi hanno `tabIndex=-1` (sono nell'albero DOM ma non raggiungibili con Tab, solo con le frecce). Quando l'utente preme `ArrowDown` o `ArrowUp`, l'elemento che diventa "attivo" passa da `tabIndex=-1` a `tabIndex=0`, e l'elemento precedente passa da `tabIndex=0` a `tabIndex=-1`. Contemporaneamente, il metodo `.focus()` viene chiamato sull'elemento appena attivato, spostando il focus DOM su di esso.

Il risultato è:
- **Navigazione con Tab**: l'utente entra nella lista e raggiunge direttamente l'elemento attivo corrente (non deve Tab-bettare attraverso ogni riga).
- **Navigazione con frecce**: l'utente si muove riga per riga all'interno della lista; ogni spostamento genera un evento `focus` reale sull'elemento, che attiva gli annunci dello screen reader.
- **Uscita dalla lista con Tab**: l'utente preme Tab e si sposta sull'elemento successivo fuori dalla lista.

Questo pattern è documentato nelle ARIA Authoring Practices Guide (ARIA APG) come il meccanismo raccomandato per widget di tipo `listbox`, `grid` e `tree`.

#### Chiamata a `.focus()` dopo aggiornamento indice

La modifica principale al hook è aggiungere, immediatamente dopo che `focusedIndex` viene aggiornato, una chiamata che individua l'elemento DOM corrispondente e chiama `.focus()` su di esso.

L'elemento target viene individuato tramite un attributo `data-index` che i componenti consumer (DashboardTab.tsx e TransactionsTab.tsx) dovranno aggiungere a ogni riga. La query avviene all'interno del container della lista (passato tramite `containerRef`), non su tutto il documento. Il percorso concreto è: partendo dal `containerRef`, cercare l'elemento con `data-list-item` e `data-index` uguale al nuovo indice, e chiamare `.focus()` su quell'elemento.

Questo deve avvenire dopo che React ha completato il rendering aggiornato del componente, ovvero in un `useEffect` che dipende da `focusedIndex` — non inline nell'handler dei tasti.

#### Aggiunta di `containerRef` per scoping del listener

Il hook già accetta un parametro opzionale `containerRef` nell'interfaccia, ma in `DashboardTab.tsx` e `TransactionsTab.tsx` non viene passato alcun ref: il listener si registra su `document`. Questo significa che la navigazione frecce è attiva su tutta la pagina in qualsiasi momento, compresi i momenti in cui il focus è dentro un dialogo Radix aperto.

La modifica consiste nel fare in modo che i componenti consumer creino un `useRef` puntato al container della lista e lo passino al hook. Il listener si registra così sul container specifico, non su `document`. Di conseguenza, il listener si attiva solo quando il focus è effettivamente all'interno di quel container — comportamento corretto.

Nota: il comportamento di fallback su `document` quando `containerRef` non viene fornito viene mantenuto per compatibilità, ma i consumer che gestiscono liste esposte all'utente devono sempre fornire il ref.

#### Guard per dialoghi aperti

Anche con `containerRef`, esiste un caso residuo che può causare interferenza: l'utente preme un tasto freccia mentre il focus è dentro un dialogo Radix aperto (es. TransactionDialog, AccountDialog, PinDialog). Radix gestisce i suoi dialoghi con un overlay che cattura il focus interno, ma il listener del hook potrebbe ricevere eventi bubble che risalgono fino al container.

Il report (§3.5) suggerisce la guard: verificare all'inizio dell'handler se è aperto un dialogo Radix (`document.querySelector('[data-state="open"][role="dialog"]')`). Se la query restituisce un elemento, l'handler esce senza fare nulla. Questa riga deve essere la prima istruzione dell'handler, prima di qualsiasi elaborazione del tasto.

Il controllo usa gli attributi che Radix applica automaticamente ai dialoghi aperti (`data-state="open"` sul contenitore del dialogo, `role="dialog"` o `role="alertdialog"` sull'elemento accessibile) — sono attributi stabili e non richiedono modifiche a nessun dialogo.

#### Stabilizzazione delle callback

Attualmente le callback `onEnter`, `onDelete`, `onEdit` vengono passate come funzioni inline nei componenti consumer. Questo significa che a ogni render del componente viene creata una nuova funzione con identità diversa. Poiché `handleKeyDown` dipende da queste callback nell'array di dipendenze di `useCallback`, ogni render provoca la creazione di un nuovo `handleKeyDown`. E poiché il `useEffect` di registrazione del listener dipende da `handleKeyDown`, il listener viene rimosso e re-registrato ad ogni render del componente.

Il churn non è la causa principale del bug, ma contribuisce a instabilità: se un keydown arriva proprio durante il frame di transizione in cui il vecchio listener è stato rimosso e il nuovo non è ancora registrato, l'evento viene perso.

La soluzione nel hook è usare un ref interno (chiamiamolo `callbacksRef`) che contiene le versioni più recenti di `onEnter`, `onDelete`, `onEdit`. L'`useEffect` di aggiornamento del ref si riesegue a ogni render (nessuna dipendenza da evitare), ma il listener viene registrato una sola volta (dipendendo solo da `containerRef` ed `enabled`). Dentro l'handler, le callback vengono lette dal ref invece che dalla closure. In questo modo il listener non viene mai rimosso e ri-registrato per via delle callback, solo per via di cambiamenti di `containerRef` o `enabled`.

I componenti consumer (DashboardTab.tsx e TransactionsTab.tsx) devono avvolgere le callback con `useCallback` nei rispettivi punti di chiamata del hook, usando dipendenze stabili. Questo è il pattern che `react-hooks/exhaustive-deps` (attivo da P15) suggerisce già come warning su quei componenti.

### 3.2 `src/components/DashboardTab.tsx`

#### Attributi sulle righe della lista "Movimenti Recenti"

La lista `recentTransactions` viene renderizzata nella sezione "Movimenti Recenti" della tab Dashboard. Ogni riga è attualmente un `<div>` con classi CSS condizionali per l'highlight, un `onClick` e un attributo `data-focus-info` già presente.

A ogni riga vanno aggiunti:

**`tabIndex={isFocused ? 0 : -1}`**  
Implementa il roving tabindex: la riga attiva (quella con `isFocused` vero) è raggiungibile con Tab; le altre sono nel DOM ma non nell'ordine Tab. Quando nessuna riga è attiva (stato iniziale, `focusedIndex === -1`), la prima riga potrebbe avere `tabIndex=0` di default per permettere l'ingresso nella lista — oppure si accetta che l'ingresso avvenga solo tramite Tab su un elemento esterno che poi attiva la prima freccia.

**`role="button"`**  
Dichiara semanticamente che la riga è un elemento interattivo attivabile. Gli screen reader annunciano il ruolo dopo il nome accessibile: "Movimento — Pranzo al ristorante — Uscita 32,50 € — 22 aprile — Conto corrente, bottone". Il ruolo `button` è appropriato perché la riga è attivabile con Enter/spazio per aprire il dialog di modifica. Un'alternativa valida è `role="listitem"` con un `role="list"` sul container, ma in quel caso le azioni (Enter per modificare, Delete per eliminare) devono essere dichiarate diversamente. Il report suggerisce `role="button"` come punto di partenza.

**`aria-label` descrittivo**  
Ogni riga deve avere un `aria-label` che contenga le informazioni essenziali del movimento in modo leggibile da screen reader. Il formato raccomandato è:

> `{tipo}: {descrizione o categoria}, {importo formattato}, {data formattata}, {nome conto}`

Dove `tipo` è "Entrata", "Uscita" o "Trasferimento"; `importo formattato` usa il formato valuta già disponibile tramite `formatCurrency`; `data formattata` usa `toLocaleDateString('it-IT')` già usato nel rendering.

Esempio concreto: `"Uscita: Supermercato, 45,90 €, 22 aprile 2026, Conto corrente"`

Questo formato è conciso ma completo. Evitare di includere istruzioni di navigazione nell'`aria-label` (come "Premi Enter per modificare"): quelle informazioni appartengono al `data-focus-info` già presente, non all'etichetta dell'elemento.

**`data-list-item`** e **`data-index={index}`**  
Due attributi data necessari per il targeting DOM del hook. `data-list-item` identifica l'elemento come riga di lista navigabile; `data-index={index}` permette al hook di trovare l'elemento corretto con una querySelector puntuale dopo l'aggiornamento dell'indice.

**`containerRef`**  
Il componente deve creare un `useRef<HTMLDivElement>(null)` e assegnarlo all'elemento container della lista (il `<div className="divide-y">` che racchiude le righe), poi passarlo al hook `recentTransactionsNav`. Questo è il container su cui il listener si registrerà.

#### Nessuna modifica alla logica di filtraggio o rendering

I dati visualizzati, l'ordine, il filtraggio per `useVisibleData`, il click handler esistente, i pulsanti Modifica ed Elimina già presenti: tutto rimane invariato. Le modifiche sono additive: si aggiungono attributi e ref, non si rimuove o riscrive nulla.

### 3.3 `src/components/TransactionsTab.tsx`

Le modifiche a `TransactionsTab.tsx` sono simmetriche a quelle di `DashboardTab.tsx`. La lista `sortedTransactions` nella tab Movimenti riceve gli stessi attributi: `tabIndex` dinamico, `role="button"`, `aria-label` descrittivo, `data-list-item`, `data-index`, e il `containerRef` viene creato e passato ad `allTransactionsNav`.

La struttura del `aria-label` per questa lista è più ricca perché i movimenti hanno potenzialmente un conto di destinazione (per i trasferimenti). Il formato raccomandato è:

> `{tipo}: {descrizione o categoria}, {importo formattato}, {data formattata}, {nome conto}{dettaglio trasferimento}{dettaglio categoria}`

Dove `{dettaglio trasferimento}` è `" → {nome conto destinazione}"` solo se presente, e `{dettaglio categoria}` è `", {nome categoria}"` solo se presente.

Esempio per trasferimento: `"Trasferimento: Mensile risparmio, 200,00 €, 1 aprile 2026, Conto corrente → Conto risparmio"`

Esempio con categoria: `"Uscita: Cena fuori, 38,00 €, 20 aprile 2026, Conto corrente, Ristorazione"`

L'attributo `data-focus-info` già presente sulle righe di TransactionsTab.tsx (che mostra il tooltip di FocusIndicator) può essere mantenuto invariato — è già costruito con un formato simile.

### 3.4 `src/components/FocusIndicator.tsx`

#### Estensione del selettore `handleFocusIn`

Il componente ascolta l'evento `focusin` su `document` e cattura solo gli elementi che soddisfano una delle seguenti condizioni:

```
tagName === 'INPUT' | 'BUTTON' | 'A' | 'SELECT' | 'TEXTAREA'
role === 'button'
tabindex === '0'
closest('[data-focus-info]')
```

Le righe della lista, dopo la modifica, avranno `role="button"` — il che le fa già rientrare nella condizione `role === 'button'`. Tuttavia, c'è un caso limite: quando `isFocused` è falso, la riga ha `tabIndex=-1` e `role="button"` ma potrebbe non essere catturata se il controllo `role` avviene prima che React abbia aggiornato gli attributi.

Per robustezza, la condizione va estesa esplicitamente con un controllo su `data-list-item`:

```
target.hasAttribute('data-list-item')
```

Questa condizione ha precedenza alta (va aggiunta prima o subito dopo le condizioni esistenti) perché le righe di lista con `data-list-item` devono sempre attivare FocusIndicator quando ricevono focus, indipendentemente dal valore corrente di `tabIndex` o `role`.

Il testo del tooltip viene costruito a partire da `aria-label` (già disponibile dopo le modifiche a DashboardTab.tsx e TransactionsTab.tsx) con fallback su `data-focus-info`. La logica esistente di `tooltip = dataFocusInfo || ariaLabel || ...` gestisce già questo ordine di priorità, quindi nessuna modifica alla logica del tooltip è necessaria — solo l'estensione del selettore.

**Nessun comportamento esistente viene rotto**: gli elementi già catturati (INPUT, BUTTON, A, SELECT, TEXTAREA, `role="button"`, `tabindex=0`, `data-focus-info`) continuano a funzionare esattamente come prima. Si aggiunge una condizione, non si modifica alcuna condizione esistente.

---

## 4. Relazione con gli screen reader

### 4.1 TalkBack su Android

TalkBack è lo screen reader standard per Android. Opera in due modalità principali:

**Modalità navigazione a esplorazione (swipe)**: l'utente scorre con un dito per muoversi tra gli elementi dell'albero di accessibilità; TalkBack annuncia ogni elemento quando il cursore vi arriva.

**Modalità tastiera**: su dispositivi con tastiera fisica o Bluetooth, TalkBack supporta la navigazione con i tasti freccia.

**Prima del fix**: le righe della lista non hanno ruolo né nome accessibile. In modalità swipe, TalkBack le attraversa come contenuto generico, annunciando frammenti di testo senza struttura ("32,50 Pranzo al ristorante 22/04/2026"). In modalità tastiera, la pressione di ArrowDown non sposta il cursore TalkBack perché non c'è un evento `focus` DOM — TalkBack ignora i cambiamenti di classe CSS.

**Dopo il fix**: ogni riga ha `role="button"` e un `aria-label` strutturato. In modalità swipe, TalkBack annuncia ogni riga come elemento interattivo: legge l'`aria-label` completo, poi dice "bottone, attiva con doppio tap". L'ordine di annuncio è: `{aria-label}` → "bottone".

Esempio di annuncio concreto con TalkBack:  
_"Uscita: Supermercato, 45,90 euro, 22 aprile 2026, Conto corrente. Bottone. Attiva con doppio tap."_

In modalità tastiera (frecce), la pressione di `ArrowDown` genera un evento `focus` DOM sulla riga successiva; TalkBack rileva l'evento focus e rilegge l'elemento: annuncia prima il nome accessibile, poi il ruolo.

**Gesti TalkBack per navigare nella lista dopo il fix:**
- Swipe destra: elemento successivo nella lista.
- Swipe sinistra: elemento precedente.
- Doppio tap: attiva l'azione (equivale a Enter — apre il dialog di modifica).
- Swipe su poi giù (o uso del "reading control" impostato su "Azioni"): naviga tra le azioni disponibili sull'elemento.

TalkBack non annuncia autonomamente le istruzioni di navigazione freccia presenti nel `Badge` visivo ("↑/↓ Naviga · Enter Modifica..."). Quella informazione è visiva. Per gli utenti TalkBack, le istruzioni di navigazione sono implicite nel ruolo e nel comportamento standard dei widget di lista.

### 4.2 VoiceOver su iOS e macOS

VoiceOver è lo screen reader integrato in tutti i dispositivi Apple.

**Su iOS (iPhone, iPad)**: VoiceOver usa gesti touch sulla schermata. Swipe destra e sinistra navigano tra gli elementi; doppio tap attiva. In modalità "rotore" (gesto di rotazione con due dita), è possibile selezionare modalità di navigazione per "elementi", "titoli", "link", "controlli interattivi", ecc.

**Su macOS**: VoiceOver usa una combinazione di tasti `VO` (Control+Option di default) con le frecce. La navigazione nelle web app avviene in modalità "Quick Nav" (frecce senza il prefisso VO) oppure in modalità standard.

**Prima del fix**: comportamento simile a TalkBack — le righe non hanno ruolo, VoiceOver le legge come testo generico non strutturato. In Quick Nav (frecce), nessun evento focus DOM → VoiceOver non si sposta.

**Dopo il fix**: VoiceOver su iOS annuncia ogni riga come elemento interattivo. L'ordine di annuncio in VoiceOver è leggermente diverso da TalkBack — VoiceOver legge prima il ruolo, poi il nome:

Esempio di annuncio concreto con VoiceOver su iOS:  
_"Bottone. Uscita: Supermercato, 45,90 euro, 22 aprile 2026, Conto corrente."_

Su macOS, VoiceOver in Quick Nav annuncia:  
_"Uscita: Supermercato, 45,90 euro, 22 aprile 2026, Conto corrente, bottone"_  
(il ruolo viene detto alla fine su macOS, all'inizio su iOS — comportamento atteso e non modificabile dal codice).

**Gesti VoiceOver iOS per navigare nella lista dopo il fix:**
- Swipe destra: elemento successivo.
- Swipe sinistra: elemento precedente.
- Doppio tap: attiva.
- Rotore su "Controlli": naviga tra i soli elementi interattivi (saltando testo statico).

**VoiceOver macOS con Quick Nav:**
- `ArrowRight` / `ArrowLeft`: elemento successivo / precedente nell'ordine del DOM.
- `ArrowDown` + `ArrowUp` (modalità web): navigazione per tipi di elementi.

**Nota su `aria-activedescendant`**: il report suggerisce anche l'aggiunta di `aria-activedescendant` sul container della lista. Questo attributo permette agli screen reader di sapere quale elemento "figlio" è attivo senza che il focus DOM si sposti su di esso — è utile per widget di tipo `combobox` o `listbox` dove il focus DOM deve restare sul container. Nel pattern roving tabindex, `aria-activedescendant` è opzionale perché il focus DOM si sposta effettivamente sull'elemento. Per semplicità, il Passo 17 non aggiunge `aria-activedescendant`, affidandosi al focus DOM reale — che è il meccanismo più robusto e universalmente supportato dagli screen reader. Se test manuali con TalkBack o VoiceOver rivelassero comportamenti inattesi, `aria-activedescendant` può essere aggiunto in un passo successivo.

---

## 5. Guard per i dialoghi

### 5.1 Il problema dei listener concorrenti (report §3.5)

Il report identifica tre listener globali su `keydown` attivi contemporaneamente:

| Hook / Componente | Evento | Target |
|---|---|---|
| `src/hooks/use-keyboard-shortcuts.ts` | `keydown` | `window` |
| `src/hooks/use-list-navigation.ts` | `keydown` | `document` (o container, dopo il fix) |
| `src/components/FocusIndicator.tsx` | `keydown` | `window` |

Non ci sono collisioni dirette sui tasti (le scorciatoie di `use-keyboard-shortcuts.ts` usano combinazioni Ctrl/Alt mentre le frecce sono tasti nudi), ma il problema si manifesta quando un dialogo è aperto: se il focus è dentro `TransactionDialog` e l'utente preme `ArrowDown` per muoversi in un campo select del form, il listener di `use-list-navigation.ts` registrato su `document` riceve l'evento e aggiorna `focusedIndex` della lista sottostante. Questo non è un comportamento visibile all'utente (la lista non è in primo piano), ma genera churn di stato non necessario e potenzialmente — se il focus DOM viene spostato — può sottrarre il focus al dialogo.

### 5.2 Il meccanismo di guard

Il guard si implementa come prima istruzione nell'handler `handleKeyDown` del hook `use-list-navigation.ts`:

Si verifica se nel documento è presente un elemento con `data-state="open"` e `role="dialog"` (oppure `role="alertdialog"`). Se sì, l'handler ritorna immediatamente senza elaborare il tasto.

Radix UI applica automaticamente `data-state="open"` al contenitore del dialogo quando il dialogo è visibile, e `role="dialog"` all'elemento accessibile. Questi attributi sono stabili e documentati nell'API di Radix — non richiedono nessuna modifica ai componenti dialog esistenti (`TransactionDialog.tsx`, `AccountDialog.tsx`, `BudgetDialog.tsx`, `PinDialog.tsx`, `DeleteDialog.tsx`).

La stessa guard può essere aggiunta a `use-keyboard-shortcuts.ts` (anch'esso usa `window.addEventListener('keydown')`) come miglioramento difensivo, ma `use-keyboard-shortcuts.ts` è già parzialmente protetto: esclude i target che sono `INPUT`, `TEXTAREA` o `contentEditable`. Le frecce comunque non sono scorciatoie in quel hook. **Il Passo 17 aggiunge la guard solo a `use-list-navigation.ts`** — modificare `use-keyboard-shortcuts.ts` è fuori perimetro.

### 5.3 Relazione con `use-keyboard-shortcuts.ts`

`src/hooks/use-keyboard-shortcuts.ts` è il hook che gestisce tutte le scorciatoie da tastiera dell'applicazione (Ctrl+N per nuova transazione, Ctrl+A per toggle categorie, tasti numerici per filtri, ecc.). Ascolta su `window` con `addEventListener('keydown')`.

`use-list-navigation.ts` ascolta su `document` (o, dopo il fix, sul container) per i tasti freccia e action keys (Enter, Delete, e/E, Home, End).

I due hook non si sovrappongono sui tasti: `use-keyboard-shortcuts.ts` ignora i tasti nudi (senza Ctrl/Alt) quando il target è un input; `use-list-navigation.ts` gestisce solo i tasti freccia e action keys. Non c'è conflitto oggi.

Il rischio potenziale identificato nel report §3.5 riguarda specificamente il fatto che `use-list-navigation.ts` si attiva su `document` globalmente, anche con dialoghi aperti. La guard descritta in §5.2 risolve questo scenario.

La dipendenza concettuale tra i due hook è: `use-keyboard-shortcuts.ts` gestisce la navigazione tra tab e l'apertura di dialoghi; `use-list-navigation.ts` gestisce la navigazione all'interno delle liste dentro una tab. Sono layer separati senza stato condiviso.

---

## 6. Criteri di verifica / Definition of Done

### Funzionalità tastiera

- [ ] Premere `Tab` con focus fuori dalla lista porta il focus sulla prima riga attiva della lista "Movimenti Recenti" in DashboardTab
- [ ] Premere `Tab` con focus fuori dalla lista porta il focus sulla prima riga attiva della lista movimenti in TransactionsTab
- [ ] Premere `ArrowDown` sposta il focus DOM sulla riga successiva (verificabile con DevTools → Elements → nodo con `:focus`)
- [ ] Premere `ArrowUp` sposta il focus DOM sulla riga precedente
- [ ] Premere `Home` porta il focus alla prima riga
- [ ] Premere `End` porta il focus all'ultima riga
- [ ] Premere `ArrowDown` sull'ultima riga porta alla prima (wrap-around)
- [ ] Premere `ArrowUp` sulla prima riga porta all'ultima (wrap-around)
- [ ] Premere `Enter` su una riga apre il dialog di modifica del movimento corrispondente
- [ ] Premere `Delete` su una riga apre il dialog di conferma eliminazione
- [ ] Premere `e` o `E` su una riga apre il dialog di modifica
- [ ] Le classi CSS di highlight visivo (bordo colorato, sfondo) continuano ad apparire sulla riga con focus attivo
- [ ] L'overlay di `FocusIndicator` (tooltip blu) appare correttamente sulle righe quando il focus vi arriva
- [ ] Premendo `Tab` di nuovo dopo `ArrowDown`/`ArrowUp` il focus esce dalla lista verso l'elemento successivo nella pagina

### Guard dialogo

- [ ] Aprire `TransactionDialog` e premere `ArrowDown` non causa spostamento di focus o cambiamento di stato della lista sottostante
- [ ] Aprire `AccountDialog` e premere `ArrowDown` si comporta analogamente
- [ ] Chiudere il dialogo e tornare alla lista: la navigazione frecce torna a funzionare correttamente
- [ ] Il guard non blocca la navigazione frecce in nessun contesto in cui un dialogo non è aperto

### Accessibilità screen reader — TalkBack (Android)

- [ ] Con TalkBack attivo, uno swipe destra nella zona lista porta il cursore TalkBack sulla prima riga
- [ ] TalkBack enuncia il contenuto completo della riga: tipo (Entrata/Uscita/Trasferimento), descrizione o categoria, importo, data, nome conto
- [ ] TalkBack identifica la riga come elemento interattivo (dice "bottone" o equivalente nella lingua configurata)
- [ ] Con TalkBack attivo, swipe destra sposta l'annuncio alla riga successiva
- [ ] Doppio tap su una riga apre il dialog di modifica del movimento

### Accessibilità screen reader — VoiceOver (iOS)

- [ ] Con VoiceOver attivo, swipe destra nella zona lista porta il cursore VoiceOver sulla prima riga
- [ ] VoiceOver enuncia il contenuto della riga con lo stesso formato di TalkBack (ruolo poi contenuto, o contenuto poi ruolo in base alla versione iOS)
- [ ] Doppio tap apre il dialog di modifica
- [ ] Il rotore VoiceOver impostato su "Controlli" naviga solo tra le righe interattive, saltando testo statico

### Accessibilità screen reader — VoiceOver (macOS)

- [ ] Con VoiceOver attivo e Quick Nav abilitato, i tasti freccia navigano tra le righe della lista
- [ ] Ogni spostamento provoca l'annuncio del contenuto della riga e del ruolo

### Stato del codice

- [ ] `npm run build` passa (exit code 0) dopo le modifiche
- [ ] `npm run lint` non introduce nuovi warning rispetto alla baseline P15/P16 (59 warning)
- [ ] Nessun file fuori da `src/hooks/use-list-navigation.ts`, `src/components/DashboardTab.tsx`, `src/components/TransactionsTab.tsx`, `src/components/FocusIndicator.tsx` è stato modificato
- [ ] `git diff --stat` mostra solo i quattro file attesi come modificati

---

## 7. Rischi e avvertenze

### 7.1 Regressione sul comportamento visivo

**Rischio**: le classi CSS di highlight già presenti (`bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20`) sono applicate in base alla condizione `isFocused`. Dopo il fix, `isFocused` è ancora il criterio per le classi CSS, ma il focus DOM si sposta su elementi che potrebbero avere anche un proprio stile di focus del browser (outline blu/nero di default su alcuni browser).

**Mitigazione**: verificare che i file Tailwind o gli stili globali in `src/index.css` / `src/main.css` includano già `outline: none` o un outline personalizzato per gli elementi con focus all'interno delle liste. Se il browser aggiunge un outline sovrapposto all'highlight personalizzato, aggiungere `focus:outline-none focus-visible:outline-none` alla riga per rimuovere il doppio bordo. Attenzione: `outline: none` senza alternativa visiva riduce l'accessibilità per chi non usa screen reader — usare `focus-visible:ring-0` invece di `focus:outline-none` per mantenere l'outline solo per la navigazione da tastiera non-screen-reader (che però è già gestita dal ring CSS esistente).

### 7.2 aria-label troppo verbosi

**Rischio**: un `aria-label` che include tipo, descrizione, importo, data, conto e categoria può diventare molto lungo (30-50 parole in casi estremi). Con TalkBack in modalità automatica, ogni spostamento freccia rilegge l'intera etichetta prima che l'utente possa procedere. Se la lista ha molti elementi, la navigazione diventa lenta.

**Mitigazione**: limitare l'`aria-label` agli attributi essenziali per l'identificazione univoca: tipo, descrizione/categoria, importo, data. Omettere informazioni ridondanti o poco discriminative. Il nome del conto è utile solo se l'utente ha più conti; la categoria è utile per contestualizzare ma può essere omessa dall'etichetta primaria (è visibile nel DOM secondario). Verificare manualmente la lunghezza media degli annunci con un campione di dati reali prima di finalizzare il formato.

Una alternativa è usare `aria-label` per le informazioni primarie e `aria-describedby` per i dettagli secondari — ma aumenta la complessità implementativa. Per il Passo 17 il formato singolo è sufficiente, con la raccomandazione di non superare i 60 caratteri in media.

### 7.3 Guard dialogo con falsi positivi

**Rischio**: la guard `document.querySelector('[data-state="open"][role="dialog"]')` potrebbe restituire un elemento in scenari non intuitivi — ad esempio, un componente Radix come `Tooltip` o `Popover` che apre un overlay ma non è un vero dialogo modale. Se questi componenti usano `data-state="open"` (cosa che Radix fa uniformemente), la guard bloccherebbe la navigazione lista anche quando è aperto solo un tooltip.

**Mitigazione**: restringere la query ai soli dialoghi modali, ovvero cercare esplicitamente `[role="dialog"]` o `[role="alertdialog"]` in aggiunta a `[data-state="open"]`. Tooltip e Popover di Radix usano `role="tooltip"` e `role="dialog"` rispettivamente, ma solo i dialog veri hanno `aria-modal="true"` — aggiungere questo attributo alla query rende la guard più precisa: `[data-state="open"][aria-modal="true"]`.

### 7.4 Verifica manuale con TalkBack e VoiceOver

**Come verificare con TalkBack su Android:**
1. Sul dispositivo Android, aprire Impostazioni → Accessibilità → TalkBack → attivare.
2. Navigare su Zecchino (app web nel browser Chrome o in modalità installata PWA se disponibile).
3. Usare swipe destra per muoversi fino alla lista movimenti.
4. Verificare che ogni elemento venga annunciato con il formato atteso.
5. Usare swipe destra/sinistra per navigare tra le righe e verificare gli annunci.
6. Doppio tap su una riga e verificare che si apra il dialog di modifica.

**Come verificare con VoiceOver su iOS:**
1. Aprire Impostazioni → Accessibilità → VoiceOver → attivare.
2. In Safari, navigare su Zecchino.
3. Swipe destra per raggiungere la lista; verificare annunci.
4. Impostare il rotore su "Controlli" e navigare solo tra elementi interattivi.
5. Doppio tap per attivare.

**Come verificare con VoiceOver su macOS:**
1. Aprire Preferenze di Sistema → Accessibilità → VoiceOver → attivare (scorciatoia: Cmd+F5).
2. In Safari, navigare su Zecchino.
3. Attivare Quick Nav (freccia sinistra + freccia destra simultaneamente).
4. Usare le frecce per navigare nella lista e verificare gli annunci.

---

## 8. Cosa NON fare in questo passo

### Non correggere altri problemi aperti del report

Il report diagnostico identifica altri problemi tecnici oltre alla navigazione frecce:

- **§3.3 `useVisibleData` chiamato in più consumer** — non va promosso a Provider in questo passo. È un'ottimizzazione di performance separata, classificata al punto 5 del piano d'azione.
- **§3.4 `App.tsx` — useEffect con dipendenze instabili** — non va toccato. Richiede un'analisi di `useScreenReader()` e potenzialmente una modifica a `App.tsx` con effetti collaterali non prevedibili senza un passo dedicato.
- **§3.6 `DashboardTab.tsx` — destrutturazioni inutilizzate** — `setVisibleCategories`, `visibleCategories` e variabili analoghe non usate non vanno rimosse in questo passo. Sono segnalate come warning da ESLint e saranno oggetto di un passo di cleanup separato.
- **§3.7 Test automatici** — nessun test runner va introdotto in questo passo.

### Non modificare la logica di filtraggio o ordinamento

Il filtraggio delle transazioni visibili (`useVisibleData`), l'ordinamento (`sortedTransactions`), i filtri per periodo, categoria e conto visibile: tutto rimane invariato. Il Passo 17 non tocca nessuna logica di dati.

### Non toccare i dialoghi Radix

I componenti `TransactionDialog.tsx`, `AccountDialog.tsx`, `BudgetDialog.tsx`, `PinDialog.tsx`, `DeleteDialog.tsx` e tutti gli altri dialog non vengono modificati. Il guard per i dialoghi opera rilevando lo stato dei dialoghi già esistenti tramite attributi DOM, senza richiedere modifiche a quei componenti.

### Non modificare altri hook o componenti non elencati in §2.1

In particolare, `use-app-shortcuts.ts`, `use-visible-data.ts`, `AppHeader.tsx`, `AuthScreen.tsx` e tutti gli altri componenti UI restano invariati.

---

## 9. Schema visivo del flusso navigazione dopo il fix

```
Utente preme ArrowDown/ArrowUp
          │
          ▼
  handleKeyDown (registrato su containerRef,
  non su document globale)
          │
          ▼
  ┌─── Guard dialogo ────────────────────────────┐
  │ document.querySelector(                      │
  │   '[data-state="open"][aria-modal="true"]'   │
  │ ) restituisce un elemento?                   │
  └──────────────────────────────────────────────┘
          │                      │
         SÌ                      NO
          │                      │
       return                    ▼
    (nessuna                setFocusedIndex(newIndex)
     azione)                     │
                                 ▼
                    useEffect [focusedIndex] si attiva
                                 │
                                 ▼
                    containerRef.current
                    .querySelector(
                      '[data-list-item][data-index="N"]'
                    )
                    .focus()
                                 │
                                 ▼
                    Evento focus DOM sull'elemento
                                 │
                    ┌────────────┴───────────────┐
                    │                            │
                    ▼                            ▼
           FocusIndicator               Screen reader
           rileva focusin               rileva evento focus
           su [data-list-item]          sull'elemento
                    │                            │
                    ▼                            ▼
           Tooltip visivo              Legge aria-label:
           con descrizione             "Uscita: Supermercato,
           del movimento               45,90 €, 22 apr 2026,
                                       Conto corrente. Bottone."
```

---

*Documento di design — read-only. Nessun file di codice è stato creato o modificato.*
