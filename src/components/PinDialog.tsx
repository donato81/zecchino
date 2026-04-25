import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Eye, EyeSlash, LockKey } from '@phosphor-icons/react'
import { soundSystem } from '@/lib/sound-system'

interface PinDialogProps {
  open: boolean
  title: string
  description: string
  onSubmit: (pin: string) => void
  onCancel?: () => void
  confirmMode?: boolean
}

export function PinDialog({
  open,
  title,
  description,
  onSubmit,
  onCancel,
  confirmMode = false
}: PinDialogProps) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const pinInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      soundSystem.play('dialog-open')
      const timer = setTimeout(() => pinInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!pin) {
      setError('Il PIN è obbligatorio')
      return
    }

    if (confirmMode) {
      if (pin.length < 4) {
        setError('Il PIN deve contenere almeno 4 caratteri')
        return
      }
      if (pin !== confirmPin) {
        setError('I PIN non corrispondono')
        return
      }
    }

    onSubmit(pin)
    setPin('')
    setConfirmPin('')
    setError('')
  }

  const handleClose = () => {
    soundSystem.play('dialog-close')
    onCancel?.()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent aria-labelledby="pin-dialog-title" aria-describedby="pin-dialog-description">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle id="pin-dialog-title" className="flex items-center gap-2">
              <LockKey className="text-primary" size={24} weight="duotone" />
              {title}
            </DialogTitle>
            <DialogDescription id="pin-dialog-description">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin">
                {confirmMode ? 'Nuovo PIN' : 'PIN'}
              </Label>
              <div className="relative">
                <Input
                  ref={pinInputRef}
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={confirmMode ? 'Inserisci il nuovo PIN' : 'Inserisci il tuo PIN'}
                  className="pr-10"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'pin-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPin ? 'Nascondi PIN' : 'Mostra PIN'}
                >
                  {showPin ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {confirmMode && (
              <div className="space-y-2">
                <Label htmlFor="confirm-pin">Conferma PIN</Label>
                <Input
                  id="confirm-pin"
                  type={showPin ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Reinserisci il PIN"
                  aria-invalid={!!error}
                />
              </div>
            )}

            {error && (
              <p id="pin-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Annulla
              </Button>
            )}
            <Button type="submit">
              Conferma
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
