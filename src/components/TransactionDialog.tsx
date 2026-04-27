import { useState, useEffect, useCallback, useRef } from 'react'
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
import { useScreenReader } from '@/hooks/use-screen-reader'

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
  const {
    announceDialogOpen,
    announce,
    announceFormError,
    announceSuccess,
  } = useScreenReader()
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
  const [previousError, setPreviousError] = useState('')
  const amountInputRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
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
  }, [accounts, categories])

  useEffect(() => {
    if (open) {
      soundSystem.play('dialog-open')
      const dialogTitle = transaction ? 'Modifica Movimento' : 'Nuovo Movimento'
      announceDialogOpen(dialogTitle)
      if (!transaction) {
        resetForm()
        const timer = setTimeout(() => amountInputRef.current?.focus(), 100)
        return () => clearTimeout(timer)
      }
    }
  }, [open, transaction, announceDialogOpen, resetForm])

  useEffect(() => {
    if (tipo !== 'trasferimento') {
      setContoDestinazioneId('')
    } else if (tipo === 'trasferimento' && contoId && contoDestinazioneId) {
      const contoOrigine = accounts.find(a => a.id === contoId)
      const contoDestinazione = accounts.find(a => a.id === contoDestinazioneId)
      if (contoOrigine && contoDestinazione) {
        announce(
          `Trasferimento da ${contoOrigine.nome} a ${contoDestinazione.nome}`,
          'polite'
        )
      }
    }
  }, [tipo, contoId, contoDestinazioneId, accounts, announce])

  useEffect(() => {
    if (ricorrente && frequenzaRicorrenza) {
      const frequenzaLabel = RECURRENCE_LABELS[frequenzaRicorrenza as RecurrenceFrequency]
      announce(`Movimento ricorrente: ${frequenzaLabel}`, 'polite')
    }
  }, [ricorrente, frequenzaRicorrenza, announce])

  useEffect(() => {
    if (error && error !== previousError) {
      const fieldMatch = error.match(/^(.*?)(è obbligatori[ao]|deve essere|seleziona)/i)
      const fieldName = fieldMatch ? fieldMatch[1].trim() : 'Campo'
      announceFormError(fieldName, error)
      setPreviousError(error)
    } else if (!error && previousError) {
      announceSuccess('Errore corretto')
      setPreviousError('')
    }
  }, [error, previousError, announceFormError, announceSuccess])

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
                <Label htmlFor="transaction-date">Data *</Label>
                <Input
                  id="transaction-date"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  aria-required="true"
                  aria-invalid={error.includes('data') ? 'true' : 'false'}
                  aria-describedby="transaction-date-desc"
                />
                <span id="transaction-date-desc" className="sr-only">
                  Campo obbligatorio. Seleziona la data del movimento.
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-amount">Importo (€) *</Label>
                <Input
                  ref={amountInputRef}
                  id="transaction-amount"
                  type="number"
                  step="0.01"
                  value={importo}
                  onChange={(e) => setImporto(e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                  required
                  aria-required="true"
                  aria-invalid={error.includes('importo') ? 'true' : 'false'}
                  aria-describedby="transaction-amount-desc"
                />
                <span id="transaction-amount-desc" className="sr-only">
                  Campo obbligatorio. Inserisci l'importo del movimento in euro.
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-account">
                {tipo === 'trasferimento' ? 'Conto di Origine *' : 'Conto *'}
              </Label>
              <Select 
                value={contoId} 
                onValueChange={setContoId}
                required
              >
                <SelectTrigger 
                  id="transaction-account"
                  aria-required="true"
                  aria-invalid={error.includes('conto') && !error.includes('destinazione') ? 'true' : 'false'}
                  aria-describedby="transaction-account-desc"
                >
                  <SelectValue placeholder="Seleziona un conto" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nome} ({account.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span id="transaction-account-desc" className="sr-only">
                Campo obbligatorio. Seleziona il conto {tipo === 'trasferimento' ? 'da cui prelevare' : 'su cui registrare'} il movimento.
              </span>
            </div>

            {tipo === 'trasferimento' && (
              <div className="space-y-2">
                <Label htmlFor="destination-account">Conto di Destinazione *</Label>
                <Select 
                  value={contoDestinazioneId} 
                  onValueChange={setContoDestinazioneId}
                  required
                >
                  <SelectTrigger 
                    id="destination-account"
                    aria-required="true"
                    aria-invalid={error.includes('destinazione') ? 'true' : 'false'}
                    aria-describedby="destination-account-desc"
                  >
                    <SelectValue placeholder="Seleziona conto di destinazione" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDestinationAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.nome} ({account.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span id="destination-account-desc" className="sr-only">
                  Campo obbligatorio per trasferimenti. Seleziona il conto su cui depositare il denaro.
                </span>
              </div>
            )}

            {tipo !== 'trasferimento' && (
              <div className="space-y-2">
                <Label htmlFor="transaction-category">Categoria *</Label>
                <Select 
                  value={categoriaId} 
                  onValueChange={setCategoriaId}
                  required
                >
                  <SelectTrigger 
                    id="transaction-category"
                    aria-required="true"
                    aria-invalid={error.includes('categoria') ? 'true' : 'false'}
                    aria-describedby="transaction-category-desc"
                  >
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
                <span id="transaction-category-desc" className="sr-only">
                  Campo obbligatorio. Seleziona la categoria del movimento per organizzare le tue {tipo === 'entrata' ? 'entrate' : 'uscite'}.
                </span>
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
                aria-describedby="transaction-description-desc"
              />
              <span id="transaction-description-desc" className="sr-only">
                Campo opzionale. Aggiungi una nota o descrizione dettagliata del movimento.
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transaction-recurring"
                  checked={ricorrente}
                  onCheckedChange={(checked) => {
                    const isChecked = checked as boolean
                    setRicorrente(isChecked)
                    if (isChecked) {
                      announce('Movimento ricorrente attivato. Seleziona la frequenza.', 'polite')
                    } else {
                      announce('Movimento ricorrente disattivato', 'polite')
                    }
                  }}
                  aria-describedby="transaction-recurring-desc"
                />
                <Label htmlFor="transaction-recurring" className="font-normal cursor-pointer">
                  Movimento ricorrente
                </Label>
              </div>
              <span id="transaction-recurring-desc" className="sr-only">
                Seleziona questa opzione se il movimento si ripete regolarmente (stipendio, affitto, abbonamenti, etc.).
              </span>

              {ricorrente && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="recurrence-frequency">Frequenza *</Label>
                  <Select
                    value={frequenzaRicorrenza}
                    onValueChange={(value) => setFrequenzaRicorrenza(value as RecurrenceFrequency)}
                    required
                  >
                    <SelectTrigger 
                      id="recurrence-frequency"
                      aria-required="true"
                      aria-invalid={error.includes('frequenza') ? 'true' : 'false'}
                      aria-describedby="recurrence-frequency-desc"
                    >
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
                  <span id="recurrence-frequency-desc" className="sr-only">
                    Campo obbligatorio per movimenti ricorrenti. Indica ogni quanto si ripete il movimento.
                  </span>
                </div>
              )}
            </div>

            {error && (
              <p 
                className="text-sm text-destructive" 
                role="alert"
                aria-live="assertive"
                id="form-error"
              >
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
