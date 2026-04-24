# P16 — Risoluzione vulnerabilità dipendenze

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 16  
> Data: 24 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Il report diagnostico post-P13 (`docs/4 - reports/Diagnostic-Analysis-Post-P13.md`, §3.2 e §7 priorità 2) classifica la presenza di vulnerabilità nelle dipendenze del progetto come **"DA CORREGGERE — Alto (sicurezza)"**. Al momento della diagnosi, `npm audit` segnalava 1 vulnerabilità di gravità media e 4 di gravità alta, per un totale di 5.

**Perché risolvere le vulnerabilità anche su un'app personale:**

Zecchino è una SPA completamente client-side: non ha un server, non esegue chiamate di rete in ingresso, non espone endpoint. Tuttavia, la presenza di vulnerabilità nelle dipendenze di sviluppo crea rischi concreti che non riguardano il comportamento dell'app in produzione ma la catena di strumenti che la costruisce:

- Una dipendenza vulnerabile nel build toolchain (es. in `devDependencies`) può essere sfruttata durante l'esecuzione di `npm install`, `npm run build` o `npm run lint` in ambienti condivisi o pipeline CI.
- Le librerie di runtime vulnerabili (in `dependencies`) possono essere sfruttate da contenuto arbitrario elaborato dall'app — anche se oggi non ci sono dati esterni, una vulnerabilità in un parser o renderer potrebbe essere attivata da dati salvati dall'utente stesso in formati inattesi.
- Mantenere le dipendenze aggiornate riduce il debito tecnico accumulato: aggiornamenti puntuali gestiti ora sono meno rischiosi di aggiornamenti bulk obbligatori in futuro quando il gap di versione è più grande.
- Un `npm audit` verde è un criterio di rilascio pulito: il `CHANGELOG.md` e il workflow di release possono attestare assenza di vulnerabilità note al momento del commit.

**Cosa si ottiene con questo passo:**

- `npm audit` non segnala più vulnerabilità di gravità alta e media nelle dipendenze del progetto (o le vulnerabilità residue non correggibili sono documentate e accettate esplicitamente con motivazione).
- `package.json` e `package-lock.json` riflettono versioni aggiornate delle librerie coinvolte.
- Il comportamento dell'app rimane invariato: nessun file sotto `src/` viene toccato.

**Criterio per decidere se aggiornare o no una libreria:**

Questo passo aggiorna **solo le librerie segnalate da `npm audit` come vulnerabili**. Le librerie non segnalate restano alle versioni attuali indipendentemente dall'esistenza di versioni più recenti. Un aggiornamento non mirato alla sicurezza, anche se tecnicamente migliorativo, è fuori perimetro e appartiene a un passo separato dedicato alla manutenzione delle dipendenze.

---

## 2. Perimetro della modifica

### 2.1 File modificati

| File | Tipo di modifica | Nota |
|---|---|---|
| `package.json` | Aggiornamento versioni dipendenze vulnerabili | Solo le librerie segnalate da `npm audit` |
| `package-lock.json` | Aggiornamento automatico conseguente | Generato dal package manager dopo le modifiche a `package.json` |

### 2.2 File non toccati

| File / Area | Motivazione |
|---|---|
| Tutto `src/` | Codice applicativo — invariato per policy del passo |
| `eslint.config.js` | Creato in P15 — invariato |
| `tsconfig.json` | Configurazione TypeScript — non coinvolta |
| `vite.config.ts` | Configurazione build — non coinvolta |
| `tailwind.config.js` | Configurazione stili — non coinvolta |
| `components.json` | Configurazione shadcn/ui — non coinvolta |
| `.github/` | Protetto da `framework-guard.instructions.md` |

### 2.3 Librerie candidate — da verificare, non da assumere

