# P21 — Design: GitHub Actions CI — Pipeline minimale

> Passo 21 — Automazione dei controlli di qualità via GitHub Actions  
> Branch: `refactoring-architettura`  
> Dipende da: P19 (test smoke), P20 (baseline lint zero)  
> Documento di riferimento: `docs/4 - reports/Diagnostic-Analysis-Post-P13.md` — sezione 7, priorità 9  
> Perimetro: crea solo `.github/workflows/ci.yml`; nessun altro file modificato

---

## Risultati delle verifiche preliminari

Prima di ogni considerazione di design, questo documento riporta i risultati delle
letture obbligatorie dei file del repository.

### `.github/workflows/` — esistenza

La cartella `.github/workflows/` **non esiste** nel repository. La lista dei
contenuti di `.github/` mostra: `agents/`, `instructions/`, `changelogs/`,
`prompts/`, `runtime/`, `skills/`, più i file `AGENTS.md`,
`AGENTS-master.md`, `copilot-instructions.md`, `dependabot.yml`,
`project-profile.md`, `.scf-manifest.json`, `.scf-registry-cache.json`.
La sottocartella `workflows/` non è presente. P21 la crea da zero insieme
al file `ci.yml`.

### `package.json` — script disponibili

Lettura di `package.json` conferma i seguenti script:

| Nome script | Comando | Verifica |
|---|---|---|
| `lint` | `eslint .` | Presente ✓ |
| `build` | `tsc -b --noCheck && vite build` | Presente ✓ |
| `test:run` | `vitest run` | Presente ✓ |

Nota sul comando `build`: esegue prima `tsc -b --noCheck` (che risolve i
riferimenti di progetto TypeScript, ma salta il typechecking completo) e
poi `vite build`. Questo comando è quello già usato in locale ed è quello
che il workflow deve invocare. Il typechecking completo è fuori dal perimetro
di P21 (possibile estensione futura con `npx tsc --noEmit` come step separato).

Il file `package.json` **non dichiara un campo `engines`**. La versione di
Node.js da usare nel workflow è quindi da ricavare dalle dipendenze.

### Versione Node.js — deduzione

`vitest` è alla versione `^4.1.5`. La documentazione di Vitest 4.x richiede
Node.js 18 o superiore. `vite` è alla versione `^7.3.2`, che analogamente
richiede Node.js 18+. La scelta sicura e standard è **Node.js 20 LTS**:

- È l'LTS attuale (supporto garantito fino ad aprile 2026 → aprile 2028 per
  maintenance)
- Soddisfa il requisito `>= 18` di tutte le dipendenze
- È il runner più usato nei progetti React + Vite sulla piattaforma GitHub Actions
- `crypto.subtle` è disponibile nativamente senza configurazione aggiuntiva
- Node.js 18 sarebbe compatibile ma entra in "end-of-life maintenance" nel 2025

### `vitest.config.ts` — configurazione test

Il file dichiara:
- **Environment**: `jsdom` — implementazione Node.js pura, nessun browser reale necessario
- **Setup files**: `./src/test/setup.ts` — eseguito prima di ogni file di test
- **Globals**: `true` — `vi`, `describe`, `it`, `expect` sono globali senza import
- **Include**: `src/test/**/*.test.{ts,tsx}` — solo i file nella cartella test

Nessuna variabile d'ambiente speciale è richiesta dalla configurazione di Vitest.
Non ci sono riferimenti a `process.env` nel file di configurazione.

### `src/test/setup.ts` — contenuto e compatibilità CI

Il file di setup esegue le seguenti operazioni, tutte compatibili con un
ambiente CI Ubuntu + Node.js:

1. **Mock di `@github/spark/hooks`** (`vi.mock`): intercetta il modulo prima che
   venga caricato dal codice applicativo. Sostituisce `useKV` con un'implementazione
   basata su `useState` e un `Map` in memoria. Questo mock è sufficiente: il runtime
   Spark non è richiesto, il mock viene iniettato prima dell'esecuzione dei test.

