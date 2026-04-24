# P14 — Coding Plan: Pulizia root directory

> Documento operativo. Nessun file di codice sorgente viene modificato in questa fase.  
> Fase: Plan → Code  
> Pacchetto: 14 — **Primo passo post-refactoring** — igiene del repository  
> Design di riferimento: `docs/1 - projects/P14-root-cleanup-design.md`  
> Data: 24 aprile 2026

---

## Note preliminari

- Branch di lavoro: `refactoring-architettura`. Prerequisiti completati: P01–P13.
- Questo passo è **esclusivamente documentale**: nessun file sotto `src/` viene toccato. Il comportamento dell'app è completamente invariato.
- **Nessuna verifica TypeScript necessaria**: nessun file `.ts`/`.tsx` viene modificato. I gate automatici di questo passo sono strutturali e visivi (presenza/assenza di file), non tipografici.
- Quattro nuove sottocartelle di `docs/` da creare: `docs/accessibility/`, `docs/accessibility/android/`, `docs/accessibility/history/`, `docs/feedback/`. Queste cartelle non esistono nella struttura corrente del repository (verificato — vedi AI2).
- `.github/` è protetto da `framework-guard.instructions.md`: nessuna operazione di questo passo lo tocca.

### File che restano in root (invariati)

| File | Categoria |
|---|---|
| `README.md` | Standard repo — aggiornato nella Sotto-operazione 6 |
| `LICENSE`, `SECURITY.md`, `CHANGELOG.md` | Standard repo |
| `package.json`, `package-lock.json` | Configurazione |
| `tsconfig.json`, `vite.config.ts`, `tailwind.config.js` | Configurazione tool |
| `components.json`, `theme.json`, `index.html` | Configurazione tool |
| `runtime.config.json`, `spark.meta.json` | Configurazione Spark |
| `zecchino.code-workspace` | Workspace VS Code |
| `.gitignore`, `.spark-initial-sha` | Infrastruttura |

### File in `docs/` non toccati in questo passo

| Percorso | Motivo |
|---|---|
| `docs/1 - projects/` (tutti i file) | Cartella invariata |
| `docs/2 - coding plans/` (tutti i file) | Cartella invariata |
| `docs/3 - todo lists/` (tutti i file) | Cartella invariata |
| `docs/4 - reports/` (tutti i file) | Cartella invariata |
| `docs/api.md`, `docs/architettura.md`, `docs/todo.md` | Invariati |

---

## Ambiguità rilevate

Le seguenti ambiguità sono state **verificate sul repository reale** sul branch `refactoring-architettura` prima della stesura di questo piano.

### AI1 — Stato attuale della root: tutti i file presenti

**Verifica eseguita**: `Get-ChildItem -File | Sort-Object` sulla root del progetto.

**Risultato**: tutti i file elencati nel design §2.2–§2.5 sono **presenti e tracciati in git**:

| Gruppo | File | Presente |
|---|---|---|
| Da spostare (9) | `PRD.md`, `ACCESSIBILITY.md`, `ACCESSIBILITY_IMPROVEMENTS.md`, `ANDROID_ACCESSIBILITY.md`, `ANDROID_IMPLEMENTATION_SUMMARY.md`, `HAPTIC_FEEDBACK.md`, `SOUND_COVERAGE_REPORT.md`, `GUIDA_SCREEN_READER.md`, `SCREEN_READER_AUDIT.md` | ✓ tutti |
| TalkBack da consolidare (4) | `TALKBACK_COMPLIANCE_REPORT.md`, `TALKBACK_AUTO_DETECTION.md`, `TALKBACK_ACCESSIBILITY_VERIFICATION.md`, `TALKBACK_IMPROVEMENTS.md` | ✓ tutti |
| Log storici da eliminare (4) | `FUNZIONALITA_COMPLETE.md`, `CORREZIONI_APPLICATE.md`, `FINAL_FIXES.md`, `DIAGNOSIS_REPORT.md` | ✓ tutti |
| File `.txt` da eliminare (5) | `build-out.txt`, `build-err.txt`, `build_log.txt`, `build_output.txt`, `tsc_output.txt` | ✓ tutti |

