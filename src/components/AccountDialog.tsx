import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Account, AccountType } from '@/lib/types'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_DESCRIPTIONS, ACCOUNT_CATEGORIES } from '@/lib/constants'
import { generateId } from '@/lib/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AccountDialogProps {
  open: boolean
  onClose: () => void
  onSave: (account: Account) => void
  account?: Account
  hasPrivateAccount?: boolean
}

export function AccountDialog({ open, onClose, onSave, account, hasPrivateAccount = false }: AccountDialogProps) {
  const [nome, setNome] = useState(account?.nome || '')
  const [tipo, setTipo] = useState<AccountType>(account?.tipo || 'bancario')
  const [saldoIniziale, setSaldoIniziale] = useState(account?.saldoIniziale.toString() || '0')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nome.trim()) {
      setError('Il nome del conto è obbligatorio')
      return
    }

    if (tipo === 'privato' && !account && hasPrivateAccount) {
      setError('È possibile avere un solo conto privato')
      return
    }

    const saldo = parseFloat(saldoIniziale)
    if (isNaN(saldo)) {
      setError('Il saldo deve essere un numero valido')
      return
    }

    const newAccount: Account = {
      id: account?.id || generateId(),
      nome: nome.trim(),
      tipo,
      saldoIniziale: saldo,
      valuta: 'EUR',
      isPrivato: tipo === 'privato',
      dataCreazione: account?.dataCreazione || new Date().toISOString()
    }

    onSave(newAccount)
    handleClose()
  }

  const handleClose = () => {
    setNome('')
    setTipo('bancario')
    setSaldoIniziale('0')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent aria-labelledby="account-dialog-title">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle id="account-dialog-title">
              {account ? 'Modifica Conto' : 'Nuovo Conto'}
            </DialogTitle>
            <DialogDescription>
              {account
                ? 'Modifica i dettagli del conto esistente'
                : 'Crea un nuovo conto per tracciare le tue finanze'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Nome del Conto</Label>
              <Input
                id="account-name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="es. Conto Corrente, Portafoglio, ecc."
                autoFocus
                aria-invalid={!!error}
              />
            </div>

            <div className="space-y-3">
              <Label>Tipo di Conto</Label>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {ACCOUNT_CATEGORIES.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={category.badgeVariant} className="text-xs">
                        {category.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {category.description}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {category.types.map((type) => {
                        const Icon = ACCOUNT_TYPE_ICONS[type]
                        const disabled = type === 'privato' && !account && hasPrivateAccount
                        const isSelected = tipo === type
                        
                        return (
                          <Card
                            key={type}
                            className={cn(
                              'cursor-pointer transition-all hover:shadow-md',
                              isSelected && 'ring-2 ring-primary bg-primary/5',
                              disabled && 'opacity-50 cursor-not-allowed'
                            )}
                            onClick={() => !disabled && setTipo(type)}
                          >
                            <CardContent className="p-3 flex flex-col items-center gap-2 text-center">
                              <Icon 
                                size={28} 
                                weight="duotone" 
                                className={cn(
                                  'transition-colors',
                                  isSelected ? 'text-primary' : 'text-muted-foreground'
                                )} 
                              />
                              <div className="space-y-0.5">
                                <p className={cn(
                                  'text-xs font-medium leading-none',
                                  isSelected && 'text-primary'
                                )}>
                                  {ACCOUNT_TYPE_LABELS[type]}
                                </p>
                                <p className={cn(
                                  'text-[10px] leading-tight',
                                  isSelected ? 'text-primary/70' : 'text-muted-foreground'
                                )}>
                                  {disabled ? 'Già esistente' : ACCOUNT_TYPE_DESCRIPTIONS[type]}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initial-balance">Saldo Iniziale (€)</Label>
              <Input
                id="initial-balance"
                type="number"
                step="0.01"
                value={saldoIniziale}
                onChange={(e) => setSaldoIniziale(e.target.value)}
                className="font-mono"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annulla
            </Button>
            <Button type="submit">
              {account ? 'Salva Modifiche' : 'Crea Conto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
