import { useEffect, useRef, useState } from 'react'
import { soundSystem } from '@/lib/sound-system'
import { useAuth } from '@/context/AuthContext'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Key, Lock, Password, CheckCircle, X } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type PinChangeMode = 'private' | null

export function SecuritySettings() {
  const screenReader = useScreenReader()
  const { user, resetPassword, isPrivateEnabled, setPin, changePin, removePin } = useAuth()
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pinChangeMode, setPinChangeMode] = useState<PinChangeMode>(null)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordResetMessage, setPasswordResetMessage] = useState('')
  const [error, setError] = useState('')
  const [showRemovePinDialog, setShowRemovePinDialog] = useState(false)
  const [removePinCurrentPin, setRemovePinCurrentPin] = useState('')
  const [isRemovingPin, setIsRemovingPin] = useState(false)
  const [removePinError, setRemovePinError] = useState('')
  const newPinRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!showPinDialog) return
    const timer = window.setTimeout(() => newPinRef.current?.focus(), 100)
    return () => window.clearTimeout(timer)
  }, [showPinDialog])

  const handleOpenPinChange = (mode: PinChangeMode) => {
    setPinChangeMode(mode)
    setShowPinDialog(true)
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setError('')
    soundSystem.play('dialog-open')
    screenReader.announce('Apertura dialog per gestione PIN privato', 'assertive')
  }

  const handleClosePinDialog = () => {
    setShowPinDialog(false)
    setPinChangeMode(null)
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setError('')
    soundSystem.play('dialog-close')
  }

  const validatePins = (): boolean => {
    if (isPrivateEnabled && !currentPin) {
      setError('Inserisci il PIN attuale')
      soundSystem.play('error')
      screenReader.announceError('Errore: PIN attuale richiesto')
      return false
    }

    if (!newPin) {
      setError('Inserisci il nuovo PIN')
      soundSystem.play('error')
      screenReader.announceError('Errore: nuovo PIN richiesto')
      return false
    }

    if (newPin.length < 4) {
      setError('Il PIN deve essere di almeno 4 cifre')
      soundSystem.play('error')
      screenReader.announceError('Errore: PIN troppo corto, minimo 4 cifre')
      return false
    }

    if (newPin !== confirmPin) {
      setError('I PIN non coincidono')
      soundSystem.play('error')
      screenReader.announceError('Errore: i PIN inseriti non coincidono')
      return false
    }

    return true
  }

  const handleChangePinSubmit = async () => {
    setError('')
    setIsProcessing(true)

    const isValid = validatePins()
    if (!isValid) {
      setIsProcessing(false)
      return
    }

    try {
      if (pinChangeMode === 'private') {
        if (isPrivateEnabled) {
          await changePin(currentPin, newPin)
        } else {
          await setPin(newPin)
        }
      }

      handleClosePinDialog()
    } catch (_err) {
      setError('Errore durante la modifica del PIN')
      soundSystem.play('error')
      screenReader.announceError('Errore durante la modifica del PIN. Riprova.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user?.email) {
      return
    }

    setIsChangingPassword(true)
    setPasswordResetMessage('')

    try {
      await resetPassword(user.email)
      const message = 'Ti abbiamo inviato un link via email per reimpostare la password.'
      setPasswordResetMessage(message)
      screenReader.announceSuccess(message)
    } catch {
      const message = 'Impossibile inviare il link di reset password. Riprova.'
      setPasswordResetMessage(message)
      screenReader.announceError(message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleChangePinSubmit()
    }
  }

  const handleOpenRemovePin = () => {
    setShowRemovePinDialog(true)
    setRemovePinCurrentPin('')
    setRemovePinError('')
    soundSystem.play('dialog-open')
    screenReader.announce('Apertura dialog per rimozione PIN privato', 'assertive')
  }

  const handleCloseRemovePin = () => {
    setShowRemovePinDialog(false)
    setRemovePinCurrentPin('')
    setRemovePinError('')
    soundSystem.play('dialog-close')
  }

  const handleRemovePinSubmit = async () => {
    if (!removePinCurrentPin) {
      setRemovePinError('Inserisci il PIN attuale per confermare la rimozione')
      soundSystem.play('error')
      screenReader.announceError('Errore: PIN attuale richiesto per la rimozione')
      return
    }
    setIsRemovingPin(true)
    setRemovePinError('')
    try {
      await removePin(removePinCurrentPin)
      handleCloseRemovePin()
      soundSystem.play('success')
      screenReader.announceSuccess('PIN privato rimosso con successo')
    } catch (_err) {
      setRemovePinError('PIN non corretto o errore durante la rimozione')
      soundSystem.play('error')
      screenReader.announceError('Errore durante la rimozione del PIN. Verifica il PIN attuale.')
    } finally {
      setIsRemovingPin(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center shadow-md">
              <ShieldCheck size={24} weight="duotone" className="text-destructive-foreground" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Impostazioni Sicurezza
              </CardTitle>
              <CardDescription>
                Gestisci i PIN di accesso e la sicurezza dell'applicazione
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key size={20} weight="duotone" className="text-primary" />
              <h4 className="text-sm font-semibold">Sicurezza account</h4>
            </div>

            <div className="space-y-3 pl-7">
              <div className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Password size={18} weight="duotone" className="text-primary" />
                      <Label className="text-base font-medium">Email account</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user?.email ?? 'Email non disponibile'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        <Lock size={12} weight="fill" className="mr-1" />
                        Accesso protetto da password
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => void handlePasswordReset()}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!user?.email || isChangingPassword}
                    data-focus-info="Invia email per cambiare la password dell'account"
                  >
                    <Key size={16} weight="duotone" />
                    {isChangingPassword ? 'Invio...' : 'Cambia password'}
                  </Button>
                </div>
                {passwordResetMessage ? <p className="text-sm text-muted-foreground">{passwordResetMessage}</p> : null}
              </div>

              <div className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Lock size={18} weight="duotone" className="text-destructive" />
                      <Label className="text-base font-medium">PIN Privato</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Protegge l'accesso al conto privato cifrato
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {isPrivateEnabled ? (
                        <>
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle size={12} weight="fill" className="mr-1" />
                            Configurato
                          </Badge>
                          <Badge variant="destructive" className="text-xs">
                            Conto protetto
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <X size={12} weight="bold" className="mr-1" />
                          Non configurato
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleOpenPinChange('private')}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      data-focus-info="Modifica PIN privato per il conto cifrato"
                    >
                      <Lock size={16} weight="duotone" />
                      {isPrivateEnabled ? 'Modifica' : 'Configura'}
                    </Button>
                    {isPrivateEnabled ? (
                      <Button
                        onClick={handleOpenRemovePin}
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        data-focus-info="Rimuovi PIN privato per il conto cifrato"
                      >
                        <X size={16} weight="bold" />
                        Rimuovi PIN
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="text-muted-foreground shrink-0 mt-0.5" weight="duotone" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Consigli per la Sicurezza</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Usa una password lunga e unica per il tuo account</li>
                  <li>• Non riutilizzare la stessa password su altri servizi</li>
                  <li>• Configura un PIN privato separato per il conto cifrato</li>
                  <li>• Aggiorna regolarmente le credenziali sensibili</li>
                  <li>• Il PIN privato viene salvato in forma hash per maggiore sicurezza</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key size={20} weight="duotone" />
              {isPrivateEnabled ? 'Modifica PIN Privato' : 'Configura PIN Privato'}
            </DialogTitle>
            <DialogDescription>
              Imposta un PIN dedicato per proteggere il conto privato cifrato
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isPrivateEnabled ? (
              <div className="space-y-2">
                <Label htmlFor="current-pin">PIN attuale</Label>
                <Input
                  id="current-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Inserisci il PIN attuale"
                  value={currentPin}
                  onChange={(e) => {
                    setCurrentPin(e.target.value)
                    setError('')
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={isProcessing}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="new-pin">Nuovo PIN</Label>
              <Input
                ref={newPinRef}
                id="new-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Inserisci il nuovo PIN (min. 4 cifre)"
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value)
                  setError('')
                }}
                onKeyPress={handleKeyPress}
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Conferma Nuovo PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Reinserisci il nuovo PIN"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value)
                  setError('')
                }}
                onKeyPress={handleKeyPress}
                disabled={isProcessing}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClosePinDialog}
              disabled={isProcessing}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              onClick={handleChangePinSubmit}
              disabled={isProcessing || !newPin || !confirmPin || (isPrivateEnabled && !currentPin)}
              className="gap-2"
            >
              {isProcessing ? (
                <>Modifica in corso...</>
              ) : (
                <>
                  <CheckCircle size={18} weight="duotone" />
                  Conferma Modifica
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRemovePinDialog} onOpenChange={setShowRemovePinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X size={20} weight="bold" className="text-destructive" />
              Rimuovi PIN Privato
            </DialogTitle>
            <DialogDescription>
              Inserisci il PIN attuale per confermare la rimozione.
              Dopo questa operazione il conto privato non sarà più protetto da PIN.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remove-current-pin">PIN attuale</Label>
              <Input
                id="remove-current-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Inserisci il PIN attuale"
                value={removePinCurrentPin}
                onChange={(e) => {
                  setRemovePinCurrentPin(e.target.value)
                  setRemovePinError('')
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isRemovingPin) void handleRemovePinSubmit()
                }}
                disabled={isRemovingPin}
                autoFocus
              />
            </div>

            {removePinError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive font-medium">{removePinError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseRemovePin}
              disabled={isRemovingPin}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="destructive"
              onClick={() => void handleRemovePinSubmit()}
              disabled={isRemovingPin || !removePinCurrentPin}
              className="gap-2"
            >
              {isRemovingPin ? (
                <>Rimozione in corso...</>
              ) : (
                <>
                  <X size={18} weight="bold" />
                  Rimuovi PIN
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