**File extra non citato nel design**: `build.log` è presente in root ed è tracciato in git. Il file `.gitignore` contiene già il pattern `*.log` (vedi AI5) che lo escluderebbe dalla futura tracciatura, ma non lo rimuove dall'indice git esistente. Nella Sotto-operazione 5 questo file va eliminato e rimosso dall'indice git insieme ai 5 file `.txt`.

**Nessun file del design risulta già rimosso da commit precedenti** — punto di partenza pulito.

---

### AI2 — Struttura attuale di `docs/`: le 4 nuove cartelle non esistono

**Verifica eseguita**: `Get-ChildItem -Path ".\docs" -Recurse -Directory`.

**Risultato**: le sole sottocartelle esistenti sono le 4 cartelle numerate:

```
docs/1 - projects/
docs/2 - coding plans/
docs/3 - todo lists/
docs/4 - reports/
```

Le cartelle `docs/accessibility/`, `docs/accessibility/android/`, `docs/accessibility/history/` e `docs/feedback/` **non esistono**. Verranno create implicitamente quando il primo file sarà spostato al loro interno (git non traccia cartelle vuote).

---

### AI3 — Link interni nei file da spostare: nessuna correzione necessaria

**Verifica eseguita**: ricerca di link relativi (pattern `](` non-http, non-ancora) in tutti i 9 file da spostare e nei 4 file TalkBack.

**Risultato**:

- `GUIDA_SCREEN_READER.md`: contiene 9 anchor link interni al documento stesso (es. `#primo-accesso`, `#navigazione-base`). Questi link sono intradocumento e rimangono validi indipendentemente dalla posizione del file.
- Tutti gli altri 8 file da spostare: **nessun link relativo a file esterni** trovato.
- I 4 file TalkBack: **nessun link relativo tra file** trovato. Un solo link esterno (`https://www.w3.org/WAI/ARIA/apg/`) in `TALKBACK_IMPROVEMENTS.md` — rimane valido.

**Decisione**: la Sotto-operazione 6 non deve correggere nessun link relativo. Il punto §4.2 del design è soddisfatto automaticamente.

---

### AI4 — Contenuto dei file da eliminare: nessuna informazione univoca da preservare

**Verifica eseguita**: lettura delle prime righe di ciascun file per classificarne il contenuto.

| File | Contenuto | Informazioni univoche |
|---|---|---|
| `FUNZIONALITA_COMPLETE.md` | Elenco feature dell'app (conti, movimenti, budget, obiettivi, accessibilità) | Nessuna — tutto già in `CHANGELOG.md` e `PRD.md` |
| `CORREZIONI_APPLICATE.md` | Log di fix del 2024 (import CSS duplicati, type safety `useTalkBack`) | Nessuna — fix già implementati, non documentabili ulteriormente |
| `FINAL_FIXES.md` | Fix `TooltipProvider` multipli (best practice Radix UI) | Nessuna — fix già implementato e stabile |
| `DIAGNOSIS_REPORT.md` | Diagnosi e correzioni 2024 (Sonner/next-themes, ecc.) | Nessuna — superstato da `docs/4 - reports/Diagnostic-Analysis-Post-P13.md` |

**Decisione**: tutti e 4 i file possono essere eliminati direttamente senza trascrizioni preventive. Nessun contenuto rilevante va salvaguardato.

---

### AI5 — Stato di `.gitignore`: i pattern richiesti sono assenti

**Verifica eseguita**: lettura diretta del file `.gitignore`.

**Contenuto attuale rilevante**:
```gitignore
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
```

**Risultato**:
- `build*.txt` → **assente** → da aggiungere
- `build*.log` → tecnicamente coperto da `*.log` già presente — aggiungere comunque per esplicitezza nel blocco commentato
- `tsc_output.txt` → **assente** → da aggiungere

