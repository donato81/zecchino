import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Account, AccountType } from '@/lib/types'
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants'
import { generateId } from '@/lib/helpers'

interface AccountDialogProps {
  open: boolean
  onClose: () => void
  onSave: (account: Account) => void
  account?: Account
  hasPrivateAccount?: boolean
}

const ACCOUNT_TYPES: AccountType[] = ['bancario', 'prepagata', 'contanti', 'salvadanaio', 'investimenti', 'credito', 'paypal', 'crypto', 'pensione', 'privato']

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

            <div className="space-y-2">
              <Label htmlFor="account-type">Tipo di Conto</Label>
              <Select value={tipo} onValueChange={(value) => setTipo(value as AccountType)}>
                <SelectTrigger id="account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => {
                    const disabled = type === 'privato' && !account && hasPrivateAccount
                    return (
                      <SelectItem key={type} value={type} disabled={disabled}>
                        {ACCOUNT_TYPE_LABELS[type]}
                        {disabled && ' (Già esistente)'}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
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
