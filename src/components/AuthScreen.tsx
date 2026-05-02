import { useEffect, useRef, useState } from 'react'
import { SkipLink } from '@/components/SkipLink'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { supabase } from '@/lib/supabase/client'

type AuthPanel = 'login' | 'signup' | 'recovery' | 'signup-confirm'

function normalizeAuthError(error: unknown, mode: 'login' | 'signup' | 'recovery') {
  const authError = error as { code?: string; message?: string; status?: number }
  const message = authError.message?.toLowerCase() ?? ''

  if (authError.status === 429 || message.includes('rate limit')) {
    return 'Troppi tentativi. Attendi qualche minuto prima di riprovare.'
  }

  if (message.includes('fetch') || message.includes('network')) {
    return 'Impossibile connettersi. Controlla la connessione.'
  }

  if (mode === 'login') {
    if (message.includes('not confirmed') || message.includes('email not confirmed')) {
      return 'Controlla la tua email e clicca il link di conferma prima di accedere.'
    }
    if (message.includes('invalid login credentials') || message.includes('invalid credentials') || authError.status === 400) {
      return 'Email o password non corretti.'
    }
    return 'Accesso non riuscito. Riprova.'
  }

  if (mode === 'signup') {
    if (authError.code === '23505' || message.includes('already registered') || message.includes('already been registered') || message.includes('already in use')) {
      return 'Questa email è già in uso. Accedi o reimposta la password.'
    }
    return 'Registrazione non riuscita. Riprova.'
  }

  return 'Impossibile inviare il link di recupero. Riprova.'
}

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth()
  const screenReader = useScreenReader()
  const emailRef = useRef<HTMLInputElement>(null)
  const [panel, setPanel] = useState<AuthPanel>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      emailRef.current?.focus()
    }, 100)

    return () => window.clearTimeout(timer)
  }, [panel])

  const resetMessages = () => {
    setError('')
    setSuccessMessage('')
  }

  const goToPanel = (nextPanel: AuthPanel) => {
    resetMessages()
    setPanel(nextPanel)
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    resetMessages()
    setIsLoading(true)

    try {
      await signIn(email, password)
    } catch (authError) {
      const message = normalizeAuthError(authError, 'login')
      setError(message)
      screenReader.announceError(message)
      emailRef.current?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault()
    resetMessages()

    if (password.length < 6) {
      const message = 'La password deve avere almeno 6 caratteri.'
      setError(message)
      screenReader.announceError(message)
      return
    }

    if (password !== confirmPassword) {
      const message = 'Le due password non coincidono.'
      setError(message)
      screenReader.announceError(message)
      return
    }

    setIsLoading(true)

    try {
      await signUp(email, password)
      setPanel('signup-confirm')
      setSuccessMessage('Registrazione completata! Controlla la tua email e clicca il link di conferma per attivare l\'account.')
      screenReader.announce('Registrazione completata. Controlla la tua email per confermare l\'account.')
    } catch (authError) {
      const message = normalizeAuthError(authError, 'signup')
      setError(message)
      screenReader.announceError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecovery = async (event: React.FormEvent) => {
    event.preventDefault()
    resetMessages()
    setIsLoading(true)

    try {
      await resetPassword(email)
      const message = 'Se l\'email è associata a un account, riceverai un link per reimpostare la password entro pochi minuti.'
      setSuccessMessage(message)
      screenReader.announce(message)
    } catch (authError) {
      const message = normalizeAuthError(authError, 'recovery')
      setError(message)
      screenReader.announceError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    resetMessages()
    setIsLoading(true)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      if (resendError) throw resendError

      const message = 'Email di conferma inviata di nuovo. Controlla la tua casella di posta.'
      setSuccessMessage(message)
      screenReader.announce(message)
    } catch (authError) {
      const message = normalizeAuthError(authError, 'signup')
      setError(message)
      screenReader.announceError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <SkipLink />
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background touch-manipulation"
        role="main"
        aria-label="Schermata di autenticazione Zecchino"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-secondary/80 to-accent/90" aria-hidden="true"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.12),transparent_60%)]" aria-hidden="true"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" aria-hidden="true"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)] animate-pulse" style={{ animationDuration: '4s' }} aria-hidden="true"></div>
        <Card className="relative z-10 w-full max-w-md border-white/20 bg-background/95 shadow-2xl backdrop-blur">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent text-2xl font-bold text-primary-foreground shadow-lg">
              Z
            </div>
            <div className="space-y-1">
              <CardTitle>Accedi a Zecchino</CardTitle>
              <CardDescription>
                {panel === 'login' && 'Usa email e password per accedere ai tuoi dati.'}
                {panel === 'signup' && 'Crea un account con conferma email obbligatoria.'}
                {panel === 'recovery' && 'Richiedi un link per reimpostare la password.'}
                {panel === 'signup-confirm' && 'Completa la conferma email prima del primo accesso.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" aria-busy={isLoading}>
              {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert" aria-live="assertive">{error}</p> : null}
              {successMessage ? <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground" aria-live="polite">{successMessage}</p> : null}

              {panel === 'login' ? (
                <form className="space-y-4" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input ref={emailRef} id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
                  </div>
                  <Button className="w-full" type="submit" disabled={isLoading} aria-busy={isLoading}>
                    {isLoading ? 'Accesso in corso…' : 'Accedi'}
                  </Button>
                  <div className="flex flex-col gap-2 text-sm">
                    <button className="text-primary underline-offset-4 hover:underline" type="button" onClick={() => goToPanel('recovery')}>
                      Hai dimenticato la password?
                    </button>
                    <button className="text-primary underline-offset-4 hover:underline" type="button" onClick={() => goToPanel('signup')}>
                      Non hai un account? Registrati
                    </button>
                  </div>
                </form>
              ) : null}

              {panel === 'signup' ? (
                <form className="space-y-4" onSubmit={handleSignup}>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input ref={emailRef} id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Conferma password</Label>
                    <Input id="signup-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                  </div>
                  <Button className="w-full" type="submit" disabled={isLoading} aria-busy={isLoading}>
                    {isLoading ? 'Registrazione in corso…' : 'Registrati'}
                  </Button>
                  <button className="text-sm text-primary underline-offset-4 hover:underline" type="button" onClick={() => goToPanel('login')}>
                    Hai già un account? Accedi
                  </button>
                </form>
              ) : null}

              {panel === 'signup-confirm' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Registrazione completata. Controlla la tua email e clicca il link di conferma prima di accedere.</p>
                  <Button className="w-full" type="button" disabled={isLoading} onClick={handleResendConfirmation} aria-busy={isLoading}>
                    {isLoading ? 'Invio in corso…' : 'Re-invia email di conferma'}
                  </Button>
                  <button
                    className="text-sm text-primary underline-offset-4 hover:underline"
                    type="button"
                    onClick={() => {
                      setPassword('')
                      setConfirmPassword('')
                      setError('')
                      setSuccessMessage('')
                      setPanel('login')
                    }}
                  >
                    Torna al login
                  </button>
                </div>
              ) : null}

              {panel === 'recovery' ? (
                <form className="space-y-4" onSubmit={handleRecovery}>
                  <p className="text-sm text-muted-foreground">Inserisci il tuo indirizzo email. Ti invieremo un link per reimpostare la password.</p>
                  <div className="space-y-2">
                    <Label htmlFor="recovery-email">Email</Label>
                    <Input ref={emailRef} id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </div>
                  <Button className="w-full" type="submit" disabled={isLoading} aria-busy={isLoading}>
                    {isLoading ? 'Invio in corso…' : 'Invia link di recupero'}
                  </Button>
                  <button className="text-sm text-primary underline-offset-4 hover:underline" type="button" onClick={() => goToPanel('login')}>
                    Torna al login
                  </button>
                </form>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}