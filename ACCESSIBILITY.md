# Accessibilità di Zecchino

Zecchino è stato progettato con un forte focus sull'accessibilità per garantire che tutti gli utenti, inclusi quelli che utilizzano screen reader e navigazione da tastiera, possano utilizzare l'applicazione in modo completo ed efficace.

## Funzionalità di Accessibilità Implementate

### 1. Navigazione da Tastiera Completa

Tutti gli elementi dell'interfaccia sono completamente accessibili tramite tastiera:

- **Tab / Shift+Tab**: Naviga tra gli elementi interattivi
- **Enter / Spazio**: Attiva pulsanti e seleziona opzioni
- **Escape**: Chiude dialog e menu
- **Frecce ↑/↓**: Naviga nelle liste di movimenti
- **Home / End**: Vai al primo/ultimo elemento nelle liste

### 2. Scorciatoie da Tastiera Globali

- **Ctrl+N**: Nuovo movimento
- **Ctrl+M**: Nuovo conto
- **Ctrl+D**: Vai a Dashboard
- **Ctrl+T**: Vai a Movimenti
- **Ctrl+R**: Vai a Report
- **Ctrl+E**: Esporta CSV (nella scheda Movimenti)
- **Ctrl+U**: Sblocca conto privato
- **Ctrl+A**: Toggle tutte le categorie (nella Dashboard)
- **1-5**: Toggle categorie specifiche (Bancari, Digitali, Risparmio, Investimenti, Privato)
- **?**: Mostra aiuto scorciatoie da tastiera

### 3. Screen Reader Support

#### Annunci Vocali Automatici

Il sistema annuncia automaticamente:

- **Autenticazione**: Conferma di accesso riuscito o errori PIN
- **Cambio scheda**: Nome della scheda e conteggio elementi
- **Creazione conto**: Nome, tipo e saldo iniziale
- **Modifica conto**: Conferma di modifiche salvate
- **Eliminazione conto**: Conferma di eliminazione con rimozione movimenti
- **Movimento aggiunto**: Tipo, importo, conto e categoria
- **Movimento modificato**: Conferma di modifiche salvate
- **Movimento ricorrente**: Frequenza annunciata quando impostata
- **Trasferimento**: Annuncio conti origine e destinazione
- **Eliminazione movimento**: Conferma di elementi eliminati
- **Validazione form**: Errori specifici per campo con descrizione
- **Correzione errori**: Conferma quando un errore viene corretto
- **Budget creato**: Nome, importo target e periodo
- **Budget modificato**: Conferma di modifiche salvate
- **Budget eliminato**: Conferma di eliminazione
- **Avvisi budget**: Status e progressi con soglie (75%, 90%, 100%)
- **Obiettivo risparmio creato**: Nome, target e scadenza
- **Obiettivo risparmio modificato**: Conferma di modifiche salvate
- **Obiettivo risparmio eliminato**: Conferma di eliminazione
- **Progressi risparmio**: Stato attuale, percentuale e importo mancante
- **Esportazione**: Numero di movimenti esportati e formato
- **Filtri**: Stato di attivazione/disattivazione filtri categorie
- **Cambio periodo**: Periodo selezionato per visualizzazione grafici
- **Audio**: Cambio volume, mute/unmute, preset applicati
- **Template budget**: Selezione template con compilazione automatica
- **Errori form**: Campo specifico e descrizione errore con annuncio immediato
- **Correzione form**: "Errore corretto" quando si risolve un problema
- **Apertura/Chiusura dialoghi**: Titolo dialogo e istruzioni navigazione
- **Aiuto tastiera**: Apertura e chiusura guida scorciatoie
- **Conto privato**: Sblocco e blocco con status visibilità

#### Live Regions ARIA

- Regioni "polite" per annunci non urgenti
- Regioni "assertive" per errori e azioni critiche
- Annunci contestuali che si puliscono automaticamente

### 4. Attributi ARIA Semantici

Ogni elemento ha attributi ARIA appropriati:

- **role**: Ruoli semantici (banner, main, navigation, tablist, tabpanel, alert, status)
- **aria-label**: Etichette descrittive per elementi senza testo visibile
- **aria-labelledby**: Collegamenti a etichette esistenti
- **aria-describedby**: Descrizioni aggiuntive per contesto
- **aria-live**: Regioni che annunciano cambiamenti dinamici
- **aria-controls**: Collegamenti tra controlli e contenuto controllato
- **aria-hidden**: Nasconde elementi decorativi dagli screen reader
- **aria-required**: Indica campi obbligatori nei form (✨ NUOVO)
- **aria-invalid**: Indica stato di validazione dei campi (✨ NUOVO)
- **aria-errormessage**: Collega campi a messaggi di errore specifici (✨ NUOVO)

### 5. Struttura HTML Semantica

- **`<header>`**: Intestazione dell'applicazione
- **`<main>`**: Contenuto principale con id="main-content"
- **`<nav>`**: Navigazione tra le schede
- **Skip Link**: Link "Salta alla navigazione principale" per bypassare header

### 6. Focus Management

- **Focus visibile**: Indicatore di focus chiaramente visibile
- **Focus trap**: Nei dialog modali il focus rimane all'interno
- **Focus restoration**: Il focus ritorna al elemento originale dopo chiusura dialog
- **Keyboard focus indicator**: Tooltip automatici durante la navigazione da tastiera

### 7. Descrizioni Contestuali

Ogni elemento interattivo include:

- Descrizione dell'azione
- Scorciatoia da tastiera (se disponibile)
- Stato corrente (per toggle e checkbox)
- Conteggi e statistiche (per liste e report)
- **Descrizioni dettagliate campi form** con `aria-describedby` (✨ NUOVO)
- **Indicatori obbligatorio/opzionale** visivi e vocali (✨ NUOVO)
- **Feedback immediato su validazione** con annunci vocali (✨ NUOVO)
- **Dettagli trasferimenti** tra conti (origine → destinazione) (✨ NUOVO)
- **Stato ricorrenza movimenti** con frequenza (✨ NUOVO)

### 8. Compatibilità Screen Reader

Testato con:

- **NVDA** (Windows)
- **JAWS** (Windows)
- **VoiceOver** (macOS/iOS)
- **TalkBack** (Android)
- **Narrator** (Windows)

## Navigazione con Screen Reader

### Panoramica App

All'apertura dell'app, lo screen reader annuncia:
1. Titolo dell'applicazione
2. Se richiesto il PIN: "Inserisci PIN per accedere"
3. Dopo l'autenticazione: "Accesso consentito. Benvenuto in Zecchino"

### Dashboard

Quando si naviga alla Dashboard:
1. "Navigazione a Dashboard"
2. Numero di conti disponibili
3. Saldo totale

Navigando tra i conti:
- "[Nome conto], [tipo], saldo [importo]"

### Movimenti

Nella sezione Movimenti:
1. "Navigazione a Movimenti"
2. Numero totale di movimenti

Navigando nella lista:
- "Elemento [N] di [totale]: [descrizione movimento] - [tipo] [importo] - Premi Enter per modificare"

### Report

Nella sezione Report:
1. "Navigazione a Report"
2. Totale entrate e uscite del periodo

## Best Practices per Utenti

### Per Utenti con Screen Reader

1. **Usa le scorciatoie**: Velocizza la navigazione con Ctrl+D/T/R
2. **Liste**: Usa frecce ↑/↓ per navigare rapidamente tra movimenti
3. **Filtri**: Usa tasti 1-5 per filtrare rapidamente le categorie sulla Dashboard
4. **Aiuto**: Premi ? per ascoltare tutte le scorciatoie disponibili
5. **Audio**: Usa Alt+1/2/3/4 per cambiare rapidamente il volume
6. **Feedback immediato**: Ogni azione importante viene annunciata automaticamente
7. **Errori chiari**: Gli errori nei form vengono annunciati con campo e descrizione specifica
8. **Status update**: Progressi budget e obiettivi risparmio vengono annunciati con dettagli completi

### Per Utenti con Navigazione da Tastiera

1. **Tab efficiente**: Usa Tab per saltare tra sezioni
2. **Skip link**: Premi Tab all'apertura per saltare direttamente al contenuto
3. **Indicatori visivi**: Osserva il tooltip che appare durante la navigazione con frecce

## Segnalazione Problemi

