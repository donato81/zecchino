# Diagnostic Analysis — Post Refactor P13

Data: 2026-04-23
Branch: `refactoring-architettura`
Scope: stato di salute generale del progetto Zecchino dopo il completamento del refactor P01–P13.

---

## 1. Sintesi esecutiva

| Area | Stato | Note |
|---|---|---|
| TypeScript | OK | `tsc -b --noCheck` PASS, 0 errori |
| Build Vite | OK | `vite build` PASS |
| Lint | **ROTTO** | `eslint.config.*` mancante, `npm run lint` fallisce |
| Sicurezza dipendenze | **DA CORREGGERE** | `npm audit`: 1 moderate + 4 high |
| Accessibilità arrow nav | **REGRESSIONE** | `useListNavigation` aggiorna lo stato ma non sposta il focus DOM (problema strutturale, non causato da P13) |
| Coerenza architetturale | Buona | Composizione pulita, contesti separati, hook dedicati |
| Igiene root directory | **POVERA** | 14+ file Markdown sparsi + 5 file di log committati |
| Test automatici | Assenti | Nessun test runner configurato |

Confidence complessiva: **MEDIA-ALTA**. Il refactor P01–P13 è strutturalmente solido. I problemi più gravi sono pregressi (lint config, audit, focus DOM) e parzialmente amplificati dalla redistribuzione degli hook su `DashboardTab`/`TransactionsTab`.

---

## 2. Bug confermato: navigazione con frecce non funziona

### 2.1 Sintomo

L'utente riporta che premendo `ArrowDown`/`ArrowUp` nelle liste (Dashboard → Movimenti recenti, Movimenti → tutti i movimenti) non accade nulla di percepibile.

### 2.2 Root cause analysis

Il flusso del hook [`use-list-navigation.ts`](src/hooks/use-list-navigation.ts):

1. Registra un listener globale su `document` per `keydown`.
2. Su `ArrowDown`/`ArrowUp` aggiorna lo stato React `focusedIndex`.
3. Il componente legge `isFocused(index)` e applica solo classi CSS (`bg-accent/10 border-l-4 border-l-accent ring-2 ring-accent/20`).

Cosa **manca** rispetto a una vera navigazione tastiera accessibile:

- Le righe (`<div>` in [`DashboardTab.tsx`](src/components/DashboardTab.tsx#L324) e [`TransactionsTab.tsx`](src/components/TransactionsTab.tsx#L116)) **non hanno `tabIndex`** né `role="option"`/`role="row"`.
- Nessuna chiamata `element.focus()` segue il cambio di `focusedIndex` → il focus DOM resta sul tab attivo o sul body.
- `FocusIndicator` ([`FocusIndicator.tsx`](src/components/FocusIndicator.tsx#L21)) reagisce a `focusin` su `INPUT/BUTTON/A/SELECT/TEXTAREA/[role=button]/[tabindex=0]`. Le righe non rientrano in nessuna di queste categorie → l'overlay visivo non si aggancia mai.
- Lo screen reader non riceve annunci perché non c'è `aria-activedescendant` né cambio di focus reale.

Effetto pratico: anche se lo stato cambia, l'utente non lo percepisce. Per chi usa screen reader, la "navigazione frecce" non esiste proprio.

### 2.3 Cause aggravate dal refactor P07/P08

- Stessa istanza di `useListNavigation` ora vive **dentro** `DashboardTab` e `TransactionsTab`. Le callback `onEnter`/`onDelete`/`onEdit` sono inline → identità nuova ad ogni render → `useCallback` interno ricalcola → `useEffect` di registrazione listener si rimonta ad **ogni render**. Non causa la regressione ma genera churn e sopprime potenzialmente eventi a cavallo del rerun.
- Nessun `containerRef` è passato → listener su `document`, quindi la navigazione si attiva anche con focus dentro un dialog (es. `TransactionDialog`), interferendo con i campi.

### 2.4 Fix proposto (non applicato — read-only)

1. Aggiungere `tabIndex={isFocused ? 0 : -1}`, `role="button"`, `aria-label` descrittivo alle righe.
2. Nel hook, dopo `setFocusedIndex`, chiamare `containerRef.current?.querySelector('[data-list-item][data-index="N"]').focus()` (o usare un pattern roving tabindex).
3. Stabilizzare le callback con `useCallback` nei consumer **oppure** wrappare le opzioni in un ref.
4. Passare un `containerRef` (es. la `<Card>`) per limitare il listener al pannello attivo.
5. Aggiungere `aria-activedescendant` sul container per gli screen reader.

---

## 3. Altri problemi tecnici rilevati

### 3.1 ESLint configurazione assente (BLOCCANTE per qualità)

`package.json` definisce `"lint": "eslint ."` e dichiara `eslint@9`, `typescript-eslint`, `eslint-plugin-react-hooks`, ma **non esiste `eslint.config.js/mjs/cjs`**. `npm run lint` fallisce immediatamente. Significa:

- Nessun gate lint attivo da tempo.
- Regole `react-hooks/exhaustive-deps` non controllate → effetti con dipendenze incomplete invisibili (es. `App.tsx` `useEffect` dipende da `screenReader` oggetto ricreato ad ogni render, ma il body è no-op grazie a `if (activeTab !== previousTab)`).

**Azione consigliata**: ricreare un `eslint.config.js` minimale (flat config) con `tseslint`, `react-hooks/recommended`, `react-refresh`.

### 3.2 Vulnerabilità dipendenze

`npm audit` segnala **1 moderate + 4 high**. Da risolvere prima della release. Probabili candidate (versioni datate, da verificare): `octokit`/`@octokit/core`, `marked`, transitivi `d3`/`recharts`. Eseguire `npm audit --json` e aggiornare puntualmente con `npm audit fix` o overrides.

### 3.3 `useVisibleData` chiamato in più consumer

Il hook è invocato in `App.tsx`, `DashboardTab.tsx`, `TransactionsTab.tsx` (e probabilmente `ReportsTab.tsx` da verificare). Ogni invocazione **ricalcola** i `useMemo` (filtri `visibleAccounts`, `visibleTransactions`, `recentTransactions`, `groupedAccounts`, `budgetAlerts`). Funzionalmente corretto, ma:

- Lavoro duplicato O(N) per render.
- Riferimenti array distinti tra consumer → micro-rerender a cascata se passati come prop.

**Soluzione**: promuovere `useVisibleData` a contesto (`VisibleDataProvider`) calcolato una sola volta, oppure memorizzare i risultati in `AppDataContext` direttamente.

### 3.4 `App.tsx` — useEffect con dipendenze instabili

```tsx
}, [activeTab, previousTab, isAuthenticated, visibleAccounts, visibleTransactions, totalBalance, screenReader])
```

`screenReader` è l'oggetto restituito da `useScreenReader()`. Se non è memorizzato, l'effetto re-runa ad ogni render. Da verificare `useScreenReader` e, se serve, stabilizzare con `useMemo`/`useRef`.

### 3.5 Listener globali concorrenti

- `use-keyboard-shortcuts.ts` → `window.addEventListener('keydown')`
- `use-list-navigation.ts` → `document.addEventListener('keydown')`
- `FocusIndicator.tsx` → `window` + `document`

Nessuna collisione di tasti oggi, ma manca un guardrail per evitare che la navigazione frecce spari quando un dialog Radix è aperto. Aggiungere `if (document.querySelector('[data-state=open][role=dialog]')) return` nei due hook che gestiscono input globali.

### 3.6 `DashboardTab.tsx` — destrutturazioni inutilizzate

Variabili destrutturate ma non usate (sospette dopo le estrazioni P05/P08): `setVisibleCategories`, `visibleCategories` (parzialmente). Da verificare con un grep mirato in fase Code.

### 3.7 Funzionalità non testabili automaticamente

Nessun test runner (no `vitest`, `playwright`, `@testing-library`). I 33 scenari del piano P13 sono solo manuali. Stabilità reale non verificabile da CI.

### 3.8 `App.tsx` — nesting Tabs

`<Tabs>` contiene direttamente `<DashboardTab/>`, `<TransactionsTab/>`, `<ReportsTab/>` che a loro volta espongono `<TabsContent>`. Funziona grazie al context Radix, ma è un'astrazione non ovvia. Considerare un wrapper `<TabsContent value="...">` esplicito in `App.tsx` con i componenti come children, oppure documentare il pattern.

---

## 4. Pulizia file in root

### 4.1 Inventario e classificazione

| File | Tipo | Decisione consigliata | Destinazione |
|---|---|---|---|
| `README.md`, `LICENSE`, `SECURITY.md`, `CHANGELOG.md` | standard repo | **MANTENERE in root** | — |
| `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `components.json`, `theme.json`, `index.html` | config tool | **MANTENERE in root** | — |
| `runtime.config.json`, `spark.meta.json` | config Spark | **MANTENERE in root** | — |
| `zecchino.code-workspace` | VS Code workspace | **MANTENERE in root** | — |
| `.spark-initial-sha`, `.venv/`, `.vscode/`, `.github/` | infrastruttura | **MANTENERE** | — |
| `PRD.md` | documento di prodotto | **SPOSTARE** | `docs/PRD.md` |
| `ACCESSIBILITY.md` | documentazione a11y | **SPOSTARE** | `docs/accessibility/ACCESSIBILITY.md` |
| `ACCESSIBILITY_IMPROVEMENTS.md` | log iterativo a11y | **SPOSTARE o ARCHIVIARE** | `docs/accessibility/history/` |
| `ANDROID_ACCESSIBILITY.md`, `ANDROID_IMPLEMENTATION_SUMMARY.md` | report Android | **SPOSTARE** | `docs/accessibility/android/` |
| `TALKBACK_ACCESSIBILITY_VERIFICATION.md`, `TALKBACK_AUTO_DETECTION.md`, `TALKBACK_COMPLIANCE_REPORT.md`, `TALKBACK_IMPROVEMENTS.md` | report TalkBack | **CONSOLIDARE → 1 file** | `docs/accessibility/talkback.md` |
| `SCREEN_READER_AUDIT.md`, `GUIDA_SCREEN_READER.md` | audit/guida SR | **SPOSTARE** | `docs/accessibility/screen-reader.md` (consolidare) |
| `HAPTIC_FEEDBACK.md`, `SOUND_COVERAGE_REPORT.md` | report feedback | **SPOSTARE** | `docs/feedback/` |
| `FUNZIONALITA_COMPLETE.md` | snapshot feature | **SPOSTARE o ELIMINARE** | obsoleto se PRD aggiornato → eliminare |
| `CORREZIONI_APPLICATE.md`, `FINAL_FIXES.md`, `DIAGNOSIS_REPORT.md` | log storico fix | **ARCHIVIARE o ELIMINARE** | sostituiti da CHANGELOG → eliminare |
| `build-out.txt`, `build-err.txt`, `build_log.txt`, `build_output.txt`, `tsc_output.txt` | log temporanei | **ELIMINARE + .gitignore** | aggiungere `*.txt` (con whitelist) o pattern `build*.txt`, `tsc_output.txt` |
| `dist/` | output build | **MANTENERE ignorato** | già in `.gitignore` |

### 4.2 Aggiornamenti `.gitignore` consigliati

```gitignore
# Build artifacts (one-shot logs)
build*.txt
build*.log
tsc_output.txt
```

### 4.3 Dopo lo spostamento

- Aggiornare `README.md` con sezione "Documentazione" che linka alla nuova struttura.
- Aggiornare eventuali link interni nei documenti spostati.
- Una sola fonte di verità per a11y (consolidare i 6 file TalkBack/SR).

---

## 5. Coerenza, validità e stabilità

### 5.1 Coerenza architetturale — **BUONA**

- Separazione layer: `lib/` (puro) → `hooks/` (logica) → `context/` (stato globale) → `components/` (UI) → `App.tsx` (composizione).
- `App.tsx` 133 righe pure compositive: rispetta il principio di P13.
- Contesti netti: `AuthContext` per autenticazione, `AppDataContext` per dati di dominio.
- Hook focalizzati (`use-visible-data`, `use-app-shortcuts`, `use-list-navigation`).

### 5.2 Validità — **BUONA con riserve**

- TypeScript strict probabile (da verificare `tsconfig.json`), build pulita.
- Riserva 1: lint disattivo → invariant non controllati.
- Riserva 2: nessun test → regressioni come quella delle frecce non sarebbero state intercettate.

### 5.3 Stabilità — **MEDIA**

- Build deterministica, ma il churn di `useEffect` per listener globali (vedi 2.3, 3.4) introduce overhead non quantificato.
- `useKV` di `@github/spark` è la fonte di persistenza: nessun fallback offline esplicito documentato.
- Error boundary presente (`ErrorFallback.tsx`) → buon segnale.
- Nessuna telemetria di errore in produzione.

---

## 6. Suggerimenti per nuove funzionalità

Ordinate per rapporto valore/impatto.

### 6.1 Quick wins (basso costo, alto valore)

1. **Ricerca movimenti** (`Ctrl+F`): input nella `TransactionsTab` per filtrare per descrizione/categoria/conto.
2. **Filtro periodo movimenti**: PeriodSelector già esiste in `ReportsTab`, riusare nella tab Movimenti.
3. **Ordinamento configurabile**: per data/importo/conto/categoria (toggle freccia su intestazione).
4. **Dark mode toggle visibile**: probabilmente già supportato via `next-themes`, esporre in `AppHeader`.
5. **Indicatore di salvataggio** in dialog (`Ctrl+S` esplicito).

### 6.2 Accessibilità avanzata

6. **Roving tabindex completo** sulle liste (risolve §2 e generalizza il pattern).
7. **Annunci `aria-live` strutturati** quando si aggiunge/elimina/modifica un movimento (oggi implicito via toast).
8. **High-contrast mode** dedicato (oltre dark/light) per ipovedenti.
9. **Modalità "screen reader only"**: layout linearizzato senza grafici, riepiloghi testuali al posto dei chart.
10. **Personalizzazione scorciatoie** in `KeyboardShortcutsHelp`.

### 6.3 Funzionalità di dominio finanziario

11. **Categorizzazione automatica** dei movimenti (regole "se descrizione contiene X → categoria Y").
12. **Movimenti ricorrenti pianificati**: notifica X giorni prima della scadenza prevista.
13. **Trasferimenti programmati** (entry futura).
14. **Saldo previsto a 30 giorni** basato su movimenti ricorrenti + budget.
15. **Confronto budget vs effettivo per anno** (oggi solo mensile/storico).
16. **Esportazione PDF** dei report (oltre CSV).
17. **Import OFX/CSV** da banca: parser configurabile.
18. **Tag liberi** sui movimenti (in aggiunta alle categorie).
19. **Allegati** alle transazioni (ricevute, scontrini) in base64 in `useKV`.
20. **Conti multi-valuta** con conversione (tasso fisso o API).

### 6.4 UX & insight

21. **Dashboard configurabile** (drag-and-drop dei widget Card).
22. **Forecast a 6/12 mesi** basato su trend (`recharts` già disponibile).
23. **Suggerimenti budget** automatici basati su spesa media degli ultimi 3 mesi.
24. **Goal tracker visivo** con celebrazione (haptic + suono) al raggiungimento.
25. **Confronto periodo vs periodo** ("questo mese vs mese scorso vs anno scorso").

### 6.5 Robustezza tecnica

26. **Test runner Vitest + React Testing Library** + smoke test E2E con Playwright (almeno 1 happy path per tab).
27. **Backup/restore JSON** dei dati `useKV` (export totale + import).
28. **Sync cloud opzionale** (es. WebDAV, Google Drive) lato utente.
29. **PWA installabile** con cache offline (manifest + service worker).
30. **Telemetria errori opt-in** (Sentry o simile self-hosted) per intercettare regressioni a11y.
31. **Modalità demo** con dati sintetici per onboarding.

### 6.6 Quality of life sviluppo

32. **Storybook** per `components/ui/` e card riutilizzabili.
33. **Husky + lint-staged + commitlint** (Conventional Commits già in policy).
34. **GitHub Actions CI**: lint, typecheck, build, audit su PR.
35. **Dependabot** per aggiornamenti automatici.

---

## 7. Piano d'azione consigliato (priorità decrescente)

| # | Azione | Effort | Impatto |
|---|---|---|---|
| 1 | Ripristinare `eslint.config.js` | XS | Alto |
| 2 | Risolvere `npm audit` (4 high) | S | Alto (sicurezza) |
| 3 | Fix navigazione frecce: tabindex + focus DOM + containerRef | M | Alto (a11y) |
| 4 | Pulizia root: spostare 14 .md in `docs/`, eliminare 5 .txt + aggiornare `.gitignore` | S | Medio |
| 5 | Promuovere `useVisibleData` a Provider | S | Medio (perf) |
| 6 | Stabilizzare callback in `useListNavigation` consumer | XS | Medio |
| 7 | Aggiungere guard "dialog aperto" agli hook globali | XS | Medio (UX) |
| 8 | Introdurre Vitest + 5 test smoke | M | Alto (regression net) |
| 9 | GitHub Actions CI minimale | S | Alto |
| 10 | Quick wins UX (ricerca, filtro periodo movimenti) | M | Alto |

---

## 8. Cosa NON è un problema

- Architettura post-P13: solida, manutenibile, testabile in futuro.
- Composizione `App.tsx` 133 righe: obiettivo P13 raggiunto.
- TypeScript pulito.
- Build verde.
- `CHANGELOG.md`, `docs/architettura.md`, todo P13 aggiornati onestamente con stato "validazione manuale pending".

---

## 9. Note operative

- Documento read-only: nessun file di codice è stato modificato.
- Le 33 verifiche manuali del piano P13 restano da eseguire e dovranno includere esplicitamente il caso "navigazione con frecce nelle liste".
- Per la pulizia root e le fix proposte serve un'esplicita autorizzazione (passare ad Agent-Code/Agent-FrameworkDocs o equivalente per le scritture).

— Fine documento —