2. **Mock di `window.spark.kv`**: definisce `spark.kv.get`, `spark.kv.set`,
   `spark.kv.keys` come `vi.fn()` con ritorni asincroni vuoti. Compatibile con jsdom.

3. **Mock di `AudioContext` e `webkitAudioContext`**: classi mock che sostituiscono
   le Web Audio API non implementate in jsdom. Necessario perché
   `src/lib/sound-system.ts` usa queste API; senza il mock i test fallirebbero.
   Il mock è già in setup.ts, nessuna configurazione aggiuntiva richiesta.

4. **Mock di `window.matchMedia`**: jsdom non implementa `matchMedia`. Il mock
   è in setup.ts e restituisce un oggetto con tutti i metodi necessari.

5. **Mock di `navigator.vibrate`**: mock vuoto, compatibile con Node.js/jsdom.

6. **Cleanup post-test**: `afterEach` chiama `cleanup()` (da
   `@testing-library/react`) e `resetTestKvStore()`. Nessun effetto sull'ambiente CI.

**Conclusione sulla compatibilità CI**: i cinque test smoke di P19 girano in
un ambiente jsdom completamente mockato, senza dipendenze dal browser o dal
runtime Spark. Non è necessaria nessuna configurazione aggiuntiva per farli
girare in CI. Non ci sono variabili d'ambiente da passare al workflow.

### `.github/instructions/framework-guard.instructions.md`

Il testo della guardia recita: "Proteggi i file framework sotto `.github/**`
da modifiche accidentali." e "Le modifiche al framework devono restare
separate dal codice applicativo."

La creazione di `.github/workflows/ci.yml` è una modifica esplicita e
intenzionale, non accidentale. La cartella `workflows/` non è elencata
tra i componenti del framework SCF: `.github/instructions/`,
`.github/agents/`, `.github/runtime/`, `.github/skills/`,
`.github/prompts/`, `.github/changelogs/` e i file di configurazione
SCF (`.scf-manifest.json`, `.scf-registry-cache.json`). Il file `ci.yml`
è un file di infrastruttura applicativa, non un componente del framework.
La guardia è soddisfatta: nessun file protetto viene toccato.

---

## 1. Obiettivo: prima e dopo P21

### Prima di P21

I tre strumenti di verifica della qualità del codice — lint, build e test —
esistono e funzionano. Hanno ognuno uno script npm dedicato. Il problema è
che questi strumenti vengono eseguiti solo quando qualcuno decide di eseguirli
manualmente. Un agente di coding (o un collaboratore umano) può fare commit,
aprire una pull request, e il codice potrebbe contenere warning lint, errori
TypeScript, o test che falliscono senza che nessuno lo sappia.

La baseline di P20 (zero warning lint) e i test smoke di P19 (cinque test
che passano) sono stati costruiti con cura. Senza automazione, questa baseline
può degradarsi silenziosamente: basta un commit che introduce un import
inutilizzato, una variabile rinominata male, o una funzione che interrompe
un comportamento testato.

### Dopo P21

Ad ogni pull request aperta verso il branch attivo, GitHub esegue
automaticamente i tre controlli. Il risultato appare visibilmente nella
pagina della PR: un segno verde se tutto passa, un segno rosso se qualcosa
fallisce. Chi legge la PR sa immediatamente se il codice è in uno stato
valido, senza dover eseguire nulla in locale.

La rete di sicurezza costruita nei passi precedenti diventa obbligatoria
(o quanto meno visibile) su ogni nuova modifica.

---

## 2. Cosa sono GitHub Actions e i workflow

GitHub Actions è il sistema di automazione integrato in GitHub. Permette di
definire sequenze di operazioni che GitHub esegue automaticamente in risposta
a eventi precisi (un commit, una pull request, una fusione di branch).

Il meccanismo funziona così: si crea un file di testo nella cartella
`.github/workflows/` del repository. Questo file — chiamato "workflow" —
descrive quando le operazioni devono partire (il "trigger") e cosa devono
fare (i "job" con i loro "step"). GitHub legge questo file ad ogni evento
che corrisponde al trigger dichiarato, alloca una macchina virtuale temporanea
(il "runner"), e esegue le operazioni in sequenza.

