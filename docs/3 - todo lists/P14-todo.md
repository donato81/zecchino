# P14 — Todo List: Pulizia root directory

> Checklist operativa sequenziale per il Pacchetto 14 — Igiene del repository post-refactoring.  
> Coding Plan di riferimento: `docs/2 - coding plans/P14-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P14-root-cleanup-design.md`  
> ⚠️ = richiede attenzione prima di procedere (vedi rischi e ambiguità nel coding plan)

---

## Prima di iniziare

- [ ] Leggere `docs/2 - coding plans/P14-coding-plan.md` per intero
- [ ] ⚠️ **Questo passo NON modifica nessun file sotto `src/`** — solo struttura repository e documenti
- [ ] ⚠️ **Nessuna verifica TypeScript richiesta** — nessun file `.ts`/`.tsx` viene toccato
- [ ] ⚠️ **`.github/` è protetto** — non aprire, non modificare nulla sotto `.github/`
- [ ] Verificare di essere sul branch `refactoring-architettura`
  ```
  git branch --show-current
  ```
  Atteso: `refactoring-architettura`
- [ ] Eseguire `git status` per confermare lo stato iniziale pulito del repository
- [ ] Eseguire `Get-ChildItem -File | Sort-Object` (o `ls`) in root per confermare la presenza di tutti i file da gestire
  - Attesi in root: 9 file da spostare, 4 TalkBack da consolidare, 4 log storici da eliminare, 6 log tecnici da eliminare
- [ ] Prendere nota dei risultati delle ambiguità verificate nel coding plan:
  - [ ] **AI1**: tutti i 21 file da gestire sono presenti; `build.log` è un file extra da gestire nella Sotto-op. 5
  - [ ] **AI2**: le 4 nuove cartelle di `docs/` NON esistono ancora — verranno create con i primi file spostati
  - [ ] **AI3**: nessun link relativo a file esterni nei 9 file da spostare né nei 4 file TalkBack — nessuna correzione link necessaria
  - [ ] **AI4**: nessuno dei 4 log storici contiene informazioni univoche — eliminazione diretta senza trascrizioni
  - [ ] **AI5**: i 3 pattern non sono nel `.gitignore` → da aggiungere nella Sotto-op. 5
  - [ ] **AI6**: `talkback.md` conterrà 4 sezioni (~2.050 righe totali): Conformità (518), Rilevamento (250), Verifiche (833), Miglioramenti (433)
- [ ] Prendere nota dei rischi critici 🔴:
  - [ ] **R1**: non eliminare i 4 file TalkBack sorgente prima di aver verificato che `talkback.md` sia completo
  - [ ] **R2**: eliminare i file `.txt`/`.log` PRIMA di aggiornare `.gitignore` — non il contrario
  - [ ] **R3**: `git status` non deve mostrare modifiche sotto `src/` in nessuna fase

---

## Passo unico — Sotto-operazione 1: Ricognizione pre-operativa

> **Eseguire prima di qualsiasi spostamento o eliminazione.**

- [ ] Verificare branch: `git branch --show-current` → `refactoring-architettura`
- [ ] Verificare stato git: `git status` → working tree pulito o solo file non tracciati attesi
- [ ] Verificare struttura `docs/`: `Get-ChildItem -Path docs -Recurse -Directory` → solo le 4 cartelle numerate
- [ ] ⚠️ Se una delle 4 nuove cartelle (`accessibility/`, `accessibility/android/`, `accessibility/history/`, `feedback/`) esiste già, documentare e procedere comunque — non è un blocco
- [ ] Confermare che i 9 file da spostare siano presenti in root

---

## Passo unico — Sotto-operazione 2: Spostamento dei 9 file in `docs/`

> Spostare nell'ordine indicato (progressivamente crea le 4 nuove cartelle).  
> Usare `git mv <sorgente> <destinazione>` per preservare la storia git.

### PRD e accessibilità radice (crea `docs/accessibility/`)

- [ ] Spostare `PRD.md` → `docs/PRD.md`
  ```
  git mv PRD.md docs/PRD.md
  ```
- [ ] Spostare `ACCESSIBILITY.md` → `docs/accessibility/ACCESSIBILITY.md`
  ```
  git mv ACCESSIBILITY.md "docs/accessibility/ACCESSIBILITY.md"
  ```
