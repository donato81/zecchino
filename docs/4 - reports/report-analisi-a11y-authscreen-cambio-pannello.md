# Report — Analisi accessibilità: pagina registrazione non annunciata dallo screen reader

**Data:** 4 maggio 2026  
**Tipo:** Analisi read-only accessibilità  
**Oggetto:** Silenzio screen reader al cambio pannello login → signup in `AuthScreen.tsx`  
**Agente:** Agent-Analyze  

---

## Riepilogo

Quando un utente nonvedente preme "Non hai un account? Registrati", lo screen reader tace completamente. Il form di registrazione è montato nel DOM ma il cursore virtuale dello screen reader non viene mosso né viene emesso alcun annuncio. Il problema è causato da tre difetti combinati in `goToPanel`.

---

## Risposta alle 5 domande

### 1. Quando `panel` diventa `'signup'`, il form viene montato nel DOM?

**Sì.**

```tsx
// AuthScreen.tsx
{panel === 'signup' ? (
  <form className="space-y-4" onSubmit={handleSignup}>
    ...
  </form>
) : null}
```

Quando `goToPanel('signup')` imposta `setPanel('signup')`, la condizione diventa vera e il form viene incluso nel DOM al render successivo. Il form esiste visivamente.

---

### 2. Nel momento in cui il `useEffect` scatta, `emailRef.current` è già montato?

**Sì — ma il focus arriva silenziosamente.**

```tsx
// AuthScreen.tsx
useEffect(() => {
  const timer = window.setTimeout(() => {
    emailRef.current?.focus()
  }, 100)
  return () => window.clearTimeout(timer)
}, [panel])
```

`emailRef` è usato su tre elementi distinti, uno per pannello:

```tsx
<Input ref={emailRef} id="login-email"    ...>   // pannello login
<Input ref={emailRef} id="signup-email"   ...>   // pannello signup
<Input ref={emailRef} id="recovery-email" ...>   // pannello recovery
```

Dopo 100 ms l'elemento `signup-email` è montato e `emailRef.current` punta ad esso correttamente. Il focus DOM viene impostato. Tuttavia lo screen reader non legge un campo che riceve focus programmatico nudo senza un previo annuncio di cambio contesto (vedi causa probabile §3).

---

### 3. `goToPanel` chiama `screenReader.announce` o qualsiasi altra funzione di notifica?

**No — in modo assoluto.**

```tsx
// AuthScreen.tsx
const goToPanel = (nextPanel: AuthPanel) => {
  resetMessages()
  setPanel(nextPanel)
}
```

La funzione contiene due sole istruzioni: `resetMessages()` e `setPanel(nextPanel)`. Non c'è alcuna chiamata a `screenReader.announce`, `screenReader.announceNavigation` né ad alcun'altra funzione di notifica. Nessun annuncio viene prodotto quando l'utente preme "Registrati".

---

### 4. Esiste un elemento `aria-live` / `role="alert"` aggiornato durante il cambio pannello?

**Sì ne esistono due. Entrambi vengono rimossi dal DOM, non aggiornati.**

```tsx
// AuthScreen.tsx
{error
  ? <p ... role="alert" aria-live="assertive">{error}</p>
  : null}

{successMessage
  ? <p ... aria-live="polite">{successMessage}</p>
  : null}
```

`goToPanel` chiama `resetMessages()` prima di `setPanel`. `resetMessages` imposta `error = ''` e `successMessage = ''`. Al render successivo entrambi gli elementi live vengono rimossi dal DOM perché le condizioni sono `false`. La rimozione di un nodo `aria-live` non produce alcun annuncio — lo screen reader si aspetta un aggiornamento del testo contenuto, non la scomparsa del nodo.

Le live region dell'istanza `ScreenReaderAnnouncer` (appese a `document.body` in `src/lib/screen-reader.ts`) non ricevono niente: `screenReader.announce` non viene mai chiamata durante il cambio pannello.

---

### 5. `CardTitle` e `CardDescription` cambiano contenuto — sono dentro un `aria-live`?

**No — nessun contenitore `aria-live`.**

```tsx
// AuthScreen.tsx
<CardTitle>Accedi a Zecchino</CardTitle>
<CardDescription>
  {panel === 'login'          && 'Usa email e password per accedere ai tuoi dati.'}
  {panel === 'signup'         && 'Crea un account con conferma email obbligatoria.'}
  {panel === 'recovery'       && 'Richiedi un link per reimpostare la password.'}
  {panel === 'signup-confirm' && 'Completa la conferma email prima del primo accesso.'}
</CardDescription>
```

`CardTitle` non cambia mai. `CardDescription` cambia il proprio testo ma il contenitore `CardHeader` non ha `aria-live`, `role="status"` né `role="alert"`. Lo screen reader non intercetta questa mutazione del DOM.

---

### SkipLink — può interferire?

**No.**

```tsx
// SkipLink.tsx
export function SkipLink() {
  return (
    <a href="#main-content" className="sr-only-focusable ...">
      Salta alla navigazione principale
    </a>
  )
}
```

Componente `<a>` statico senza `useEffect`, senza gestori di montaggio, senza logica che tocchi il focus. Non interagisce col cambio pannello.

---

## Causa probabile

Tre difetti combinati, tutti in `goToPanel`:

**1 — Nessuna notifica contestuale (principale)**  
`goToPanel('signup')` non chiama `screenReader.announce` con alcun messaggio. Lo screen reader non sa che il contesto è cambiato. Nei casi in cui `screenReader.announce` viene chiamata — per esempio in `handleSignup` dopo la registrazione riuscita — lo screen reader legge correttamente. Il cambio di pannello interattivo non viene mai annunciato.

**2 — Le live region vengono svuotate, non scritte (aggravante)**  
`resetMessages()` rimuove i nodi `role="alert"` e `aria-live` dal DOM. Uno screen reader si aspetta che una live region venga *aggiornata con nuovo testo*, non rimossa. La rimozione non produce nessun annuncio.

**3 — Il focus programmatico senza annuncio contestuale non attiva il cursore virtuale (aggravante)**  
TalkBack e NVDA gestiscono un cursore virtuale separato dal focus DOM. Un `element.focus()` programmatico — senza che prima sia stato emesso un annuncio di cambio contesto — sposta il focus del browser ma non muove il cursore virtuale. Lo screen reader resta virtualmente sul pulsante "Registrati" appena premuto e non legge nulla di ciò che è visivamente a schermo.

Il risultato percepito è il silenzio totale: la pagina è montata, i campi ci sono, ma lo screen reader non ne sa nulla.