Il file è come un'istruzione permanente consegnata a GitHub: "ogni volta che
accade questa cosa, esegui queste operazioni in quest'ordine, su questa
macchina".

Concetti chiave usati in P21:

- **Trigger**: l'evento che fa partire il workflow. Per P21 sarà
  l'apertura (o l'aggiornamento) di una pull request verso un branch specifico.

- **Job**: un gruppo di operazioni eseguite su un singolo runner. P21 ha un
  solo job (non sono necessari job paralleli o dipendenti).

- **Step**: una singola operazione all'interno di un job. Ogni step può essere
  un'azione riutilizzabile (come "scarica il codice") oppure un comando shell
  (come "esegui `npm run lint`").

- **Runner**: la macchina virtuale temporanea fornita da GitHub. P21 usa
  `ubuntu-latest`.

- **Action**: un blocco riutilizzabile di operazioni. GitHub mantiene un set
  di action ufficiali: `actions/checkout` (scarica il codice del repository),
  `actions/setup-node` (installa Node.js), `actions/cache` (gestisce la cache).

---

## 3. Struttura del file `ci.yml`

Il file da creare è `.github/workflows/ci.yml`. Questa sezione descrive
ogni componente del file senza scrivere YAML.

### Nome del workflow

Il workflow si chiama **"CI — Lint, Build, Test"**. Questo nome appare nella
pagina delle Actions del repository e nella sezione "Checks" di ogni pull
request. Un nome descrittivo rende immediatamente chiaro cosa sta verificando
il workflow.

### Trigger

Il workflow si attiva quando viene aperta, aggiornata o risincronizzata una
pull request il cui branch di destinazione è `refactoring-architettura`.

Motivazione della scelta:

- Il branch attivo del progetto è `refactoring-architettura`. Tutti i passi
  correnti del refactor (P14–P21 e successivi) vengono sviluppati su branch
  di feature e poi proposti come PR verso questo branch.
- `push` su branch specifici è un'alternativa, ma attiverebbe il workflow anche
  per commit diretti sul branch, non solo per le PR. Per ora il trigger su PR
  è più mirato e meno rumoroso.
- Il trigger verso `main` è da aggiungere quando il branch
  `refactoring-architettura` verrà mergiato su `main`. Fino ad allora,
  `pull_request` su `refactoring-architettura` copre tutti i flussi attivi.

Il trigger deve gestire tre casi: apertura della PR (`opened`), aggiornamento
con nuovi commit (`synchronize`), riapertura dopo chiusura (`reopened`).
Questi tre sono i casi standard per un CI su PR.

### Runner

Il runner è `ubuntu-latest`. Motivazione:

- Il progetto è una SPA React pura. Non ha dipendenze da API macOS (come
  `AVAudioEngine`) né da API Windows. Il codice gira identicamente su Linux.
- `ubuntu-latest` è il runner più rapido e meno costoso in termini di minuti
  GitHub Actions (i runner macOS consumano dieci volte più minuti).
- `ubuntu-latest` è il runner standard per progetti Node.js + Vite + React.
- Tutte le dipendenze del progetto sono pacchetti npm multipiattaforma.

### Versione Node.js

Il workflow installa **Node.js 20 LTS** (come motivato nella sezione delle
verifiche preliminari). L'action `actions/setup-node` accetta la versione come
parametro. Si usa la specifica `20` (non `20.x.x`) per ricevere automaticamente
gli aggiornamenti di patch all'interno della serie 20.

### Cache delle dipendenze

Il workflow configura la **cache di npm**. L'action `actions/setup-node` ha
supporto nativo alla cache npm tramite il parametro `cache: 'npm'`: salva la
cartella `~/.npm` tra un run e l'altro.

Il trade-off valutato:

- **Senza cache**: ogni run esegue `npm ci` da zero, scaricando tutti i
  pacchetti da internet. Con le dipendenze del progetto (React 19, Vite 7,
  Radix UI, Recharts, Framer Motion, il set completo di devDependencies),
  `npm ci` richiede tipicamente 60–90 secondi.