- [ ] Spostare `GUIDA_SCREEN_READER.md` → `docs/accessibility/GUIDA_SCREEN_READER.md`
  ```
  git mv GUIDA_SCREEN_READER.md "docs/accessibility/GUIDA_SCREEN_READER.md"
  ```
- [ ] Spostare `SCREEN_READER_AUDIT.md` → `docs/accessibility/SCREEN_READER_AUDIT.md`
  ```
  git mv SCREEN_READER_AUDIT.md "docs/accessibility/SCREEN_READER_AUDIT.md"
  ```

### Archiviazione storica (crea `docs/accessibility/history/`)

- [ ] Spostare `ACCESSIBILITY_IMPROVEMENTS.md` → `docs/accessibility/history/ACCESSIBILITY_IMPROVEMENTS.md`
  ```
  git mv ACCESSIBILITY_IMPROVEMENTS.md "docs/accessibility/history/ACCESSIBILITY_IMPROVEMENTS.md"
  ```

### Documentazione Android (crea `docs/accessibility/android/`)

- [ ] Spostare `ANDROID_ACCESSIBILITY.md` → `docs/accessibility/android/ANDROID_ACCESSIBILITY.md`
  ```
  git mv ANDROID_ACCESSIBILITY.md "docs/accessibility/android/ANDROID_ACCESSIBILITY.md"
  ```
- [ ] Spostare `ANDROID_IMPLEMENTATION_SUMMARY.md` → `docs/accessibility/android/ANDROID_IMPLEMENTATION_SUMMARY.md`
  ```
  git mv ANDROID_IMPLEMENTATION_SUMMARY.md "docs/accessibility/android/ANDROID_IMPLEMENTATION_SUMMARY.md"
  ```

### Feedback (crea `docs/feedback/`)

- [ ] Spostare `HAPTIC_FEEDBACK.md` → `docs/feedback/HAPTIC_FEEDBACK.md`
  ```
  git mv HAPTIC_FEEDBACK.md "docs/feedback/HAPTIC_FEEDBACK.md"
  ```
- [ ] Spostare `SOUND_COVERAGE_REPORT.md` → `docs/feedback/SOUND_COVERAGE_REPORT.md`
  ```
  git mv SOUND_COVERAGE_REPORT.md "docs/feedback/SOUND_COVERAGE_REPORT.md"
  ```

### Verifica intermedia 2

- [ ] Verificare che i 9 file siano **assenti dalla root** e **presenti nelle destinazioni**
- [ ] ⚠️ AI3 confermato: nessun link relativo da correggere nei file spostati
- [ ] `git status` non mostra modifiche sotto `src/`

---

## Passo unico — Sotto-operazione 3: Consolidamento dei 4 file TalkBack

> ⚠️ **R1 — CRITICO**: non eliminare i 4 file sorgente finché il consolidato non è verificato.

### 3.1 — Creazione di `docs/accessibility/talkback.md`

- [ ] Creare il file `docs/accessibility/talkback.md` con intestazione e 4 sezioni nell'ordine:
  1. **Sezione 1** — Conformità TalkBack (contenuto di `TALKBACK_COMPLIANCE_REPORT.md` — 518 righe)
  2. **Sezione 2** — Rilevamento Automatico (contenuto di `TALKBACK_AUTO_DETECTION.md` — 250 righe)
  3. **Sezione 3** — Verifiche di Accessibilità (contenuto di `TALKBACK_ACCESSIBILITY_VERIFICATION.md` — 833 righe)
  4. **Sezione 4** — Miglioramenti e Changelog TalkBack (contenuto di `TALKBACK_IMPROVEMENTS.md` — 433 righe)
