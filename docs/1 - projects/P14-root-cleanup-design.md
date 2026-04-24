# P14 — Pulizia root directory: riordino documentazione e rimozione file obsoleti

> Documento di design. Nessun file di codice viene creato o modificato in questa fase.  
> Pacchetto: 14  
> Data: 24 aprile 2026  
> Ramo di lavoro: `refactoring-architettura`

---

## 1. Obiettivo

Al termine del refactor P01–P13, la root directory del progetto contiene **21 file Markdown sparsi** e **5 file di log committati**, classificati nel report diagnostico post-P13 (`docs/4 - reports/Diagnostic-Analysis-Post-P13.md`, §4) come "igiene root directory: POVERA".

Questi file si sono accumulati durante lo sviluppo iterativo come note di lavoro, log di sessione, rapporti TalkBack, guide accessibilità e snapshot di funzionalità. Nessuno di essi appartiene alla root: la root è il punto di ingresso pubblico del repository, e dovrebbe contenere solo i file attesi dai tool standard (configurazione, LICENSE, README) e le cartelle di codice.

**Cosa si ottiene con questa pulizia:**

- La root diventa navigabile senza rumore: chi apre il repository trova immediatamente i file che cercano.
- I documenti di prodotto e accessibilità vengono collocati sotto `docs/` con una gerarchia coerente, affiancando i documenti di design già presenti.
- Quattro file TalkBack sovrapposti vengono consolidati in un unico documento strutturato, eliminando duplicazioni e rendendo la documentazione TalkBack consultabile senza dover cercare tra file multipli.
- I file di log temporanei vengono rimossi dal tracking git e protetti con pattern `.gitignore` per non accumularsi in futuro.
- `README.md` viene aggiornato con una sezione "Documentazione" che guida il lettore alla struttura di `docs/`.

**Il comportamento dell'app è completamente invariato**: questo passo tocca esclusivamente la struttura del repository e i documenti di progetto, senza modificare nessun file sotto `src/`.

---

## 2. Perimetro della modifica

### 2.1 File che restano in root (non toccati)

| File | Categoria |
|---|---|
| `README.md` | Standard repo — verrà solo aggiornato nella sezione Documentazione |
| `LICENSE` | Standard repo |
| `SECURITY.md` | Standard repo |
| `CHANGELOG.md` | Standard repo |
| `package.json` | Configurazione tool |
| `tsconfig.json` | Configurazione tool |
| `vite.config.ts` | Configurazione tool |
| `tailwind.config.js` | Configurazione tool |
| `components.json` | Configurazione tool |
| `theme.json` | Configurazione tool |
| `index.html` | Entry point Vite |
| `runtime.config.json` | Configurazione Spark |
| `spark.meta.json` | Configurazione Spark |
| `zecchino.code-workspace` | Workspace VS Code |
| `.github/` | Cartella framework — vedi `framework-guard.instructions.md` |
| `.vscode/` | Configurazione editor |
| `.venv/` | Ambiente Python locale |
| `dist/` | Output build (già in `.gitignore`) |

### 2.2 File da spostare in `docs/`

| File sorgente (root) | Destinazione in `docs/` |
|---|---|
| `PRD.md` | `docs/PRD.md` |
| `ACCESSIBILITY.md` | `docs/accessibility/ACCESSIBILITY.md` |
| `ACCESSIBILITY_IMPROVEMENTS.md` | `docs/accessibility/history/ACCESSIBILITY_IMPROVEMENTS.md` |
| `ANDROID_ACCESSIBILITY.md` | `docs/accessibility/android/ANDROID_ACCESSIBILITY.md` |
| `ANDROID_IMPLEMENTATION_SUMMARY.md` | `docs/accessibility/android/ANDROID_IMPLEMENTATION_SUMMARY.md` |
| `HAPTIC_FEEDBACK.md` | `docs/feedback/HAPTIC_FEEDBACK.md` |
| `SOUND_COVERAGE_REPORT.md` | `docs/feedback/SOUND_COVERAGE_REPORT.md` |
| `GUIDA_SCREEN_READER.md` | `docs/accessibility/GUIDA_SCREEN_READER.md` |
| `SCREEN_READER_AUDIT.md` | `docs/accessibility/SCREEN_READER_AUDIT.md` |

### 2.3 File da consolidare