- **Con cache**: il primo run è lento (popola la cache), i run successivi
  usano la cache e richiedono tipicamente 10–15 secondi per `npm ci`.

La cache è giustificata: il tempo risparmiato è significativo, la configurazione
aggiuntiva è minima (un singolo parametro nell'action `setup-node`), e
l'invalidazione è automatica (la cache viene invalidata quando cambia
`package-lock.json`).

### Sequenza degli step

Il job esegue sei step nell'ordine seguente:

**Step 1 — Checkout del codice**
Usa l'action ufficiale `actions/checkout`. Scarica il codice del branch
sorgente della pull request sul runner. Senza questo step, il runner è una
macchina vuota senza alcun file del progetto.

**Step 2 — Setup Node.js**
Usa l'action ufficiale `actions/setup-node` con versione `20` e cache `npm`.
Installa Node.js sul runner e configura la cache npm per accelerare i run
successivi.

**Step 3 — Installazione dipendenze**
Esegue `npm ci`. Questo comando installa esattamente le versioni dichiarate
in `package-lock.json`, senza aggiornamenti. Perché `npm ci` e non
`npm install` è spiegato nella sezione 4.

**Step 4 — Lint**
Esegue `npm run lint` (equivale a `eslint .`). È il primo controllo perché:
- È il più veloce (tipicamente 5–10 secondi)
- Fallisce presto: se c'è un warning lint, il job si ferma qui e non spreca
  tempo a fare build e test su codice già problematico

**Step 5 — Build**
Esegue `npm run build` (equivale a `tsc -b --noCheck && vite build`). Viene
dopo il lint perché:
- È più lento del lint (tipicamente 15–30 secondi)
- Verifica che il codice TypeScript sia strutturalmente corretto e che Vite
  riesca a impacchettarlo senza errori di import o dipendenze circolari

**Step 6 — Test**
Esegue `npm run test:run` (equivale a `vitest run`). È l'ultimo step perché:
- È il più lento (avvio Vitest + setup jsdom + esecuzione dei test)
- Dipende concettualmente dalla build: ha senso testare solo se il codice
  si compila

L'ordine lint → build → test segue il principio "fail fast": il controllo
più veloce e più frequentemente violato viene prima, in modo che i feedback
siano rapidi.

---

## 4. Perché `npm ci` e non `npm install`

`npm install` è progettato per l'uso interattivo in sviluppo locale. Quando
trova discrepanze tra `package.json` e `package-lock.json`, può aggiornare
`package-lock.json` silenziosamente. In CI questo comportamento è indesiderato:
potrebbe installare versioni diverse da quelle testate localmente.

`npm ci` è progettato specificamente per ambienti automatici:
- Usa **esclusivamente** `package-lock.json` come fonte di verità
- Se `package-lock.json` non è sincronizzato con `package.json`, fallisce con
  un errore esplicito anziché aggiornare silenziosamente
- Cancella sempre `node_modules` prima di installare, garantendo uno stato
  pulito
- È generalmente più veloce di `npm install` grazie a questo flusso più diretto

In CI, `npm ci` è lo standard de facto. Il file `package-lock.json` del
progetto è già presente e aggiornato, quindi `npm ci` funziona senza problemi.

---

## 5. Il trigger `pull_request` e cosa succede concretamente

Quando un agente di coding (o un collaboratore) apre una pull request verso
`refactoring-architettura`:

1. GitHub vede che il branch di destinazione corrisponde al trigger dichiarato
   nel workflow.
2. GitHub alloca un runner `ubuntu-latest`, una macchina virtuale Linux fresca.
3. Il workflow viene eseguito: i sei step si completano (o si fermano al primo
   step fallito).
4. Il risultato viene pubblicato nella pagina della pull request, nella sezione
   "Checks": un cerchio verde con un segno di spunta se tutti e tre i controlli
   passano, un cerchio rosso con una X se almeno uno fallisce.