**Nota**: il file `build.log` in root è coperto dal pattern `*.log` già nel `.gitignore`, ma poiché è già tracciato in git, va rimosso dall'indice con `git rm --cached` nella Sotto-operazione 5.

**Decisione**: aggiungere il blocco commentato nella Sotto-operazione 5 come prescritto dal design §4.3. I 3 pattern non sono già presenti.

---

### AI6 — Struttura dei file TalkBack: ordine e dimensioni per il consolidamento

**Verifica eseguita**: lettura delle prime righe di ciascun file e conteggio righe.

| File | Titolo (H1) | Righe | Sezione nel consolidato |
|---|---|---|---|
| `TALKBACK_COMPLIANCE_REPORT.md` | `Report di Conformità TalkBack - Zecchino` | 518 | §1 — Panoramica e compliance |
| `TALKBACK_AUTO_DETECTION.md` | `Rilevamento Automatico TalkBack - Zecchino` | 250 | §2 — Rilevamento automatico |
| `TALKBACK_ACCESSIBILITY_VERIFICATION.md` | `Verifica Accessibilità TalkBack - Zecchino` | 833 | §3 — Verifiche di accessibilità |
| `TALKBACK_IMPROVEMENTS.md` | `Miglioramenti TalkBack per Zecchino` | 433 | §4 — Miglioramenti e changelog |
| **Totale** | | **2.034** | **4 sezioni** |

**Nessun link relativo tra i 4 file** (confermato in AI3). Il file consolidato `talkback.md` sarà il documento più lungo della cartella `docs/accessibility/`.

**Strategia consolidamento**: accodamento per sezione — copiare il contenuto di ciascun file nella sezione dedicata nell'ordine prescritto, poi rimuovere gli H1 originali (sostituiti dalle intestazioni di sezione del documento consolidato). Non riscrivere né sintetizzare.

---

## Rischi

### R1 — Perdita di contenuto nel consolidamento TalkBack — 🔴 Alto

2.034 righe vengono fuse in un unico documento. Il rischio più concreto è omettere involontariamente una sezione o un paragrafo durante la fusione. Impatto: la perdita è permanente una volta eliminati i 4 file sorgente.

**Mitigazione**: procedere per accodamento sezione per sezione (non riscrivere); verificare che ogni sezione `##` di ciascun file originale sia presente nel consolidato; eliminare i 4 file sorgente **solo dopo** questa verifica.

### R2 — File `.txt` già tracciati non rimossi dall'indice git — 🔴 Alto

Aggiungere pattern a `.gitignore` senza rimuovere i file dall'indice git li lascia nel repository tracciati. Il pattern `.gitignore` impedisce futuri commit, ma non rimuove i file esistenti.

**Mitigazione**: nella Sotto-operazione 5, eliminare prima i file fisicamente (o usare `git rm --cached` se non si vuole rimuoverli dal working tree), poi aggiornare `.gitignore`. L'ordine è critico. Lo stesso vale per `build.log` (non in §2.5 del design ma presente in root e tracciato).

### R3 — Modifica accidentale di file sotto `src/` — 🔴 Alto

Qualsiasi operazione di spostamento o eliminazione che tocchi `src/` invalida la premessa fondamentale del passo.

**Mitigazione**: `git status` prima del commit finale — nessun file sotto `src/` deve apparire come modificato.

### R4 — Cartelle nuove non create correttamente — 🟡 Medio

Se una delle 4 nuove sottocartelle non viene creata prima dello spostamento del file che la deve contenere, lo spostamento fallirà. Git non traccia cartelle vuote — la cartella nasce implicitamente con il primo file.

**Mitigazione**: spostare i file di ciascun gruppo nel rispettivo ordine senza saltare destinazioni. Se si usa `git mv`, il percorso completo della destinazione va specificato incluso il percorso cartella.

### R5 — Link relativi rotti — 🟡 Medio