| File sorgente (root) | Destinazione |
|---|---|
| `TALKBACK_ACCESSIBILITY_VERIFICATION.md` | confluisce in `docs/accessibility/talkback.md` |
| `TALKBACK_AUTO_DETECTION.md` | confluisce in `docs/accessibility/talkback.md` |
| `TALKBACK_COMPLIANCE_REPORT.md` | confluisce in `docs/accessibility/talkback.md` |
| `TALKBACK_IMPROVEMENTS.md` | confluisce in `docs/accessibility/talkback.md` |

I 4 file originali vengono eliminati dalla root dopo la fusione nel documento consolidato.

### 2.4 File da eliminare

| File | Motivazione |
|---|---|
| `FUNZIONALITA_COMPLETE.md` | Snapshot di funzionalità obsoleto; le informazioni rilevanti sono già nel `CHANGELOG.md` |
| `CORREZIONI_APPLICATE.md` | Log storico di fix superato; non aggiunge valore consultabile oggi |
| `FINAL_FIXES.md` | Log storico di fix superato |
| `DIAGNOSIS_REPORT.md` | Report diagnostico superato da `docs/4 - reports/Diagnostic-Analysis-Post-P13.md` |

### 2.5 File di log da eliminare e proteggere

| File | Azione |
|---|---|
| `build-out.txt` | Eliminare dal repository |
| `build-err.txt` | Eliminare dal repository |
| `build_log.txt` | Eliminare dal repository |
| `build_output.txt` | Eliminare dal repository |
| `tsc_output.txt` | Eliminare dal repository |

Contestualmente, aggiornare `.gitignore` con pattern che impediscano il tracciamento futuro di questi file.

---

## 3. Dettaglio delle operazioni

### 3.1 Spostamento di `PRD.md`

`PRD.md` (Product Requirements Document) è il documento che descrive i requisiti di prodotto di Zecchino. È il punto di partenza concettuale dell'intero progetto e appartiene naturalmente a `docs/`, affiancato ad `api.md`, `architettura.md` e `todo.md` che già vivono lì al livello radice di `docs/`.

Destinazione: `docs/PRD.md`.

Non richiede la creazione di nuove sottocartelle. Il file viene spostato così com'è. Eventuali link interni che puntano a `PRD.md` dalla root andranno verificati e corretti dopo lo spostamento (vedi §4.2).

### 3.2 Spostamento dei documenti di accessibilità generale

I file `ACCESSIBILITY.md`, `GUIDA_SCREEN_READER.md` e `SCREEN_READER_AUDIT.md` descrivono rispettivamente la strategia generale di accessibilità, la guida utente per gli screen reader e l'audit condotto sull'implementazione attuale. Sono documenti distinti per audience e scopo: la guida è rivolta all'utente finale, l'audit è tecnico, la strategia è trasversale.

Vengono spostati nella nuova cartella `docs/accessibility/` come file separati: non si consolidano perché svolgono funzioni diverse. Creare `docs/accessibility/` se non esiste.

Destinazioni:
- `ACCESSIBILITY.md` → `docs/accessibility/ACCESSIBILITY.md`
- `GUIDA_SCREEN_READER.md` → `docs/accessibility/GUIDA_SCREEN_READER.md`
- `SCREEN_READER_AUDIT.md` → `docs/accessibility/SCREEN_READER_AUDIT.md`

### 3.3 Archiviazione storica di `ACCESSIBILITY_IMPROVEMENTS.md`

`ACCESSIBILITY_IMPROVEMENTS.md` è un log iterativo che documenta i miglioramenti di accessibilità introdotti durante lo sviluppo. Ha valore come riferimento storico ma non è un documento di consultazione primaria. Viene spostato in `docs/accessibility/history/` per segnalarne la natura archivistica.

Destinazione: `docs/accessibility/history/ACCESSIBILITY_IMPROVEMENTS.md`. Creare `docs/accessibility/history/` se non esiste.

### 3.4 Spostamento della documentazione Android

`ANDROID_ACCESSIBILITY.md` e `ANDROID_IMPLEMENTATION_SUMMARY.md` documentano le specifiche di accessibilità e il sommario di implementazione per la piattaforma Android. Sono tematicamente coesi e si spostano insieme nella sottocartella `docs/accessibility/android/`.

Destinazioni:
- `ANDROID_ACCESSIBILITY.md` → `docs/accessibility/android/ANDROID_ACCESSIBILITY.md`
- `ANDROID_IMPLEMENTATION_SUMMARY.md` → `docs/accessibility/android/ANDROID_IMPLEMENTATION_SUMMARY.md`