Ogni aggiornamento della PR (nuovo commit sul branch sorgente) fa ripartire il
workflow automaticamente. Se un commit risolve il problema, il check diventa
verde senza intervento manuale.

**Importante**: il workflow da solo non blocca la fusione della PR. Mostra il
risultato dei check, ma la fusione rimane tecnicamente possibile anche con un
check rosso. Per rendere il check obbligatorio (impossibile fare merge con check
rosso) è necessario configurare le "branch protection rules" nelle impostazioni
del repository su GitHub. Questa configurazione è fuori dal perimetro di P21
ed è documentata nella sezione 10 come estensione naturale successiva.

---

## 6. Ambiente CI e compatibilità con i test

Questa sezione risponde alla domanda: i test di P19 girano senza modifiche in
un ambiente CI Ubuntu + Node.js 20, senza browser reale e senza runtime Spark?

### jsdom in ambiente Node.js

`jsdom` è un'implementazione Node.js pura del DOM e delle API del browser.
Non richiede un browser installato sul sistema. È progettato esattamente per
essere usato in ambienti CI senza display. Vitest con `environment: 'jsdom'`
(come dichiarato in `vitest.config.ts`) funziona correttamente su Ubuntu.

### Mock di `@github/spark/hooks`

Il file `src/test/setup.ts` contiene `vi.mock('@github/spark/hooks', ...)`.
Questo hook di Vitest intercetta tutte le importazioni del modulo
`@github/spark/hooks` **prima** che vengano eseguite, sostituendo l'intero
modulo con l'implementazione mock dichiarata. Il runtime Spark non viene
mai caricato né richiesto. Il mock è autosufficiente: usa solo `useState`
(da React, già importato) e un `Map` in memoria (`kvStore`).

### Mock di `window.spark.kv`

Definito tramite `Object.defineProperty(window, 'spark', ...)` nel setup.
Funziona in jsdom perché jsdom espone un oggetto `window` mutabile.
Nessuna dipendenza da runtime Spark.

### API audio (AudioContext, webkitAudioContext)

Le Web Audio API non sono implementate in jsdom. Il setup.ts definisce
`MockAudioContext`, `MockGainNode`, `MockOscillatorNode` e li assegna a
`window.AudioContext` e `window.webkitAudioContext`. Questo mock è necessario
perché `src/lib/sound-system.ts` usa queste API; senza il mock, i test che
importano componenti che usano il sistema audio fallirebbero con errori di
tipo "AudioContext is not a constructor". Il mock è già in place: nessuna
modifica richiesta.

### `window.matchMedia`

Non implementata in jsdom; il setup.ts definisce un mock tramite
`Object.defineProperty`. Nessuna configurazione aggiuntiva.

### `navigator.vibrate`

Mock vuoto definito nel setup.ts. Nessuna configurazione aggiuntiva.

### `crypto.subtle`

Node.js 18+ espone `crypto.subtle` nativamente tramite il modulo globale
`globalThis.crypto`. In Node.js 20 (la versione scelta per il workflow),
`crypto.subtle` è disponibile senza importazioni aggiuntive. Il codice in
`src/lib/crypto.ts` usa `crypto.subtle` e funzionerà correttamente in CI.

### Variabili d'ambiente

Né `vitest.config.ts` né `src/test/setup.ts` fanno riferimento a variabili
d'ambiente di runtime. Non è necessario aggiungere secrets, env vars, o
step di configurazione aggiuntivi nel workflow.

### Valutazione finale

**I cinque test smoke di P19 girano senza modifiche in CI.** Non è necessario
aggiungere configurazioni, variabili d'ambiente, o step di setup aggiuntivi
al workflow. L'unico requisito è Node.js 20 (già dichiarato nel workflow) e
l'installazione delle dipendenze tramite `npm ci` (già inclusa come step 3).

---

## 7. Cosa vede l'utente su GitHub

Quando il workflow è installato e una PR viene aperta, l'utente vede:

**Nella pagina della pull request**, subito dopo la descrizione e prima dei
commenti, appare una sezione "Checks" (o "All checks have passed" / "Some
checks were not successful"). Cliccando su questa sezione si apre la lista
dei check attivi. Il workflow appare con il nome "CI — Lint, Build, Test".

**Se il check è verde**: tutte le tre verifiche (lint, build, test) sono
passate nell'ultimo commit del branch sorgente. Il codice è in uno stato
valido secondo la definizione stabilita nei passi precedenti.

**Se il check è rosso**: almeno una verifica ha fallito. Cliccando sul nome
del check si apre la pagina dei log della GitHub Actions run. I log mostrano
l'output di ogni step: è visibile esattamente quale comando ha fallito e
il relativo messaggio di errore.

**Come leggere un log CI**:
- I log sono organizzati per step. Ogni step è collassabile. Lo step fallito
  è marcato in rosso con una X.
- L'output di `npm run lint` mostra i file con warning, la riga, il codice
  della regola violata.
- L'output di `npm run build` mostra eventuali errori di import o problemi
  Vite.
- L'output di `npm run test:run` mostra i test falliti con il messaggio di
  asserzione, il file e la riga.

---

## 8. Compatibilità con `.github/instructions/` (framework guard)

La creazione di `.github/workflows/ci.yml` non tocca nessuno dei file
gestiti dal framework SCF (Spark Copilot Framework):

| File/cartella protetto | Modificato in P21 |
|---|---|
| `.github/instructions/` | No |
| `.github/agents/` | No |
| `.github/copilot-instructions.md` | No |
| `.github/AGENTS.md` | No |
| `.github/AGENTS-master.md` | No |
| `.github/runtime/` | No |
| `.github/skills/` | No |
| `.github/prompts/` | No |
| `.github/changelogs/` | No |
| `.github/.scf-manifest.json` | No |

P21 crea solo `.github/workflows/` (nuova sottocartella) e
`.github/workflows/ci.yml` (nuovo file). Non esistono altri file in questa
cartella. La guardia del framework è rispettata: le modifiche sono esplicite,
circoscritte, e non interferiscono con nessun componente SCF.

---

## 9. Criteri di verifica — Definition of Done

| Criterio | Come verificare |
|---|---|
| Il file `.github/workflows/ci.yml` esiste | `ls .github/workflows/` mostra `ci.yml` |
| Aprendo una PR verso `refactoring-architettura`, il check appare | Aprire una PR e controllare la sezione "Checks" |
| Il check diventa verde su codice pulito | Run del workflow su branch senza modifiche |
| Introducendo un warning lint, il check diventa rosso | Aggiungere un import inutilizzato in un file, aprire PR, verificare il check rosso, poi revertire |
| Introducendo un test che fallisce, il check diventa rosso | Modificare un test per farlo fallire, aprire PR, verificare il check rosso, poi revertire |
| `npm run lint`, `npm run build`, `npm run test:run` restano invariati in locale | Eseguire i tre comandi dopo aver creato `ci.yml`; l'output deve essere identico a prima |

---

## 10. Estensioni future (fuori da P21)

Questi elementi non fanno parte di P21 ma sono la naturale evoluzione successiva.

**Branch protection rules**: la configurazione più impattante. Nelle impostazioni
del repository su GitHub (Settings → Branches → Branch protection rules) si può
rendere il check "CI — Lint, Build, Test" obbligatorio per il merge. Con questa
configurazione, una PR non può essere fusa se il check è rosso. Richiede accesso
alle impostazioni del repository.

**Typecheck TypeScript esplicito**: il comando `build` usa `tsc -b --noCheck`
che non esegue il typecheck completo. Aggiungere `npx tsc --noEmit` come step
separato (prima o dopo la build) fornisce una verifica TypeScript completa.
Attualmente non è nel perimetro perché `--noCheck` è la scelta deliberata
del progetto per velocizzare la build.

**Estensione del trigger a `main`**: quando `refactoring-architettura` verrà
mergiato su `main`, il trigger del workflow dovrà essere esteso per coprire
anche le PR verso `main`. Un'unica modifica al campo `branches` del trigger.

**Badge nel README**: dopo aver verificato che il workflow funzioni correttamente,
è possibile aggiungere un badge di stato al `README.md` (es.
"CI passing"). È un'operazione separata, opzionale, estetica.

**Notifiche**: configurare notifiche Slack, email o GitHub Mobile in caso di
fallimento del workflow. Fuori perimetro: richiederebbe secrets, configurazione
di terze parti, e aumenterebbe la complessità del workflow.

**Matrix testing**: eseguire i check su più versioni Node.js (18, 20, 22) o
più sistemi operativi (ubuntu, macos, windows). Fuori perimetro per ora: un
solo runner è sufficiente per un progetto SPA client-side senza dipendenze
native.

---

## 11. Rischi e avvertenze

### Primo run più lento del previsto

Il primo run del workflow popola la cache npm da zero. Questo run può richiedere
2–3 minuti anziché i 30–60 secondi attesi dopo che la cache è calda. È normale
e non indica un problema. I run successivi saranno significativamente più veloci.

### `npm run build` fallisce in CI ma funziona in locale

Il problema più probabile è una dipendenza non dichiarata (un import che
funziona in locale per caso, ad esempio perché il pacchetto è installato come
dipendenza transitiva in una versione diversa). Il log CI mostra esattamente
il file e la riga dell'import problematico. La soluzione è aggiungere la
dipendenza esplicita in `package.json`.

Un secondo scenario possibile: un'importazione di un file `src/` che usa un
percorso relativo che funziona su Windows (case-insensitive) ma fallisce su
Linux (case-sensitive). Il log CI mostra il nome del file non trovato.

### Test falliscono in CI ma passano in locale

Tre scenari possibili:

1. **Timeout**: Node.js in CI è più lento che in locale. Se un test usa
   `waitFor` o `setTimeout` con valori molto bassi, potrebbe fallire per
   timeout. Il log CI mostra "Timeout exceeded" nel test fallito.

2. **Ordine di esecuzione**: i test assumono uno stato globale che in CI
   potrebbe essere diverso. Il setup `afterEach(() => { cleanup(); resetTestKvStore(); })`
   in `src/test/setup.ts` dovrebbe prevenire questo problema, ma va controllato
   se un test fallisce in modo non deterministico.

3. **API non mockate**: se un test usa un'API del browser non mockata nel
   setup (oltre a quelle già gestite), il test fallisce con "X is not
   a function" o simile. Il log CI mostra esattamente il messaggio di errore.
   La soluzione è aggiungere il mock nel `src/test/setup.ts`.

### Il workflow gira su ogni PR degli agenti

Questo è il comportamento desiderato. Ogni modifica proposta da un agente di
coding viene verificata automaticamente prima che un umano la revisioni. Il
check rosso è un segnale visibile: la PR non dovrebbe essere approvata finché
il check non è verde.

---

## 12. Cosa NON fare in P21

- **Non configurare branch protection rules**: richiede accesso alle
  impostazioni del repository, fuori dal perimetro.
- **Non aggiungere step di deploy o pubblicazione**: P21 è solo verifica,
  non deployment.
- **Non usare matrix testing** su più versioni Node.js o più OS: un solo
  runner è sufficiente.
- **Non modificare `package.json`**, `vite.config.ts`, `vitest.config.ts`,
  `eslint.config.js`, o qualsiasi file in `src/`.
- **Non toccare i file protetti** in `.github/instructions/`,
  `.github/agents/`, `.github/copilot-instructions.md`.
- **Non aggiungere badge al `README.md`** in questo passo: prima va
  verificato che il workflow funzioni, poi si aggiunge il badge come passo
  separato.
- **Non usare action di terze parti** non ufficiali: solo
  `actions/checkout`, `actions/setup-node` (con cache npm integrata).
  Nessuna action esterna per lint, build o test: si usano direttamente
  gli script npm già presenti.
- **Non aggiungere `npx tsc --noEmit`** come step aggiuntivo: sarebbe
  un cambio di comportamento rispetto alla build locale, da decidere
  esplicitamente come passo separato.