Il report diagnostico cita come **probabili candidate** (al momento dell'analisi) le seguenti librerie: `octokit`, `@octokit/core`, `marked`, e alcune dipendenze transitive di `d3` e `recharts`.

Queste indicazioni sono un punto di partenza per l'analisi, non una certezza. L'ecosistema npm evolve rapidamente: le vulnerabilità vengono pubblicate, risolte e aggiornate nel registro Advisory di GitHub e di npm con cadenza continua. Al momento dell'esecuzione di questo passo, la lista reale delle librerie coinvolte va determinata con `npm audit --json`, non dedotta da questo documento. Vedere §3.1 per la procedura di analisi.

---

## 3. Dettaglio delle operazioni

### 3.1 Analisi preliminare: leggere `npm audit`

Prima di modificare qualsiasi dipendenza, è necessario ottenere una fotografia precisa e aggiornata della situazione. Lo strumento corretto è `npm audit`, eseguito nella root del progetto.

`npm audit` produce in output una lista di vulnerabilità note, organizzata per livello di gravità. Ogni voce include:

- Il nome della libreria vulnerabile.
- La versione attualmente installata.
- Il range di versioni vulnerabili e la versione che risolve il problema.
- Il tipo di vulnerabilità (es. ReDoS, prototype pollution, path traversal, denial of service).
- Se la libreria è una dipendenza diretta (elencata in `package.json`) o transitiva (installata come dipendenza di un'altra libreria).
- Un link all'advisory GitHub con la descrizione tecnica.

Per un'analisi leggibile usare l'output standard di `npm audit`; per un'analisi programmatica o per documentare i dati nel coding plan, usare `npm audit --json` che produce un oggetto JSON strutturato con campi precisi per severità, path della dipendenza e azione consigliata.

**I livelli di gravità in termini concreti per questa app:**

| Livello | Significato astratto | Rischio concreto per Zecchino |
|---|---|---|
| `critical` | Compromissione immediata possibile senza prerequisiti | Rilevante anche in contesto locale: eseguire immediatamente |
| `high` | Sfruttamento probabile con condizioni minime | Da risolvere prima di qualsiasi merge o release |
| `moderate` | Sfruttamento condizionale o parziale | Da risolvere nell'arco del passo corrente |
| `low` | Impatto limitato, spesso teorico | Da documentare; accettabile se non correggibile senza rischi |

Poiché Zecchino non espone un server né elabora input arbitrario di rete, il rischio effettivo delle vulnerabilità dipende dal contesto in cui la libreria viene usata:

- Vulnerabilità in una libreria usata **solo in build** (ad esempio un parser di codice sorgente, un bundler) sono rilevanti se `npm run build` o `npm install` viene eseguito in ambienti condivisi o CI, ma non influenzano l'utente finale che usa l'app compilata.
- Vulnerabilità in una libreria usata **a runtime** (ad esempio una libreria di rendering o parsing di contenuto) sono rilevanti se il contenuto elaborato proviene da fonti non fidate. Zecchino usa `localStorage` come unica fonte di dati: il rischio è basso ma non nullo (un utente potrebbe importare dati JSON da fonti esterne).
- Vulnerabilità in una libreria di **sviluppo** (`devDependency`) non raggiungono l'utente finale, ma vanno comunque risolte per la sicurezza della macchina di sviluppo e della pipeline CI.

**Distinguere dipendenze dirette da dipendenze transitive:**

Una vulnerabilità in una dipendenza diretta si risolve aggiornando quella libreria in `package.json`. Una vulnerabilità in una dipendenza transitiva è più complessa: la libreria vulnerabile non è in `package.json`, ma viene installata automaticamente come dipendenza di una libreria che usiamo. In questo caso, l'aggiornamento diretto non è sempre possibile perché dipende dal maintainer della libreria di livello superiore.

`npm audit` mostra la catena completa: ad esempio, `libA@1.0.0` (dipendenza diretta) → `libB@2.0.0` (transitiva) → `libC@0.5.0` (vulnerabile). In questo caso, la correzione diretta di `libC` non è disponibile senza aggiornare prima `libA` (che deve rilasciare una versione che dipende da `libB` aggiornata). Vedere §3.3 per la gestione di questo scenario.

### 3.2 Strategia di aggiornamento: puntuale vs automatico

`npm` offre due modalità di aggiornamento per le vulnerabilità:

**Aggiornamento automatico (`npm audit fix`):**  
Aggiorna automaticamente tutte le dipendenze segnalate, per le quali esiste una versione sicura compatibile con il range di versione attuale specificato in `package.json`. È rapido ma non trasparente: può aggiornare più librerie di quelle attese, può introdurre breaking change minori all'interno dei range `^` (caret), e può modificare il lockfile in modo non verificabile a colpo d'occhio.

**Aggiornamento manuale puntuale:**  
Si identificano una a una le librerie da aggiornare tramite `npm audit`, si modifica manualmente la versione in `package.json`, si riesegue `npm install` e si verifica ogni step. È più lento ma completamente trasparente: si sa esattamente cosa è cambiato, si può verificare immediatamente, e si può fare rollback se il build si rompe.

**Perché in questo passo si preferisce l'approccio puntuale:**

Zecchino è un progetto attivo con un refactor architetturale in corso. Aggiornare in blocco tutte le dipendenze vulnerabili con `npm audit fix` rischia di:

1. Introdurre cambiamenti non intenzionali in librerie che non hanno vulnerabilità (es. `npm audit fix` può aggiornare una dipendenza transitiva che è anche usata direttamente, cambiando una versione funzionante).
2. Rendere difficile isolare la causa se `npm run build` o `npm run lint` smette di funzionare dopo l'aggiornamento.
3. Violare il principio del passo: aggiornare solo ciò che è necessario per la sicurezza, nient'altro.

**Eccezione:** se `npm audit` segnala un gruppo compatto di vulnerabilità tutte risolvibili con un singolo `npm audit fix --dry-run` (modalità simulazione senza scrittura) che mostra un numero limitato di pacchetti modificati, e il dry-run conferma che non ci sono breaking change, si può valutare l'approccio automatico con verifica immediata post-aggiornamento.

La regola operativa è: **prima di eseguire qualsiasi aggiornamento, leggere il dry-run e capire cosa cambierà**.

### 3.3 Gestione delle dipendenze transitive

Quando una vulnerabilità risiede in una dipendenza transitiva che non è direttamente controllabile da `package.json`, le opzioni disponibili sono, in ordine di preferenza:

**Opzione 1 — Aggiornare la dipendenza diretta:**  
Se la libreria diretta (es. `octokit`) ha già rilasciato una versione che dipende dalla versione sicura della transitiva, aggiornare la libreria diretta risolve il problema a cascata. Questo è il percorso preferito perché mantiene la coerenza della catena di dipendenze.

**Opzione 2 — Attendere il maintainer:**  
Se la libreria diretta non ha ancora rilasciato un aggiornamento che incorpora la versione sicura della transitiva, l'unica opzione corretta è documentare la situazione nel coding plan con l'advisory di riferimento e accettare temporaneamente la vulnerabilità con motivazione esplicita. Non si forzano aggiornamenti di versione major senza un passo dedicato.

**Opzione 3 — Usare `overrides` in `package.json` (ultimo ricorso):**  
`npm` supporta una sezione `overrides` in `package.json` che forza l'intera catena di dipendenze a usare una versione specifica di una libreria, indipendentemente da quello che richiedono le librerie di livello superiore. Ad esempio, se `marked@2.x` è vulnerabile ma la dipendenza diretta richiede esattamente `marked@^2`, si può aggiungere un override per forzare `marked` alla versione sicura nella serie 2.x.

Questo approccio risolve la vulnerabilità nell'immediato ma introduce un rischio: si sta forzando una versione che la dipendenza diretta non ha testato. Prima di usare gli overrides, verificare sempre che la versione forzata sia compatibile con la dipendenza diretta (leggendo il changelog della libreria transitiva e verificando che il build passi). Gli overrides devono essere documentati con un commento nel coding plan e rimossi non appena la dipendenza diretta rilascia una versione aggiornata.

### 3.4 Verifica post-aggiornamento

Dopo ogni aggiornamento — sia esso di una singola libreria o di un gruppo — eseguire nell'ordine:

1. **`npm run build`**: verifica che la build di produzione passi senza errori. È il gate primario: se il build si rompe, l'aggiornamento ha introdotto una breaking change e va fatto rollback o risolto prima di procedere.

2. **`npm run lint`**: verifica che la configurazione ESLint appena creata in P15 continui a funzionare. Un aggiornamento di dipendenze può teoricamente rompere il lint se aggiorna un plugin ESLint o una sua dipendenza transitiva in modo incompatibile.

3. **`npm audit`**: verifica che le vulnerabilità oggetto dell'aggiornamento non siano più segnalate. Non necessariamente `npm audit` deve tornare a zero segnalazioni — può restare con segnalazioni documentate come irrisolvibili — ma le vulnerabilità che si è aggiornato per risolvere devono sparire.

La sequenza va ripetuta per ogni gruppo di aggiornamenti, non solo alla fine di tutti gli aggiornamenti. Questo permette di isolare immediatamente se è un aggiornamento specifico a causare un problema.

---

## 4. Criteri di verifica / Definition of Done

### Analisi e preparazione

- [ ] `npm audit --json` eseguito e output letto per intero
- [ ] Lista precisa delle librerie vulnerabili identificata con nome, versione attuale e versione che risolve
- [ ] Classificazione di ogni vulnerabilità: dipendenza diretta o transitiva
- [ ] Strategia per ogni vulnerabilità decisa (aggiornamento diretto / override / accettazione documentata)

### Aggiornamento

- [ ] Per ogni libreria vulnerabile con correzione disponibile: versione aggiornata in `package.json` o in `overrides`
- [ ] `npm install` eseguito dopo ogni modifica a `package.json`
- [ ] Ogni aggiornamento verificato con `npm run build` e `npm run lint` prima di procedere al successivo

### Verifica finale

- [ ] `npm run build` passa (exit code 0)
- [ ] `npm run lint` passa (exit code 0, comportamento invariato rispetto a P15)
- [ ] `npm audit` non segnala più le vulnerabilità oggetto di questo passo
- [ ] Le vulnerabilità eventualmente non risolte sono documentate nel coding plan con advisory di riferimento e motivazione dell'accettazione
- [ ] Nessun file sotto `src/` è stato modificato (`git status` non mostra cambiamenti in `src/`)
- [ ] `git status` mostra solo `package.json` e `package-lock.json` come modificati (oltre ai file di documentazione di questo passo)

---

## 5. Rischi e avvertenze

### 5.1 Breaking change da aggiornamento di versione

Il rischio principale di qualsiasi aggiornamento di dipendenze è che la nuova versione introduca una modifica incompatibile con il codice esistente. Un aggiornamento "patch" (es. da `1.2.3` a `1.2.5`) non dovrebbe introdurre breaking change per semantica semver, ma in pratica succede. Un aggiornamento "minor" (es. da `1.2.x` a `1.3.x`) può deprecare API o cambiarne il comportamento in edge case.

**Come mitigare:** leggere il changelog della libreria tra la versione attuale e quella aggiornata prima di procedere. Se il changelog menziona deprecazioni di API, cercare nei file sotto `src/` se quelle API sono usate. Se sono usate, l'aggiornamento richiede una modifica a `src/` che va fuori perimetro di questo passo: in quel caso, documentare la situazione e valutare se aprire un passo separato o accettare la vulnerabilità temporaneamente.

### 5.2 Vulnerabilità non risolvibili senza attendere il maintainer

Alcune vulnerabilità in dipendenze transitive non hanno una versione sicura disponibile perché il maintainer della libreria diretta non ha ancora rilasciato un aggiornamento. In questi casi il passo non può risolvere la vulnerabilità per via ordinaria.

**Come comportarsi:** documentare nel coding plan l'advisory GitHub della vulnerabilità, la catena di dipendenze che la introduce, e lo stato del percorso di risoluzione (es. se esiste un issue o PR aperto nel repository della libreria diretta). Accettare la vulnerabilità temporaneamente è la scelta corretta se il rischio effettivo per Zecchino è basso (vedi §3.1 per la valutazione del rischio concreto). L'accettazione temporanea non è un fallimento del passo: il passo è completato se tutte le vulnerabilità con correzione disponibile sono state risolte.

### 5.3 `npm audit fix` che modifica più del previsto

Se si sceglie di usare `npm audit fix` anziché l'approccio puntuale, eseguire sempre prima `npm audit fix --dry-run` per vedere l'elenco completo dei pacchetti che verrebbero modificati. Se il dry-run mostra aggiornamenti su librerie non vulnerabili (ad esempio perché npm ha deciso di risolvere il grafo in modo diverso), interrompere e procedere con l'approccio manuale. Il dry-run è una lettura obbligatoria, non facoltativa.

### 5.4 Interruzione del lint dopo aggiornamento

Se dopo un aggiornamento `npm run lint` produce errori di configurazione nuovi (non segnalazioni di codice, ma errori del tipo "cannot find plugin" o "invalid configuration"), verificare che la versione aggiornata della libreria sia compatibile con la versione corrente di ESLint (9.x) e con la configurazione flat config. ESLint 9 ha requisiti di compatibilità più stretti per i plugin. In quel caso fare rollback dell'aggiornamento e considerare l'uso degli `overrides` come soluzione alternativa.

### 5.5 Aggiornamenti major non autorizzati

Questo passo non autorizza aggiornamenti di versione major (da `v3` a `v4`, da `v1` a `v2`). Se una vulnerabilità richiede un salto di versione major per essere risolta, il passo deve documentarlo come "non risolvibile in questo contesto" e aprire una proposta per un passo dedicato all'aggiornamento major, con analisi delle breaking change associate. Gli aggiornamenti major richiedono un piano indipendente perché possono impattare `src/`, la configurazione dei tool e la struttura del progetto.

---

## 6. Cosa NON fare in questo passo

Questo elenco ha lo stesso peso del perimetro in §2: le operazioni qui elencate sono esplicitamente escluse anche se tecnicamente possibili.

- **Non aggiornare librerie senza vulnerabilità segnalate.** Il fatto che esista una versione più recente di una libreria non è motivo sufficiente per aggiornarla in questo passo. Aggiornamenti non legati a sicurezza appartengono a un passo di manutenzione separato.

- **Non eseguire aggiornamenti di versione major.** Un aggiornamento da una versione major all'altra (es. `marked@2` → `marked@15`) non è un'operazione di sicurezza mirata: è un refactor di dipendenze che può richiedere modifiche al codice applicativo.

- **Non modificare nessun file sotto `src/`.** Se un aggiornamento richiede una modifica al codice per continuare a funzionare, la modifica appartiene a un passo separato. In questo passo si fa rollback dell'aggiornamento se il build si rompe, non si corregge `src/`.

- **Non modificare `eslint.config.js`.** La configurazione lint creata in P15 è fuori perimetro. Se un aggiornamento rompe il lint per ragioni di compatibilità del plugin, si fa rollback dell'aggiornamento.

- **Non toccare `.github/`.** Protetto da `framework-guard.instructions.md`.

- **Non eseguire `npm update` generale.** `npm update` aggiorna tutte le dipendenze al massimo del range consentito dai caret e tilde in `package.json`, indipendentemente dalla presenza di vulnerabilità. È un'operazione di manutenzione, non di sicurezza.

---

## 7. Schema visivo della pipeline di verifica sicurezza

```
┌─────────────────────────────────────────────────────────┐
│  ANALISI                                                │
│  npm audit --json                                       │
│  Leggi ogni voce: gravità, libreria, transitiva/diretta │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  IDENTIFICAZIONE                                        │
│  Per ogni vulnerabilità:                                │
│  ├── Correzione disponibile?                            │
│  │   ├── Sì, diretta → aggiornamento in package.json   │
│  │   ├── Sì, transitiva → aggiornamento libreria padre │
│  │   │   oppure override come ultimo ricorso           │
│  │   └── No → documenta advisory + accetta motivato    │
│  └── Breaking change nel changelog?                     │
│      ├── No → procedi                                   │
│      └── Sì → valuta passo separato o accettazione      │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  AGGIORNAMENTO                                          │
│  Modifica package.json (versione o overrides)           │
│  npm install                                            │
│  (ripeti per ogni libreria, non in blocco)              │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  VERIFICA — dopo ogni aggiornamento                     │
│  npm run build    → deve passare (exit 0)               │
│  npm run lint     → deve passare (exit 0)               │
│  npm audit        → le vulnerabilità aggiornate         │
│                     non devono più apparire             │
│                                                         │
│  Se build/lint si rompono → rollback + documenta        │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  CHIUSURA                                               │
│  git status: solo package.json e package-lock.json      │
│  Vulnerabilità risolte: documentate nel coding plan     │
│  Vulnerabilità accettate: documentate con advisory      │
│  npm audit finale: solo segnalazioni accettate (o zero) │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Note operative per chi esegue il passo

Alcune considerazioni pratiche che non appartengono al design formale ma aiutano l'esecuzione:

**Snapshot pre-aggiornamento:** prima di qualsiasi modifica, eseguire `npm audit` e conservare l'output come riferimento nel coding plan. Questo permette di confrontare lo stato iniziale con quello finale e di documentare esattamente quante e quali vulnerabilità sono state risolte.

**Ordine di aggiornamento:** iniziare dalle dipendenze dirette segnalate come `high`, poi quelle `moderate`. Le dipendenze transitive senza correzione disponibile vanno affrontate per ultime, dopo aver risolto quelle risolvibili.

**Lockfile coerente:** dopo ogni `npm install`, il `package-lock.json` viene rigenerato automaticamente. Non modificare manualmente il lockfile: è generato da npm e va trattato come output, non come input.

**Nessuna modifica ai `scripts` di `package.json`:** la sezione `scripts` non fa parte del perimetro. L'unica modifica lecita è alla sezione `dependencies` / `devDependencies` / `overrides`.