- [ ] Per ciascuna sezione: copiare il contenuto integrale del file sorgente, rimuovere il titolo H1 originale (sostituito dall'intestazione di sezione `## N. Titolo`), conservare tutto il resto
- [ ] ⚠️ Strategia: accodamento sezione per sezione — non riscrivere né sintetizzare (design §6.1)
- [ ] ⚠️ AI6 confermato: nessun link relativo tra i 4 file — il consolidato non richiede correzioni link

### 3.2 — Verifica completezza del consolidato

- [ ] Aprire `docs/accessibility/talkback.md` e verificare che la sezione 1 contenga il contenuto di `TALKBACK_COMPLIANCE_REPORT.md`
- [ ] Verificare che la sezione 2 contenga il contenuto di `TALKBACK_AUTO_DETECTION.md`
- [ ] Verificare che la sezione 3 contenga il contenuto di `TALKBACK_ACCESSIBILITY_VERIFICATION.md` (la più lunga — 833 righe)
- [ ] Verificare che la sezione 4 contenga il contenuto di `TALKBACK_IMPROVEMENTS.md`
- [ ] Contare approssimativamente le righe di `talkback.md`: attese ~2.050 (±50 per intestazioni/separatori)
- [ ] ⚠️ **Non procedere al 3.3 finché tutte le 4 verifiche di completezza sono spuntate**

### 3.3 — Eliminazione dei 4 file TalkBack sorgente

Solo dopo aver completato 3.2:

- [ ] Eliminare `TALKBACK_COMPLIANCE_REPORT.md` dalla root
- [ ] Eliminare `TALKBACK_AUTO_DETECTION.md` dalla root
- [ ] Eliminare `TALKBACK_ACCESSIBILITY_VERIFICATION.md` dalla root
- [ ] Eliminare `TALKBACK_IMPROVEMENTS.md` dalla root

### Verifica intermedia 3

- [ ] `docs/accessibility/talkback.md` esiste e le 4 sezioni sono visibili
- [ ] I 4 file TalkBack originali sono **assenti dalla root**
- [ ] `git status` non mostra modifiche sotto `src/`

---

## Passo unico — Sotto-operazione 4: Eliminazione dei 4 file di log storico

> AI4 confermato: nessuno di questi file contiene informazioni univoche — eliminazione diretta.

- [ ] ⚠️ Prima dell'eliminazione: scorrere brevemente `FUNZIONALITA_COMPLETE.md` per una conferma visiva — le sue informazioni sono già in `PRD.md` e `CHANGELOG.md`
- [ ] ⚠️ Prima dell'eliminazione: scorrere brevemente `DIAGNOSIS_REPORT.md` per una conferma visiva — superato da `docs/4 - reports/Diagnostic-Analysis-Post-P13.md`
- [ ] Eliminare dalla root: `FUNZIONALITA_COMPLETE.md`
- [ ] Eliminare dalla root: `CORREZIONI_APPLICATE.md`
- [ ] Eliminare dalla root: `FINAL_FIXES.md`
- [ ] Eliminare dalla root: `DIAGNOSIS_REPORT.md`

### Verifica intermedia 4

- [ ] I 4 file di log storico sono **assenti dalla root**
- [ ] `git status` non mostra modifiche sotto `src/`

---

## Passo unico — Sotto-operazione 5: Eliminazione file di log tecnici e `.gitignore`

> ⚠️ **R2 — CRITICO — L'ORDINE È VINCOLANTE**: eliminare prima i file fisicamente (con `git rm`), poi aggiornare `.gitignore`. Non invertire l'ordine.  
> ⚠️ AI5 confermato: i 3 pattern (`build*.txt`, `build*.log`, `tsc_output.txt`) NON sono presenti nel `.gitignore` attuale — vanno aggiunti.

### 5.1 — Eliminazione fisica e rimozione dall'indice git

- [ ] Eliminare dall'indice git e dalla root (con `git rm` o eliminare + stage):
  - `build-out.txt`
  - `build-err.txt`
  - `build_log.txt`
  - `build_output.txt`
  - `tsc_output.txt`
  - `build.log` ← **file extra rispetto al design §2.5** — presente in root e tracciato; coperto da `*.log` ma va rimosso dall'indice (AI1)
- [ ] Verificare che `git status` mostri i 6 file come "deleted" (staged), non come "untracked"

### 5.2 — Aggiornamento `.gitignore`

- [ ] Aprire `.gitignore`
- [ ] Aggiungere in fondo al file il seguente blocco:
  ```gitignore
  # Log temporanei di build e type-checking
  build*.txt
  build*.log
  tsc_output.txt
  ```
- [ ] Verificare che i 3 pattern siano stati aggiunti correttamente
- [ ] ⚠️ Non aggiungere pattern che potrebbero escludere file di configurazione legittimi

### Verifica intermedia 5

- [ ] I 6 file di log (incluso `build.log`) sono **assenti dalla root**
- [ ] `git status` mostra i 6 file come eliminati (non come untracked)
- [ ] `.gitignore` contiene i pattern `build*.txt`, `build*.log`, `tsc_output.txt`

---

## Passo unico — Sotto-operazione 6: Aggiornamenti consequenziali

> ⚠️ AI3 confermato: nessun link relativo nei file spostati richiede correzione — la Sotto-op. 6 riguarda solo `README.md`.

### 6.1 — Sezione "Documentazione" in `README.md`

- [ ] Aprire `README.md` e individuare la sezione di presentazione del progetto
- [ ] Inserire la sezione **"## Documentazione"** dopo la presentazione e prima della sezione installazione/sviluppo (se presente), o alla fine del file se non esiste una sezione installazione
- [ ] La sezione deve includere almeno i seguenti link (verificare che i percorsi corrispondano a file esistenti):
  - `docs/PRD.md` — requisiti di prodotto
  - `docs/architettura.md` — architettura tecnica
  - `docs/api.md` — API e interfacce
  - `docs/accessibility/ACCESSIBILITY.md` — strategia di accessibilità
  - `docs/accessibility/talkback.md` — supporto TalkBack (Android)
  - `docs/feedback/HAPTIC_FEEDBACK.md` — sistema di feedback aptico
  - `docs/feedback/SOUND_COVERAGE_REPORT.md` — copertura audio
  - `docs/1 - projects/README.md` — indice dei documenti di design
- [ ] Verificare visivamente che ogni link punti a un file esistente nel repository

### Verifica intermedia 6

- [ ] `README.md` contiene la sezione "Documentazione"
- [ ] Tutti gli 8 link della sezione sono corretti (puntano a file esistenti)

---

## Verifica finale

### Struttura file

- [ ] I 9 file di §2.2 del design sono **assenti dalla root** e **presenti in** `docs/`
- [ ] `docs/accessibility/ACCESSIBILITY.md` esiste
- [ ] `docs/accessibility/GUIDA_SCREEN_READER.md` esiste
- [ ] `docs/accessibility/SCREEN_READER_AUDIT.md` esiste
- [ ] `docs/accessibility/history/ACCESSIBILITY_IMPROVEMENTS.md` esiste
- [ ] `docs/accessibility/android/ANDROID_ACCESSIBILITY.md` esiste
- [ ] `docs/accessibility/android/ANDROID_IMPLEMENTATION_SUMMARY.md` esiste
- [ ] `docs/feedback/HAPTIC_FEEDBACK.md` esiste
- [ ] `docs/feedback/SOUND_COVERAGE_REPORT.md` esiste
- [ ] `docs/PRD.md` esiste

### Struttura cartelle nuove

- [ ] `docs/accessibility/` esiste
- [ ] `docs/accessibility/android/` esiste
- [ ] `docs/accessibility/history/` esiste
- [ ] `docs/feedback/` esiste

### File consolidato TalkBack

- [ ] `docs/accessibility/talkback.md` esiste
- [ ] Il file contiene la sezione 1 (Conformità TalkBack)
- [ ] Il file contiene la sezione 2 (Rilevamento Automatico)
- [ ] Il file contiene la sezione 3 (Verifiche di Accessibilità)
- [ ] Il file contiene la sezione 4 (Miglioramenti e Changelog TalkBack)
- [ ] I 4 file TalkBack originali sono **assenti dalla root**

### File eliminati

- [ ] `FUNZIONALITA_COMPLETE.md` assente dalla root
- [ ] `CORREZIONI_APPLICATE.md` assente dalla root
- [ ] `FINAL_FIXES.md` assente dalla root
- [ ] `DIAGNOSIS_REPORT.md` assente dalla root
- [ ] `build-out.txt` assente dalla root
- [ ] `build-err.txt` assente dalla root
- [ ] `build_log.txt` assente dalla root
- [ ] `build_output.txt` assente dalla root
- [ ] `tsc_output.txt` assente dalla root
- [ ] `build.log` assente dalla root

### File aggiornati

- [ ] `.gitignore` contiene il pattern `build*.txt`
- [ ] `.gitignore` contiene il pattern `build*.log`
- [ ] `.gitignore` contiene il pattern `tsc_output.txt`
- [ ] `README.md` contiene la sezione "Documentazione" con link alla struttura di `docs/`

### Git e sicurezza

- [ ] `git status` non mostra **nessun file** sotto `src/` come modificato
- [ ] I file eliminati compaiono come "deleted" in `git status` (non come untracked)
- [ ] La struttura di `docs/` corrisponde allo schema §8 del design `P14-root-cleanup-design.md`

---

**Implementazione completata il ___________.**