Benché AI3 abbia confermato l'assenza di link relativi a file esterni nei file spostati, va comunque verificato che i link nella sezione "Documentazione" aggiunta a `README.md` puntino ai percorsi corretti.

**Mitigazione**: verificare ogni link della sezione "Documentazione" di `README.md` dopo averla scritta.

### R6 — Ordine delle sotto-operazioni — 🟢 Basso

Lo spostamento deve avvenire (Sotto-op. 2) prima dell'eliminazione dei TalkBack (Sotto-op. 3). I file di log si eliminano nella Sotto-op. 5. Il README si aggiorna per ultimo (Sotto-op. 6).

**Mitigazione**: seguire le sotto-operazioni nell'ordine numerato senza invertirle.

---

## Passo unico — Pulizia root directory

### Rischio: 🔴 Alto (R1, R2)
### Prerequisito: P01–P13 completati; branch `refactoring-architettura`

---

### Sotto-operazione 1 — Ricognizione pre-operativa

> **Eseguire prima di qualsiasi spostamento o eliminazione.**

Verificare che il branch corrente sia `refactoring-architettura`:
```
git branch --show-current
```
Atteso: `refactoring-architettura`

Verificare che tutti i file da gestire siano presenti in root (confermato in AI1 — eseguire nuovamente se il repository ha avuto commit nel frattempo):
```
git status
```

Confermare che nessuna delle 4 nuove cartelle esista già in `docs/` (confermato in AI2 — eseguire nuovamente se necessario):
```
Get-ChildItem -Path docs -Recurse -Directory
```

**Verifica intermedia 1**: branch corretto; 21 file da gestire presenti in root; 4 nuove cartelle assenti da `docs/`.

---

### Sotto-operazione 2 — Spostamento dei 9 file in `docs/`

> **L'ordine suggerito crea le cartelle progressivamente: prima i file a livello radice di `docs/`, poi i file nelle sottocartelle.**

Per ciascun file: spostare (con `git mv` per preservare la storia git, o tramite filesystem + `git add`/`git rm`) dalla root alla destinazione indicata.

| File sorgente | Destinazione | Crea cartella |
|---|---|---|
| `PRD.md` | `docs/PRD.md` | No |
| `ACCESSIBILITY.md` | `docs/accessibility/ACCESSIBILITY.md` | Sì — `docs/accessibility/` |
| `GUIDA_SCREEN_READER.md` | `docs/accessibility/GUIDA_SCREEN_READER.md` | No |
| `SCREEN_READER_AUDIT.md` | `docs/accessibility/SCREEN_READER_AUDIT.md` | No |
| `ACCESSIBILITY_IMPROVEMENTS.md` | `docs/accessibility/history/ACCESSIBILITY_IMPROVEMENTS.md` | Sì — `docs/accessibility/history/` |
| `ANDROID_ACCESSIBILITY.md` | `docs/accessibility/android/ANDROID_ACCESSIBILITY.md` | Sì — `docs/accessibility/android/` |
| `ANDROID_IMPLEMENTATION_SUMMARY.md` | `docs/accessibility/android/ANDROID_IMPLEMENTATION_SUMMARY.md` | No |
| `HAPTIC_FEEDBACK.md` | `docs/feedback/HAPTIC_FEEDBACK.md` | Sì — `docs/feedback/` |
| `SOUND_COVERAGE_REPORT.md` | `docs/feedback/SOUND_COVERAGE_REPORT.md` | No |

> ⚠️ **AI3 confermato**: nessun link relativo a file esterni nei file spostati. La Sotto-operazione 6 non richiede correzioni di link per questo gruppo.

**Verifica intermedia 2**: i 9 file sono **assenti dalla root** e **presenti nelle destinazioni**. `git status` non mostra modifiche sotto `src/`.

---

### Sotto-operazione 3 — Consolidamento dei 4 file TalkBack

> **⚠️ R1 critico — non eliminare i file sorgente prima di aver verificato il consolidato.**

**3.1 — Creazione del file consolidato**

Creare `docs/accessibility/talkback.md` con la seguente struttura:

