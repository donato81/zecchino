import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Transaction, TransactionType, Account, Category, RecurrenceFrequency } from '@/lib/types'
import { TRANSACTION_TYPE_LABELS, RECURRENCE_LABELS } from '@/lib/constants'
import { generateId } from '@/lib/helpers'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { soundSystem } from '@/lib/sound-system'

interface TransactionDialogProps {
  open: boolean
  onClose: () => void
  onSave: (transaction: Transaction) => void
  transaction?: Transaction
  accounts: Account[]
  categories: Category[]
}

const RECURRENCE_OPTIONS: RecurrenceFrequency[] = ['giornaliero', 'settimanale', 'mensile', 'annuale']

export function TransactionDialog({
  open,
  onClose,
  onSave,
  transaction,
  accounts,
  categories
}: TransactionDialogProps) {
  const [tipo, setTipo] = useState<TransactionType>(transaction?.tipo || 'uscita')
  const [data, setData] = useState(
    transaction?.data || new Date().toISOString().split('T')[0]
  )
  const [importo, setImporto] = useState(transaction?.importo.toString() || '')
  const [contoId, setContoId] = useState(transaction?.contoId || '')
  const [contoDestinazioneId, setContoDestinazioneId] = useState(transaction?.contoDestinazioneId || '')
  const [categoriaId, setCategoriaId] = useState(transaction?.categoriaId || '')
  const [descrizione, setDescrizione] = useState(transaction?.descrizione || '')
  const [ricorrente, setRicorrente] = useState(transaction?.ricorrente || false)
  const [frequenzaRicorrenza, setFrequenzaRicorrenza] = useState<RecurrenceFrequency | ''>(
    transaction?.frequenzaRicorrenza || ''
  )
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      soundSystem.play('dialog-open')
      if (!transaction) {
        resetForm()
      }
    }
  }, [open, transaction])

  useEffect(() => {
    if (tipo !== 'trasferimento') {
      setContoDestinazioneId('')
    }
  }, [tipo])

  useEffect(() => {
    if (!categoriaId || !categories.find(c => c.id === categoriaId)) {
      const validCategories = categories.filter(c =>
        tipo === 'trasferimento' ? false : c.tipo === tipo
      )
      if (validCategories.length > 0) {
        setCategoriaId(validCategories[0].id)
      }
    }
  }, [tipo, categoriaId, categories])

  const resetForm = () => {
    setTipo('uscita')
    setData(new Date().toISOString().split('T')[0])
    setImporto('')
    setContoId(accounts[0]?.id || '')
    setContoDestinazioneId('')
    const defaultCategory = categories.find(c => c.tipo === 'uscita')
    setCategoriaId(defaultCategory?.id || '')
    setDescrizione('')
    setRicorrente(false)
    setFrequenzaRicorrenza('')
    setError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!data) {
      setError('La data è obbligatoria')
      return
    }

    const amount = parseFloat(importo)
    if (isNaN(amount) || amount <= 0) {
      setError('L\'importo deve essere un numero positivo')
      return
    }

    if (!contoId) {
      setError('Seleziona un conto')
      return
    }

    if (tipo === 'trasferimento') {
      if (!contoDestinazioneId) {
        setError('Seleziona un conto di destinazione per il trasferimento')
        return
      }
      if (contoId === contoDestinazioneId) {
        setError('Il conto di origine e di destinazione non possono essere uguali')
        return
      }
    } else {
      if (!categoriaId) {
        setError('Seleziona una categoria')
        return
      }
    }

    if (ricorrente && !frequenzaRicorrenza) {
      setError('Seleziona la frequenza per la ricorrenza')
      return
    }

    const account = accounts.find(a => a.id === contoId)
    const isPrivateTransaction = account?.isPrivato || false

    const newTransaction: Transaction = {
      id: transaction?.id || generateId(),
      data,
      importo: amount,
      tipo,
      contoId,
      contoDestinazioneId: tipo === 'trasferimento' ? contoDestinazioneId : undefined,
      categoriaId: tipo === 'trasferimento' ? '' : categoriaId,
      descrizione: descrizione.trim(),
      ricorrente,
      frequenzaRicorrenza: ricorrente ? (frequenzaRicorrenza as RecurrenceFrequency) : undefined,
      cifrato: isPrivateTransaction
    }

    onSave(newTransaction)
    handleClose()
  }

  const handleClose = () => {
    soundSystem.play('dialog-close')
    if (!transaction) {
      resetForm()
    }
    onClose()
  }

  const filteredCategories = categories.filter(c =>
    tipo === 'trasferimento' ? false : c.tipo === tipo
  )

  const availableDestinationAccounts = accounts.filter(a => a.id !== contoId)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg" aria-labelledby="transaction-dialog-title">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle id="transaction-dialog-title">
              {transaction ? 'Modifica Movimento' : 'Nuovo Movimento'}
            </DialogTitle>
            <DialogDescription>
              {transaction
                ? 'Modifica i dettagli del movimento'
                : 'Registra un nuovo movimento di denaro'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              <Label>Tipo di Movimento</Label>
              <RadioGroup value={tipo} onValueChange={(value) => setTipo(value as TransactionType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="entrata" id="tipo-entrata" />
                  <Label htmlFor="tipo-entrata" className="font-normal cursor-pointer">
                    {TRANSACTION_TYPE_LABELS.entrata}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="uscita" id="tipo-uscita" />
                  <Label htmlFor="tipo-uscita" className="font-normal cursor-pointer">
                    {TRANSACTION_TYPE_LABELS.uscita}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="trasferimento" id="tipo-trasferimento" />
                  <Label htmlFor="tipo-trasferimento" className="font-normal cursor-pointer">
                    {TRANSACTION_TYPE_LABELS.trasferimento}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transaction-date">Data</Label>
                <Input
                  id="transaction-date"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-amount">Importo (€)</Label>
                <Input
                  id="transaction-amount"
                  type="number"
                  step="0.01"
                  value={importo}
                  onChange={(e) => setImporto(e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                  autoFocus={!transaction}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-account">
                {tipo === 'trasferimento' ? 'Conto di Origine' : 'Conto'}
              </Label>
              <Select value={contoId} onValueChange={setContoId}>
                <SelectTrigger id="transaction-account">
                  <SelectValue placeholder="Seleziona un conto" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tipo === 'trasferimento' && (
              <div className="space-y-2">
                <Label htmlFor="destination-account">Conto di Destinazione</Label>
                <Select value={contoDestinazioneId} onValueChange={setContoDestinazioneId}>
                  <SelectTrigger id="destination-account">
                    <SelectValue placeholder="Seleziona conto di destinazione" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDestinationAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tipo !== 'trasferimento' && (
              <div className="space-y-2">
                <Label htmlFor="transaction-category">Categoria</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger id="transaction-category">
                    <SelectValue placeholder="Seleziona una categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="transaction-description">Descrizione (opzionale)</Label>
              <Textarea
                id="transaction-description"
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                placeholder="Aggiungi dettagli sul movimento..."
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transaction-recurring"
                  checked={ricorrente}
                  onCheckedChange={(checked) => setRicorrente(checked as boolean)}
                />
                <Label htmlFor="transaction-recurring" className="font-normal cursor-pointer">
                  Movimento ricorrente
                </Label>
              </div>

              {ricorrente && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="recurrence-frequency">Frequenza</Label>
                  <Select
                    value={frequenzaRicorrenza}
                    onValueChange={(value) => setFrequenzaRicorrenza(value as RecurrenceFrequency)}
                  >
                    <SelectTrigger id="recurrence-frequency">
                      <SelectValue placeholder="Seleziona frequenza" />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_OPTIONS.map(freq => (
                        <SelectItem key={freq} value={freq}>
                          {RECURRENCE_LABELS[freq]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
              {transaction ? 'Salva Modifiche' : 'Aggiungi Movimento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
