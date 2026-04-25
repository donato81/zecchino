import { useState, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { hashPin, verifyPin } from '@/lib/crypto'
import { soundSystem } from '@/lib/sound-system'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Key, Lock, Password, CheckCircle, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type PinChangeMode = 'global' | 'private' | null

export function SecuritySettings() {
  const screenReader = useScreenReader()
  const [globalPinHash, setGlobalPinHash] = useKV<string>('global-pin-hash', '')
  const [privatePinHash, setPrivatePinHash] = useKV<string>('private-pin-hash', '')
  
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pinChangeMode, setPinChangeMode] = useState<PinChangeMode>(null)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const currentPinRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showPinDialog) {
      const timer = setTimeout(() => currentPinRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [showPinDialog])

  const handleOpenPinChange = (mode: PinChangeMode) => {
    setPinChangeMode(mode)
    setShowPinDialog(true)
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setError('')
    soundSystem.play('dialog-open')
    screenReader.announce(`Apertura dialog per cambio PIN ${mode === 'global' ? 'globale' : 'privato'}`, 'assertive')
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

  const validatePins = async (): Promise<boolean> => {
    if (!currentPin) {
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

    const hashToCheck = pinChangeMode === 'global' ? globalPinHash : privatePinHash
    if (!hashToCheck) {
      setError('Nessun PIN configurato')
      soundSystem.play('error')
      screenReader.announceError('Errore: nessun PIN da modificare')
      return false
    }

    const isValid = await verifyPin(currentPin, hashToCheck)
    if (!isValid) {
      setError('PIN attuale non corretto')
      soundSystem.play('pin-error')
      screenReader.announceError('Errore: PIN attuale non corretto')
      return false
    }

    return true
  }

  const handleChangePinSubmit = async () => {
    setError('')
    setIsProcessing(true)

    const isValid = await validatePins()
    if (!isValid) {
      setIsProcessing(false)
      return
    }

    try {
      const newHash = await hashPin(newPin)
      
      if (pinChangeMode === 'global') {
        setGlobalPinHash(newHash)
        soundSystem.play('pin-success')
        toast.success('PIN globale modificato con successo')
        screenReader.announceSuccess('PIN globale modificato. Il nuovo PIN sarà richiesto al prossimo accesso.')
      } else if (pinChangeMode === 'private') {
        setPrivatePinHash(newHash)
        soundSystem.play('private-unlock')
        toast.success('PIN privato modificato con successo')
        screenReader.announceSuccess('PIN privato modificato. Il nuovo PIN sarà richiesto per sbloccare il conto privato.')
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleChangePinSubmit()
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
              <h4 className="text-sm font-semibold">Gestione PIN</h4>
            </div>
            
            <div className="space-y-3 pl-7">
              <div className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Password size={18} weight="duotone" className="text-primary" />
                      <Label className="text-base font-medium">PIN Globale</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Controlla l'accesso all'intera applicazione
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        <Lock size={12} weight="fill" className="mr-1" />
                        Attivo
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Richiesto all'avvio
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleOpenPinChange('global')}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    data-focus-info="Modifica PIN globale per l'accesso all'applicazione"
                  >
                    <Key size={16} weight="duotone" />
                    Modifica
                  </Button>
                </div>
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
                      {privatePinHash ? (
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
                  <Button
                    onClick={() => handleOpenPinChange('private')}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!privatePinHash}
                    data-focus-info="Modifica PIN privato per il conto cifrato"
                  >
                    <Lock size={16} weight="duotone" />
                    Modifica
                  </Button>
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
                  <li>• Usa un PIN di almeno 6 cifre per maggiore sicurezza</li>
                  <li>• Non utilizzare PIN sequenziali (1234, 0000) o date di nascita</li>
                  <li>• Il PIN privato può essere diverso da quello globale</li>
                  <li>• Cambia regolarmente i tuoi PIN per mantenere la sicurezza</li>
                  <li>• I PIN sono protetti con crittografia avanzata (SHA-256)</li>
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
              Modifica PIN {pinChangeMode === 'global' ? 'Globale' : 'Privato'}
            </DialogTitle>
            <DialogDescription>
              Inserisci il PIN attuale e il nuovo PIN per modificarlo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-pin">PIN Attuale</Label>
              <Input
                ref={currentPinRef}
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

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="new-pin">Nuovo PIN</Label>
              <Input
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
              disabled={isProcessing || !currentPin || !newPin || !confirmPin}
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
    </>
  )
}