```markdown
# TalkBack — Documentazione Completa

> Documento consolidato dai file: TALKBACK_COMPLIANCE_REPORT.md, 
> TALKBACK_AUTO_DETECTION.md, TALKBACK_ACCESSIBILITY_VERIFICATION.md,
> TALKBACK_IMPROVEMENTS.md
> Consolidamento: 24 aprile 2026

---

## 1. Conformità TalkBack

[contenuto integrale di TALKBACK_COMPLIANCE_REPORT.md — togliere H1, conservare tutto il resto]

---

## 2. Rilevamento Automatico

[contenuto integrale di TALKBACK_AUTO_DETECTION.md — togliere H1, conservare tutto il resto]

---

## 3. Verifiche di Accessibilità

[contenuto integrale di TALKBACK_ACCESSIBILITY_VERIFICATION.md — togliere H1, conservare tutto il resto]

---

## 4. Miglioramenti e Changelog TalkBack

[contenuto integrale di TALKBACK_IMPROVEMENTS.md — togliere H1, conservare tutto il resto]
```

**3.2 — Verifica completezza del consolidato**

Prima di procedere all'eliminazione:
- Verificare che la sezione 1 contenga il contenuto di `TALKBACK_COMPLIANCE_REPORT.md` (518 righe originali → il consolidato deve essere ~518 righe per questa sezione)
- Verificare che la sezione 2 contenga il contenuto di `TALKBACK_AUTO_DETECTION.md` (250 righe)
- Verificare che la sezione 3 contenga il contenuto di `TALKBACK_ACCESSIBILITY_VERIFICATION.md` (833 righe — la sezione più lunga)
- Verificare che la sezione 4 contenga il contenuto di `TALKBACK_IMPROVEMENTS.md` (433 righe)
- Totale atteso del consolidato: ~2.050 righe (incluse intestazioni e separatori)

> ⚠️ Una strategia sicura: aprire ciascun file sorgente e `talkback.md` affiancati, scorrere in parallelo per sezione.

**3.3 — Eliminazione dei 4 file sorgente**

Solo dopo la verifica di completezza della 3.2:
- Eliminare dalla root: `TALKBACK_COMPLIANCE_REPORT.md`, `TALKBACK_AUTO_DETECTION.md`, `TALKBACK_ACCESSIBILITY_VERIFICATION.md`, `TALKBACK_IMPROVEMENTS.md`

**Verifica intermedia 3**: `docs/accessibility/talkback.md` esiste; i 4 file TalkBack originali sono **assenti dalla root**. `git status` non mostra modifiche sotto `src/`.

---

### Sotto-operazione 4 — Eliminazione dei 4 file di log storico

> AI4 confermato: nessuno dei 4 file contiene informazioni non già documentate altrove — eliminazione diretta.

Eliminare dalla root:
- `FUNZIONALITA_COMPLETE.md` — elenco feature obsoleto (già in `PRD.md` e `CHANGELOG.md`)
- `CORREZIONI_APPLICATE.md` — log fix 2024, nessuna informazione univoca
- `FINAL_FIXES.md` — fix `TooltipProvider`, nessuna informazione univoca
- `DIAGNOSIS_REPORT.md` — diagnosi 2024, superstato da `docs/4 - reports/Diagnostic-Analysis-Post-P13.md`

**Verifica intermedia 4**: i 4 file sono **assenti dalla root**.

---

### Sotto-operazione 5 — Eliminazione file di log e aggiornamento `.gitignore`

> ⚠️ **R2 critico — l'ordine è vincolante**: eliminare i file prima di aggiornare `.gitignore`. Se si aggiorna `.gitignore` prima di rimuovere i file dall'indice git, i file restano tracciati.

**5.1 — Eliminazione fisica e rimozione dall'indice git**