Creare `docs/accessibility/android/` se non esiste.

### 3.5 Spostamento dei file feedback

`HAPTIC_FEEDBACK.md` e `SOUND_COVERAGE_REPORT.md` documentano rispettivamente il sistema di feedback aptico e la copertura del sistema audio. Formano un gruppo tematico distinto dall'accessibilità vera e propria (sono funzionalità di feedback sensoriale). Vengono spostati in `docs/feedback/`.

Destinazioni:
- `HAPTIC_FEEDBACK.md` → `docs/feedback/HAPTIC_FEEDBACK.md`
- `SOUND_COVERAGE_REPORT.md` → `docs/feedback/SOUND_COVERAGE_REPORT.md`

Creare `docs/feedback/` se non esiste.

### 3.6 Consolidamento dei quattro file TalkBack

I quattro file TalkBack presenti in root (`TALKBACK_ACCESSIBILITY_VERIFICATION.md`, `TALKBACK_AUTO_DETECTION.md`, `TALKBACK_COMPLIANCE_REPORT.md`, `TALKBACK_IMPROVEMENTS.md`) trattano tutti la stessa tecnologia assistiva su Android e si sovrappongono parzialmente. Tenerli come quattro file separati rende difficile avere un quadro complessivo del supporto TalkBack nel progetto.

Vengono fusi in un unico documento `docs/accessibility/talkback.md` con le seguenti sezioni:

1. **Panoramica e compliance** — contenuto da `TALKBACK_COMPLIANCE_REPORT.md`
2. **Rilevamento automatico** — contenuto da `TALKBACK_AUTO_DETECTION.MD`
3. **Verifiche di accessibilità** — contenuto da `TALKBACK_ACCESSIBILITY_VERIFICATION.md`
4. **Miglioramenti e changelog TalkBack** — contenuto da `TALKBACK_IMPROVEMENTS.md`

Il file consolidato deve preservare tutti i contenuti rilevanti dei quattro file originali senza perdere informazioni. Dopo la creazione del file consolidato, i quattro file originali vengono eliminati dalla root.

**Nota**: il documento diagnostico `docs/4 - reports/Diagnostic-Analysis-Post-P13.md` (§4.1) suggeriva di consolidare anche `SCREEN_READER_AUDIT.md` e `GUIDA_SCREEN_READER.md` con i file TalkBack. Il perimetro di questo pacchetto mantiene i due file screen reader separati (§3.2) perché servono audience diverse: la guida è per l'utente, l'audit è per il team tecnico, mentre i file TalkBack sono specifici per la piattaforma Android. Il consolidamento riguarda solo i quattro file TalkBack.

### 3.7 Eliminazione dei log storici

I file `FUNZIONALITA_COMPLETE.md`, `CORREZIONI_APPLICATE.md`, `FINAL_FIXES.md` e `DIAGNOSIS_REPORT.md` sono stati utili durante lo sviluppo come note di lavoro o snapshot intermedi, ma il loro contenuto è oggi o obsoleto o già rappresentato in forma migliore in `CHANGELOG.md` e in `docs/4 - reports/`. Tenerli in root aggiunge rumore senza valore.

Vengono eliminati definitivamente. Prima dell'eliminazione, chi esegue questa operazione deve aprire brevemente ciascun file per verificare che non contenga informazioni univoche non già presenti altrove nel repository.

### 3.8 Eliminazione dei file di log e protezione `.gitignore`

I file `build-out.txt`, `build-err.txt`, `build_log.txt`, `build_output.txt` e `tsc_output.txt` sono output temporanei di comandi di build e type-checking. Non devono essere committati perché cambiano ad ogni esecuzione e non hanno valore storico.

Vengono eliminati dal repository e aggiunti a `.gitignore` con pattern che coprano anche eventuali file analoghi creati in futuro (vedi §4.3).

---

## 4. Aggiornamenti consequenziali

### 4.1 Aggiornamento di `README.md`

Dopo gli spostamenti, `README.md` deve includere una nuova sezione **"Documentazione"** che descriva la struttura di `docs/` e i link ai documenti principali. La sezione deve almeno linkare:

- `docs/PRD.md` — requisiti di prodotto
- `docs/architettura.md` — architettura tecnica
- `docs/api.md` — API e interfacce
- `docs/accessibility/ACCESSIBILITY.md` — strategia di accessibilità
- `docs/accessibility/talkback.md` — supporto TalkBack
- `docs/feedback/HAPTIC_FEEDBACK.md` e `docs/feedback/SOUND_COVERAGE_REPORT.md` — sistemi di feedback
- `docs/1 - projects/README.md` — indice dei documenti di design

La sezione "Documentazione" si inserisce dopo la sezione di presentazione del progetto e prima della sezione di installazione/sviluppo, se presente.

### 4.2 Verifica dei link interni nei file spostati

Dopo ogni spostamento, i link relativi all'interno del file spostato devono essere verificati e, se necessario, corretti. I casi più probabili di link da correggere sono:

- Link da `ACCESSIBILITY.md` a `GUIDA_SCREEN_READER.md`: se il link era relativo alla root (es. `./GUIDA_SCREEN_READER.md`), diventa un link relativo nella nuova posizione (es. `./GUIDA_SCREEN_READER.md` rimane valido perché entrambi sono in `docs/accessibility/`).
- Link da `ACCESSIBILITY_IMPROVEMENTS.md` ad altri documenti: se usava percorsi relativi dalla root, devono essere aggiornati tenendo conto che il file è ora in `docs/accessibility/history/`.
- Link interni nel file consolidato `docs/accessibility/talkback.md`: i quattro file originali potrebbero contenere link a file ora spostati. Verificare dopo la creazione.
- Link da altri file di `docs/` al `PRD.md` originale in root: rari ma possibili, da aggiornare in `docs/architettura.md` e altri documenti di design.

### 4.3 Aggiornamento di `.gitignore`

Aggiungere al file `.gitignore` esistente i seguenti pattern, preferibilmente in un blocco commentato per chiarire la motivazione:

```
# Log temporanei di build e type-checking
build*.txt
build*.log
tsc_output.txt
```

Il pattern `build*.txt` copre `build-out.txt`, `build-err.txt`, `build_log.txt`, `build_output.txt` e varianti future con prefisso `build`. Il pattern `tsc_output.txt` è specifico perché `tsc_output` non segue la convenzione `build*`.

Se il file `.gitignore` già contiene una sezione per gli artefatti generati, i pattern vanno aggiunti in quella sezione per coerenza.

---

## 5. Criteri di verifica / Definition of Done

- [ ] I 9 file elencati in §2.2 sono assenti dalla root e presenti nelle rispettive destinazioni in `docs/`
- [ ] Le 3 sottocartelle nuove esistono: `docs/accessibility/android/`, `docs/accessibility/history/`, `docs/feedback/`
- [ ] `docs/accessibility/talkback.md` esiste e contiene le 4 sezioni descritte in §3.6
- [ ] I 4 file TalkBack originali sono assenti dalla root
- [ ] I 4 file di log storico (`FUNZIONALITA_COMPLETE.md`, `CORREZIONI_APPLICATE.md`, `FINAL_FIXES.md`, `DIAGNOSIS_REPORT.md`) sono assenti dalla root
- [ ] I 5 file `.txt` di log sono assenti dalla root
- [ ] `.gitignore` contiene i pattern `build*.txt`, `build*.log`, `tsc_output.txt`
- [ ] `README.md` contiene la sezione "Documentazione" con link alla struttura di `docs/`
- [ ] I link relativi interni nei file spostati sono stati verificati (non producono 404 navigando su GitHub)
- [ ] `git status` non mostra nessun file sotto `src/` come modificato
- [ ] La struttura di `docs/` corrisponde alla struttura target descritta nell'intestazione del task

---

## 6. Rischi e avvertenze

### 6.1 Perdita di contenuto nel consolidamento TalkBack

Quando si fondono quattro file in uno, il rischio più concreto è omettere involontariamente una sezione o un paragrafo. Prima di eliminare i quattro file originali, verificare che ogni sezione di ciascun file sia presente nel documento consolidato. Una strategia sicura è procedere per accodamento (appendere il contenuto di ciascun file in una sezione dedicata) e poi riorganizzare, anziché riscrivere di netto.

### 6.2 Link esterni che puntano ai file originali

Se il repository è pubblico su GitHub e qualcuno ha linkato direttamente file come `ACCESSIBILITY.md` o `PRD.md` nella root (es. in issue, discussioni, documentazione esterna), quei link si romperanno. Il rischio è basso trattandosi di un progetto personale, ma va tenuto presente.

### 6.3 Log storici con informazioni non documentate altrove

