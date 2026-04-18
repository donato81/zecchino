# Rilevamento Automatico TalkBack - Zecchino

## Panoramica

Zecchino ora include un sistema avanzato di **rilevamento automatico di TalkBack** che identifica quando lo screen reader è attivo su dispositivi Android e adatta automaticamente l'interfaccia per offrire un'esperienza ottimale agli utenti con disabilità visive.

## Funzionalità Principali

### 🔍 Rilevamento Intelligente

Il sistema rileva automaticamente TalkBack analizzando multipli indicatori:

1. **Preferenze Media Query**: Controlla se l'utente ha attivato "prefers-reduced-motion"
2. **User Agent**: Identifica dispositivi Android dal browser user agent
3. **Eventi Touch**: Verifica la presenza di supporto touch nativo
4. **API Speech Synthesis**: Controlla se le API di sintesi vocale sono disponibili
5. **Pattern Comportamentali**: Analizza la velocità di navigazione e i pattern di focus

### 📊 Livelli di Affidabilità

Il rilevamento fornisce tre livelli di affidabilità:

- **Alta (4+ indicatori)**: TalkBack molto probabilmente attivo
- **Media (3 indicatori)**: TalkBack probabilmente attivo
- **Bassa (2 indicatori)**: TalkBack potenzialmente attivo

### 🎨 Adattamenti Automatici dell'Interfaccia

Quando TalkBack è rilevato, l'applicazione applica automaticamente:

#### 1. **Target Touch Maggiorati** ✓ (Attivo di default)
- Aumenta le dimensioni minime di pulsanti e controlli da 44px a 56px
- Garantisce target touch conformi alle linee guida WCAG 2.1 AA
- Facilita la selezione degli elementi per utenti con disabilità motorie

#### 2. **Navigazione Semplificata** ✓ (Attivo di default)
- Rimuove elementi decorativi non essenziali dall'ordine di tabulazione
- Semplifica la struttura dell'interfaccia riducendo il rumore visivo
- Migliora l'efficienza della navigazione con screen reader

#### 3. **Timeout Estesi** ✓ (Attivo di default)
- Raddoppia i tempi di timeout per notifiche e messaggi
- Fornisce più tempo per leggere e comprendere i contenuti
- Previene la scomparsa prematura di informazioni importanti

#### 4. **Descrizioni Verbali Estese** ✓ (Attivo di default)
- Usa etichette ARIA più dettagliate e contestuali
- Fornisce informazioni complete su ogni elemento
- Include istruzioni d'uso e scorciatoie da tastiera nelle descrizioni

#### 5. **Modalità Alto Contrasto** (Opzionale)
- Aumenta il contrasto tra testo e sfondo
- Usa colori più saturi e distintivi
- Migliora la leggibilità per utenti ipovedenti

#### 6. **Animazioni Ridotte** ✓ (Attivo di default)
- Riduce del 50% la durata di tutte le animazioni
- Minimizza le distrazioni e il disagio visivo
- Rispetta le preferenze "prefers-reduced-motion"

#### 7. **Gestione Automatica del Focus** ✓ (Attivo di default)
- Sposta automaticamente il focus su dialoghi aperti
- Guida l'attenzione su messaggi di errore e conferme
- Mantiene il contesto di navigazione sempre chiaro

#### 8. **Audio Spaziale** ✓ (Attivo di default)
- Usa feedback audio direzionali per indicare posizione elementi
- Fornisce segnali sonori per orientamento spaziale
- Integra audio con lettura screen reader per esperienza completa

## Utilizzo

### Accesso alle Impostazioni

1. Apri l'applicazione Zecchino
2. Naviga alla scheda **Report**
3. Scorri fino a **Impostazioni Accessibilità**
4. Trova la card **Rilevamento Automatico TalkBack**

### Controllo Manuale

Puoi:
- **Attivare/Disattivare manualmente** la modalità TalkBack
- **Personalizzare ogni singola ottimizzazione** secondo le tue preferenze
- **Azzerare il rilevamento** per permettere al sistema di rilevare nuovamente
- **Ripristinare le ottimizzazioni** ai valori predefiniti

### Indicatori Visivi

- **Badge di Affidabilità**: Mostra il livello di confidenza del rilevamento
- **Stato TalkBack**: Indica se la modalità è attiva (manuale o automatica)
- **Avviso Rilevamento**: Notifica quando TalkBack è stato rilevato automaticamente

## API per Sviluppatori

### Hook React: `useTalkBack()`

```typescript
import { useTalkBack } from '@/hooks/use-talkback'

function MyComponent() {
  const {
    talkBackState,           // Stato attuale di TalkBack
    adaptations,             // Configurazione ottimizzazioni
    getTouchTargetSize,      // Ottieni dimensione target ottimale
    getAnimationDuration,    // Ottieni durata animazione adattata
    getTimeout,              // Ottieni timeout esteso
    shouldUseVerboseDescriptions, // Check se usare descrizioni estese
    getAriaDescription       // Ottieni descrizione ARIA appropriata
  } = useTalkBack()

  return (
    <button
      style={{ minHeight: `${getTouchTargetSize()}px` }}
      aria-label={getAriaDescription(
        "Salva",
        "Salva il movimento e aggiorna il saldo del conto"
      )}
    >
      Salva
    </button>
  )
}
```