Eliminare dalla root e dall'indice git i seguenti file (usare `git rm` o eliminare + `git add -u`):
- `build-out.txt`
- `build-err.txt`
- `build_log.txt`
- `build_output.txt`
- `tsc_output.txt`
- `build.log` ← **file extra rispetto al design §2.5**, presente in root e tracciato in git; coperto da `*.log` già in `.gitignore` ma deve essere rimosso dall'indice (AI1)

**5.2 — Aggiornamento `.gitignore`**

Aggiungere in fondo al file `.gitignore` esistente:

```gitignore
# Log temporanei di build e type-checking
build*.txt
build*.log
tsc_output.txt
```

> ⚠️ AI5 confermato: i 3 pattern non sono già presenti nel `.gitignore`. Il pattern `build*.log` è ridondante rispetto a `*.log` già presente, ma viene aggiunto per esplicitezza nel blocco di commento dedicato.

**Verifica intermedia 5**: i 6 file di log sono **assenti dalla root**; `.gitignore` contiene i 3 nuovi pattern. `git status` non mostra i file `.txt`/`.log` come non tracciati.

---

### Sotto-operazione 6 — Aggiornamenti consequenziali

**6.1 — Sezione "Documentazione" in `README.md`**

Aprire `README.md` e aggiungere una sezione **"## Documentazione"** dopo la sezione di presentazione del progetto e prima della sezione di installazione/sviluppo (se presente). La sezione deve includere i link alla struttura di `docs/` come prescritto dal design §4.1:

- `docs/PRD.md` — requisiti di prodotto
- `docs/architettura.md` — architettura tecnica
- `docs/api.md` — API e interfacce
- `docs/accessibility/ACCESSIBILITY.md` — strategia di accessibilità
- `docs/accessibility/talkback.md` — supporto TalkBack (Android)
- `docs/feedback/HAPTIC_FEEDBACK.md` — sistema di feedback aptico
- `docs/feedback/SOUND_COVERAGE_REPORT.md` — copertura audio
- `docs/1 - projects/README.md` — indice dei documenti di design

> ⚠️ AI3 confermato: nessun link nei file spostati richiede correzione — non è necessario aprire i file spostati per aggiornare link.

**Verifica intermedia 6**: `README.md` contiene la sezione "Documentazione" con i link elencati. Tutti i link puntano a percorsi esistenti nel repository.

---

## Tabella riepilogativa

| Sotto-operazione | Tipo | File sorgente | File destinazione |
|---|---|---|---|
| 2 — Spostamento | Spostare | 9 file da root | `docs/PRD.md`, `docs/accessibility/*`, `docs/feedback/*` |
| 3 — Consolidamento | Creare + eliminare | 4 file TalkBack da root | `docs/accessibility/talkback.md` (nuovo) |
| 4 — Eliminazione log storici | Eliminare | 4 file da root | — |
| 5 — Eliminazione log tecnici | Eliminare + aggiornare | 6 file `.txt`/`.log` da root | `.gitignore` aggiornato |
| 6 — Aggiornamenti | Aggiornare | — | `README.md` |

| Metrica | Valore |
|---|---|
| File spostati in `docs/` | 9 |
| File consolidati → 1 | 4 → `talkback.md` |
| File eliminati (log storici) | 4 |
| File eliminati (log tecnici) | 6 (`build-out.txt`, `build-err.txt`, `build_log.txt`, `build_output.txt`, `tsc_output.txt`, `build.log`) |
| File creati | 1 (`docs/accessibility/talkback.md`) |
| Cartelle create in `docs/` | 4 (`accessibility/`, `accessibility/android/`, `accessibility/history/`, `feedback/`) |
| File aggiornati | 2 (`README.md`, `.gitignore`) |
| File sotto `src/` modificati | **0** |

> ⚠️ **Questo passo non tocca `src/`** — il comportamento dell'app è completamente invariato. Nessuna verifica TypeScript è necessaria.

---

## Schema riepilogativo del passo unico