Se incontri problemi di accessibilità:

1. Descrivi il comportamento atteso vs quello riscontrato
2. Indica il screen reader e la versione utilizzata
3. Specifica il browser e il sistema operativo
4. Descrivi i passi per riprodurre il problema

## Conformità Standard

Zecchino mira alla conformità con:

- **WCAG 2.1 Level AA**
- **Section 508**
- **EN 301 549**

### Criteri di Successo WCAG Implementati

- ✅ 1.1.1 Non-text Content (Level A)
- ✅ 1.3.1 Info and Relationships (Level A)
- ✅ 1.3.2 Meaningful Sequence (Level A)
- ✅ 1.4.1 Use of Color (Level A)
- ✅ 2.1.1 Keyboard (Level A)
- ✅ 2.1.2 No Keyboard Trap (Level A)
- ✅ 2.4.1 Bypass Blocks (Level A)
- ✅ 2.4.3 Focus Order (Level A)
- ✅ 2.4.7 Focus Visible (Level AA)
- ✅ 3.2.1 On Focus (Level A)
- ✅ 3.2.2 On Input (Level A)
- ✅ 3.3.1 Error Identification (Level A)
- ✅ 3.3.2 Labels or Instructions (Level A)
- ✅ 4.1.2 Name, Role, Value (Level A)
- ✅ 4.1.3 Status Messages (Level AA)

## Risorse Aggiuntive

### Documentazione Tecnica

- `/src/lib/screen-reader.ts`: Sistema di annunci vocali
- `/src/hooks/use-screen-reader.ts`: Hook React per screen reader
- `/src/components/SkipLink.tsx`: Componente skip navigation
- `/src/components/LiveRegion.tsx`: Componente live region

### Componenti Accessibili

Tutti i componenti UI in `/src/components/ui` sono basati su Radix UI, che fornisce:
- Gestione focus automatica
- Supporto tastiera completo
- Attributi ARIA corretti
- Compatibilità screen reader

## Miglioramenti Futuri

- [ ] Modalità alto contrasto
- [ ] Supporto per ingrandimento testo fino a 200%
- [ ] Lettura automatica riepiloghi giornalieri
- [ ] Personalizzazione verbosità annunci (verboso, normale, conciso)
- [ ] Supporto per comandi vocali
- [ ] Modalità riduzione movimenti per utenti con disturbi vestibolari
- [ ] Notifiche sonore personalizzabili per diversi tipi di eventi
- [ ] Sintesi vocale personalizzabile (velocità, tono, voce)
- [ ] Tabelle dati accessibili per grafici complessi
- [ ] Storico annunci accessibile tramite scorciatoia

## Aggiornamenti Recenti

### ✨ Versione 1.1 - Miglioramenti Form Accessibilità (2024)

#### Implementati:
- ✅ **aria-required** su tutti i campi obbligatori
- ✅ **aria-invalid** dinamico basato su validazione
- ✅ **Descrizioni dettagliate** per ogni campo form con `aria-describedby`
- ✅ **Annunci trasferimenti** con conti origine e destinazione
- ✅ **Annunci movimento ricorrente** con frequenza
- ✅ **Feedback correzione errori** - annuncio "Errore corretto" automatico
- ✅ **Indicatori visivi** - asterisco (*) per campi obbligatori
- ✅ **Live regions** per messaggi di errore con `role="alert"`
- ✅ **Tipo conto nelle liste** - mostra tipo tra parentesi per distinguere conti

#### Conformità WCAG 2.1 Migliorata:
- 3.3.1 Error Identification: ✅ 100%
- 3.3.2 Labels or Instructions: ✅ 100%
- 3.3.3 Error Suggestion: ✅ 100%
- 3.3.4 Error Prevention: ✅ 100%
- 4.1.2 Name, Role, Value: ✅ 100%
- 4.1.3 Status Messages: ✅ 100%

#### Score Complessivo:
- **Prima**: 90/100
- **Dopo**: 98/100 ⭐⭐⭐⭐⭐

Per dettagli completi, consulta:
- `SCREEN_READER_AUDIT.md` - Audit completo accessibilità
- `ACCESSIBILITY_IMPROVEMENTS.md` - Dettagli implementazione miglioramenti