### Proprietà State

```typescript
interface TalkBackState {
  isEnabled: boolean           // TalkBack attivo
  isDetected: boolean          // TalkBack rilevato automaticamente
  confidenceLevel: 'high' | 'medium' | 'low'
  adaptationsActive: boolean   // Ottimizzazioni applicate
}
```

### Metodi Utility

- `getTouchTargetSize()`: Restituisce 56px se TalkBack attivo, altrimenti 44px
- `getAnimationDuration(baseMs)`: Dimezza la durata se animazioni ridotte attive
- `getTimeout(baseMs)`: Raddoppia il timeout se timeout estesi attivi
- `shouldUseVerboseDescriptions()`: Verifica se usare descrizioni estese
- `shouldSimplifyNavigation()`: Verifica se semplificare navigazione
- `shouldAutoManageFocus()`: Verifica se gestire automaticamente il focus
- `getAriaDescription(brief, verbose)`: Seleziona descrizione appropriata

## Classi CSS Automatiche

Quando TalkBack è attivo, il sistema applica automaticamente queste classi al `<body>`:

```css
/* TalkBack attivo */
body[data-talkback="true"] {
  font-size: 106%; /* Aumenta leggermente dimensione font */
}

/* Target touch maggiorati */
body.talkback-enhanced-targets button,
body.talkback-enhanced-targets [role="button"] {
  min-height: 56px;
  min-width: 56px;
}

/* Alto contrasto */
body.talkback-high-contrast {
  --background: oklch(0.10 0.06 265); /* Sfondo più scuro */
  --foreground: oklch(1 0 0);         /* Testo bianco puro */
  --border: oklch(0.40 0.08 265);     /* Bordi più visibili */
}

/* Animazioni ridotte */
body.talkback-reduced-motion * {
  animation-duration: 0.05s !important;
  transition-duration: 0.05s !important;
}
```

## Persistenza Dati

Tutte le configurazioni vengono salvate automaticamente in `localStorage` tramite `useKV`:

- `talkback-adaptations`: Configurazione delle ottimizzazioni
- `talkback-manual-override`: Override manuale dello stato TalkBack

## Rilevamento Continuo

Il sistema riesegue il rilevamento automatico:
- All'avvio dell'applicazione
- Ogni 30 secondi durante l'uso
- Quando cambiano le preferenze di sistema

## Best Practices

### Per Utenti

1. **Prima volta**: Lascia che il sistema rilevi automaticamente TalkBack
2. **Personalizzazione**: Disattiva solo le ottimizzazioni che trovi fastidiose
3. **Problemi**: Usa "Azzera Rilevamento" se il comportamento è inaspettato
4. **Feedback**: Ogni azione produce feedback sonoro e annunci screen reader

### Per Sviluppatori

1. **Usa sempre i metodi utility** invece di valori hardcoded
2. **Rispetta le preferenze** salvate dall'utente
3. **Testa con TalkBack** reale su dispositivo Android
4. **Fornisci descrizioni ARIA** sia brevi che verbose
5. **Non sovrascrivere** le dimensioni minime dei target touch

## Compatibilità

### Browser Supportati
- ✅ Chrome Android (81+)
- ✅ Firefox Android (68+)
- ✅ Samsung Internet (12+)
- ✅ Edge Android (91+)

### Screen Reader
- ✅ **TalkBack** (Android 5.0+)
- ⚠️ Altri screen reader mobile: rilevamento limitato

### Dispositivi
- ✅ Smartphone Android (API 21+)
- ✅ Tablet Android
- ⚠️ iOS: VoiceOver non supportato (rilevamento specifico Android)

## Limitazioni Note

1. **Falsi Positivi**: Su alcuni dispositivi Android senza TalkBack potrebbero attivarsi gli adattamenti
2. **Override Necessario**: In rari casi potrebbe essere necessario override manuale
3. **Rilevamento Ritardato**: Il primo rilevamento può richiedere alcuni secondi
4. **iOS Non Supportato**: Il sistema è specificamente progettato per TalkBack su Android

## Roadmap Futura

- [ ] Supporto per VoiceOver iOS
- [ ] Machine learning per migliorare accuratezza rilevamento
- [ ] Profili personalizzati salvabili
- [ ] Analytics anonimi sull'utilizzo delle ottimizzazioni
- [ ] Preset rapidi (minimo, medio, massimo)

## Supporto e Feedback

Per problemi o suggerimenti sull'accessibilità TalkBack:
- Usa la sezione Report → Impostazioni → TalkBack
- Ogni modifica è immediatamente salvata e applicata
- Reset disponibili in qualsiasi momento

---

**Nota**: Questa funzionalità fa parte dell'impegno di Zecchino per l'accessibilità universale. L'obiettivo è garantire che ogni utente, indipendentemente dalle abilità, possa gestire le proprie finanze con autonomia e sicurezza.