`DIAGNOSIS_REPORT.md`, `CORREZIONI_APPLICATE.md` e `FINAL_FIXES.md` potrebbero contenere note tecniche non ancora riflesse in `CHANGELOG.md` o nel report post-P13. Prima dell'eliminazione, scorrere brevemente ciascun file per escludere questo scenario. Se si trovano informazioni rilevanti, trascriverle nel report diagnostico o nel `CHANGELOG.md` prima di eliminare il file originale.

### 6.4 `.gitignore` e file già tracciati

Aggiungere pattern a `.gitignore` non rimuove i file già tracciati da git. I 5 file `.txt` di log devono essere rimossi esplicitamente dall'indice git con un comando equivalente a `git rm --cached` prima di commitare la modifica a `.gitignore`. In caso contrario, i file resteranno nel repository anche dopo l'aggiornamento del `.gitignore`.

### 6.5 Cartelle non ancora esistenti

Le cartelle `docs/accessibility/`, `docs/accessibility/android/`, `docs/accessibility/history/` e `docs/feedback/` non esistono nel repository attuale. Devono essere create prima di spostare i file. Git non traccia le cartelle vuote: le cartelle esisteranno nel momento in cui conterranno almeno un file.

---

## 7. Cosa NON fare in questo passo

- **Non modificare nessun file sotto `src/`**: il perimetro è esclusivamente documentazione e struttura del repository.
- **Non modificare i file di configurazione tecnica** (`package.json`, `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`, `components.json`, `theme.json`, `runtime.config.json`, `spark.meta.json`): restano in root come previsto dallo standard.
- **Non toccare `.github/`**: i file del framework SCF sono protetti da `framework-guard.instructions.md`.
- **Non eliminare `CHANGELOG.md`**: è un file standard del repository, non un log storico eliminabile.
- **Non consolidare `SCREEN_READER_AUDIT.md` e `GUIDA_SCREEN_READER.md` nei file TalkBack**: il perimetro del documento diagnostico suggeriva questa opzione, ma questo pacchetto la esclude esplicitamente perché i due file hanno audience e scopo diversi dai documenti TalkBack.
- **Non riorganizzare le cartelle esistenti di `docs/`** (`1 - projects/`, `2 - coding plans/`, `3 - todo lists/`, `4 - reports/`): sono invariate.
- **Non creare nuovi file di documentazione tecnica** oltre al consolidamento TalkBack: questo passo riorganizza documenti esistenti, non ne produce di nuovi.
- **Non aggiornare le todo list o i coding plan** per riflettere questo passo: `docs/3 - todo lists/` e `docs/2 - coding plans/` sono invariati.

---

## 8. Struttura finale di `docs/`

Schema della cartella `docs/` al termine del Passo 14. Le cartelle numerate sono invariate; le cartelle `accessibility/` e `feedback/` sono nuove.

```
docs/
├── 1 - projects/                          ← documenti di design P01–P14 (invariata)
├── 2 - coding plans/                      ← coding plan P01–P14 (invariata)
├── 3 - todo lists/                        ← todo list P01–P14 (invariata)
├── 4 - reports/                           ← report diagnostici (invariata)
│
├── accessibility/                         ← nuova — documentazione accessibilità
│   ├── android/                           ← nuova — specifiche piattaforma Android
│   │   ├── ANDROID_ACCESSIBILITY.md       ← spostato da root
│   │   └── ANDROID_IMPLEMENTATION_SUMMARY.md  ← spostato da root
│   ├── history/                           ← nuova — archivio storico iterazioni a11y
│   │   └── ACCESSIBILITY_IMPROVEMENTS.md  ← spostato da root
│   ├── ACCESSIBILITY.md                   ← spostato da root — strategia generale a11y
│   ├── GUIDA_SCREEN_READER.md             ← spostato da root — guida utente SR
│   ├── SCREEN_READER_AUDIT.md             ← spostato da root — audit tecnico SR
│   └── talkback.md                        ← nuovo — consolidamento 4 file TalkBack
│
├── feedback/                              ← nuova — documentazione feedback sensoriale
│   ├── HAPTIC_FEEDBACK.md                 ← spostato da root
│   └── SOUND_COVERAGE_REPORT.md          ← spostato da root
│
├── PRD.md                                 ← spostato da root — requisiti di prodotto
├── api.md                                 ← invariato
├── architettura.md                        ← invariato
└── todo.md                                ← invariato
```
