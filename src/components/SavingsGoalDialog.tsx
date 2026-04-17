import { useState, useEffect } from 'react'
import { SavingsGoal, Account } from '@/lib/types'
import { generateId } from '@/lib/helpers'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  PiggyBank, 
  Airplane, 
  House, 
  GraduationCap, 
  Car, 
  Heart, 
  Gift, 
  Sparkle,
  Target,
  Briefcase
} from '@phosphor-icons/react'

const GOAL_ICONS = [
  { id: 'piggy-bank', name: 'Risparmio', Icon: PiggyBank, color: 'oklch(0.75 0.12 85)' },
  { id: 'airplane', name: 'Viaggio', Icon: Airplane, color: 'oklch(0.65 0.15 250)' },
  { id: 'house', name: 'Casa', Icon: House, color: 'oklch(0.55 0.15 25)' },
  { id: 'graduation-cap', name: 'Istruzione', Icon: GraduationCap, color: 'oklch(0.6 0.15 280)' },
  { id: 'car', name: 'Auto', Icon: Car, color: 'oklch(0.5 0.12 200)' },
  { id: 'heart', name: 'Salute', Icon: Heart, color: 'oklch(0.65 0.2 15)' },
  { id: 'gift', name: 'Regalo', Icon: Gift, color: 'oklch(0.7 0.15 340)' },
  { id: 'sparkle', name: 'Lusso', Icon: Sparkle, color: 'oklch(0.75 0.18 60)' },
  { id: 'target', name: 'Obiettivo', Icon: Target, color: 'oklch(0.65 0.15 190)' },
  { id: 'briefcase', name: 'Lavoro', Icon: Briefcase, color: 'oklch(0.45 0.1 240)' }
]

interface SavingsGoalDialogProps {
  open: boolean
  onClose: () => void
  onSave: (goal: SavingsGoal) => void
  goal?: SavingsGoal
  accounts: Account[]
}

export function SavingsGoalDialog({ open, onClose, onSave, goal, accounts }: SavingsGoalDialogProps) {
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [importoTarget, setImportoTarget] = useState('')
  const [importoCorrente, setImportoCorrente] = useState('')
  const [dataScadenza, setDataScadenza] = useState('')
  const [contoAssociato, setContoAssociato] = useState<string>('')
  const [selectedIcon, setSelectedIcon] = useState('piggy-bank')
  const [selectedColor, setSelectedColor] = useState(GOAL_ICONS[0].color)

  useEffect(() => {
    if (goal) {
      setNome(goal.nome)
      setDescrizione(goal.descrizione)
      setImportoTarget(goal.importoTarget.toString())
      setImportoCorrente(goal.importoCorrente.toString())
      setDataScadenza(goal.dataScadenza ? goal.dataScadenza.split('T')[0] : '')
      setContoAssociato(goal.contoAssociato || '')
      setSelectedIcon(goal.icona)
      setSelectedColor(goal.colore)
    } else {
      setNome('')
      setDescrizione('')
      setImportoTarget('')
      setImportoCorrente('0')
      setDataScadenza('')
      setContoAssociato('')
      setSelectedIcon('piggy-bank')
      setSelectedColor(GOAL_ICONS[0].color)
    }
  }, [goal, open])

  const handleIconSelect = (iconId: string, color: string) => {
    setSelectedIcon(iconId)
    setSelectedColor(color)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const targetAmount = parseFloat(importoTarget)
    const currentAmount = parseFloat(importoCorrente)

    if (isNaN(targetAmount) || targetAmount <= 0) {
      return
    }

    if (isNaN(currentAmount) || currentAmount < 0) {
      return
    }

    const newGoal: SavingsGoal = {
      id: goal?.id || generateId(),
      nome: nome.trim(),
      descrizione: descrizione.trim(),
      importoTarget: targetAmount,
      importoCorrente: currentAmount,
      dataInizio: goal?.dataInizio || new Date().toISOString(),
      dataScadenza: dataScadenza ? new Date(dataScadenza).toISOString() : undefined,
      contoAssociato: contoAssociato || undefined,
      colore: selectedColor,
      icona: selectedIcon,
      completato: currentAmount >= targetAmount,
      dataCompletamento: currentAmount >= targetAmount && !goal?.completato
        ? new Date().toISOString()
        : goal?.dataCompletamento
    }

    onSave(newGoal)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? 'Modifica Obiettivo di Risparmio' : 'Nuovo Obiettivo di Risparmio'}</DialogTitle>
          <DialogDescription>
            Definisci un obiettivo di risparmio e monitora i tuoi progressi
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <Label>Icona Obiettivo</Label>
            <div className="grid grid-cols-5 gap-2">
              {GOAL_ICONS.map(({ id, name, Icon, color }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleIconSelect(id, color)}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    selectedIcon === id 
                      ? 'border-accent shadow-md' 
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  style={{ 
                    backgroundColor: selectedIcon === id ? `${color}15` : 'transparent'
                  }}
                  title={name}
                >
                  <Icon 
                    size={28} 
                    weight="duotone" 
                    style={{ color: selectedIcon === id ? color : 'currentColor' }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-name">Nome Obiettivo *</Label>
            <Input
              id="goal-name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="es. Fondo Emergenza, Vacanza Estate, Nuovo Laptop"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-description">Descrizione</Label>
            <Textarea
              id="goal-description"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Descrivi il tuo obiettivo..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Importo Target (€) *</Label>
              <Input
                id="goal-target"
                type="number"
                step="0.01"
                min="0.01"
                value={importoTarget}
                onChange={(e) => setImportoTarget(e.target.value)}
                placeholder="0.00"
                className="font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-current">Importo Attuale (€) *</Label>
              <Input
                id="goal-current"
                type="number"
                step="0.01"
                min="0"
                value={importoCorrente}
                onChange={(e) => setImportoCorrente(e.target.value)}
                placeholder="0.00"
                className="font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-deadline">Data Scadenza (opzionale)</Label>
            <Input
              id="goal-deadline"
              type="date"
              value={dataScadenza}
              onChange={(e) => setDataScadenza(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-account">Conto Associato (opzionale)</Label>
            <Select value={contoAssociato} onValueChange={setContoAssociato}>
              <SelectTrigger id="goal-account">
                <SelectValue placeholder="Seleziona un conto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun conto</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annulla
            </Button>
            <Button type="submit" className="flex-1">
              {goal ? 'Salva Modifiche' : 'Crea Obiettivo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
