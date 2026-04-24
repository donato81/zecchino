# P19 — Todo List: Introduzione Vitest e 5 smoke test

> Passo 19 — Vitest: infrastruttura di test e 5 smoke test  
> Piano di riferimento: `docs/2 - coding plans/P19-coding-plan.md`  
> Design di riferimento: `docs/1 - projects/P19-vitest-smoke-tests-design.md`  
> Branch: `refactoring-architettura`  
> Data inizio: 2026-04-24  
> Data completamento: 2026-04-24

---

## Esito finale

- [x] Vitest introdotto nel progetto con configurazione dedicata
- [x] Setup globale creato con mock runtime Spark e browser API richieste dall'app
- [x] Helper condiviso `src/test/smoke/test-utils.ts` creato e riutilizzato dai test smoke
- [x] 5 smoke test implementati e verdi
- [x] `npm run test:run` verde
- [x] `npm run build` verde
- [x] `npm run lint` verde con 59 warning, in linea con la baseline reale misurata in questa sessione
- [x] Nessuna modifica sotto `.github/`
- [x] Nessuna modifica sotto `src/` al di fuori di `src/test/`

---

## File effettivamente toccati

### File modificati

- [x] `package.json`
- [x] `package-lock.json`
- [x] `tsconfig.json`

### File creati

- [x] `vitest.config.ts`
- [x] `src/test/setup.ts`
- [x] `src/test/smoke/test-utils.ts`
- [x] `src/test/smoke/01-app-renders.test.tsx`
- [x] `src/test/smoke/02-authentication.test.tsx`
- [x] `src/test/smoke/03-dashboard-tab.test.tsx`
- [x] `src/test/smoke/04-transactions-tab.test.tsx`
- [x] `src/test/smoke/05-private-account.test.tsx`

> Nota: il template iniziale del passo non conteggiava `package-lock.json` e `src/test/smoke/test-utils.ts`; il perimetro reale della fase Coding e quindi di 11 file, non 9.

---

## Sequenza di verifica eseguita

### Gate progressivi C.1 → C.5

- [x] Dopo `01-app-renders.test.tsx` → suite verde sul test 01
- [x] Dopo `02-authentication.test.tsx` → suite verde sui test 01–02
- [x] Dopo `03-dashboard-tab.test.tsx` → suite verde sui test 01–03
- [x] Dopo `04-transactions-tab.test.tsx` → suite verde sui test 01–04
- [x] Dopo `05-private-account.test.tsx` → suite verde sui test 01–05

### Gate finali D

- [x] `npm run test:run` → 5 passed, exit 0, durata totale 14.83s
- [x] Esecuzione in ordine inverso → 5 passed, exit 0
- [x] Isolamento singolo file:
  - [x] `01-app-renders.test.tsx` → 1 passed (~230ms)
  - [x] `02-authentication.test.tsx` → 1 passed (~820ms)
  - [x] `03-dashboard-tab.test.tsx` → 1 passed (~850ms)
  - [x] `04-transactions-tab.test.tsx` → 1 passed (~1030ms)
  - [x] `05-private-account.test.tsx` → 1 passed (~950ms)
- [x] `npm run build` → exit 0
- [x] `npm run lint` → exit 0, 59 warning, 0 errori
- [x] Integrita repository verificata:
  - [x] file applicativi fuori `src/test/` non modificati
  - [x] file `.github/` non modificati

---

## Copertura dei 5 smoke test

- [x] Test 01 — render iniziale: schermata di autenticazione e dialog PIN globale presenti al mount
- [x] Test 02 — autenticazione setup-mode: creazione PIN globale e visualizzazione Dashboard
- [x] Test 03 — Dashboard: heading e stati vuoti principali presenti
- [x] Test 04 — tab Movimenti: navigazione tab e controlli principali presenti nello stato vuoto
- [x] Test 05 — conto privato: nascosto di default e visibile dopo sblocco con PIN dedicato

---

## Note operative

- Il setup test ha richiesto mock aggiuntivi per `window.spark.kv`, `AudioContext`, `webkitAudioContext`, `navigator.vibrate` e `matchMedia` per evitare side effect in import-time.
- I test montano `App` dentro `TooltipProvider` per replicare il bootstrap reale definito in `src/main.tsx`.
- Durante l'esecuzione Vitest restano warning runtime Radix su `DialogContent`; non bloccano la suite e riflettono markup UI esistente, non regressioni introdotte dai test.

---

## Checklist gate finale

| Gate | Atteso | Effettivo | ✅ |
|---|---|---|---|
| `npm run test:run` | 5 passed, exit 0 | 5 passed, exit 0, 14.83s | ☑ |
| Test in ordine inverso | 5 passed | 5 passed, exit 0 | ☑ |
| Ogni test in isolamento | 1 passed per file | 5/5 comandi verdi | ☑ |
| `npm run build` | exit 0 | exit 0 | ☑ |
| `npm run lint` | exit 0, nessuna regressione warning | exit 0, 59 warning, baseline sessione 59 | ☑ |
| Perimetro Coding reale | 3 modificati + 8 nuovi | rispettato | ☑ |
| Nessun file in `src/` fuori `src/test/` modificato | 0 file | 0 file | ☑ |
| Nessun file `.github/` modificato | 0 file | 0 file | ☑ |
| Test 01 — AuthScreen visibile al mount | si | si | ☑ |
| Test 02 — Dashboard visibile dopo auth PIN | si | si | ☑ |
| Test 03 — Sezioni Dashboard presenti | si | si | ☑ |
| Test 04 — Tab Movimenti e pulsante aggiunta | si | si | ☑ |
| Test 05 — Conto privato nascosto/sbloccato | si | si | ☑ |

***
**Completato il 2026-04-24.**
**Vitest attivo — 5 smoke test verdi.**