```
P14 — Passo Unico: Pulizia root directory (solo documentazione e struttura repository)
│
├── Pre-condizione: branch refactoring-architettura; tutti i 21 file in root presenti
│
├── Sotto-operazione 1 — Ricognizione pre-operativa
│   ├── Verifica branch: refactoring-architettura
│   ├── Verifica file da gestire: tutti presenti
│   └── Verifica struttura docs/: 4 nuove cartelle assenti
│
├── Sotto-operazione 2 — Spostamento 9 file in docs/
│   ├── PRD.md → docs/PRD.md
│   ├── ACCESSIBILITY.md, GUIDA_SCREEN_READER.md, SCREEN_READER_AUDIT.md → docs/accessibility/
│   ├── ACCESSIBILITY_IMPROVEMENTS.md → docs/accessibility/history/
│   ├── ANDROID_ACCESSIBILITY.md, ANDROID_IMPLEMENTATION_SUMMARY.md → docs/accessibility/android/
│   ├── HAPTIC_FEEDBACK.md, SOUND_COVERAGE_REPORT.md → docs/feedback/
│   └── ✓ 9 file assenti da root, presenti in docs/
│
├── Sotto-operazione 3 — Consolidamento 4 file TalkBack → talkback.md
│   ├── Crea docs/accessibility/talkback.md (4 sezioni, ~2.050 righe)
│   ├── ⚠️ Verifica completezza consolidato prima di eliminare i sorgenti
│   ├── Elimina 4 file TalkBack da root
│   └── ✓ talkback.md esiste; 4 file TalkBack assenti da root
│
├── Sotto-operazione 4 — Eliminazione 4 log storici
│   ├── Elimina FUNZIONALITA_COMPLETE.md, CORREZIONI_APPLICATE.md,
│   │   FINAL_FIXES.md, DIAGNOSIS_REPORT.md
│   └── ✓ 4 file assenti da root
│
├── Sotto-operazione 5 — Eliminazione 6 log tecnici + .gitignore
│   ├── ⚠️ Eliminare prima i file, poi aggiornare .gitignore (R2)
│   ├── Elimina build-out.txt, build-err.txt, build_log.txt, build_output.txt,
│   │   tsc_output.txt, build.log (extra rispetto al design)
│   ├── Aggiunge 3 pattern in .gitignore
│   └── ✓ 6 file assenti da root; .gitignore aggiornato
│
├── Sotto-operazione 6 — Aggiornamenti consequenziali
│   ├── README.md: sezione "Documentazione" con 8 link
│   └── ✓ README.md aggiornato; nessun link in docs/ da correggere (AI3)
│
└── Post-condizione: root pulita; struttura docs/ completa
    ✅ 0 file non pertinenti in root
    ✅ Documenti in docs/ con gerarchia coerente
    ✅ git status: nessuna modifica sotto src/
    ✅ .gitignore aggiornato con pattern per log tecnici

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧹 P14 — Igiene root completata — Documentazione riorganizzata
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Verifica finale

### Struttura repository

- [ ] I 9 file elencati in §2.2 del design sono **assenti dalla root** e **presenti nelle destinazioni** in `docs/`
- [ ] Le 4 nuove sottocartelle esistono: `docs/accessibility/`, `docs/accessibility/android/`, `docs/accessibility/history/`, `docs/feedback/`
- [ ] `docs/accessibility/talkback.md` esiste e contiene le 4 sezioni prescritte
- [ ] I 4 file TalkBack originali sono **assenti dalla root**
- [ ] I 4 file di log storico sono **assenti dalla root**
- [ ] I 6 file di log tecnici (incluso `build.log`) sono **assenti dalla root**
- [ ] `.gitignore` contiene i 3 pattern: `build*.txt`, `build*.log`, `tsc_output.txt`
- [ ] `README.md` contiene la sezione "Documentazione" con i link alla struttura di `docs/`
- [ ] La struttura di `docs/` corrisponde allo schema §8 del design

### Sicurezza

- [ ] `git status` non mostra nessun file sotto `src/` come modificato
- [ ] `git status` non mostra i file eliminati come non tracciati (devono essere staged per rimozione)
