import { useState, useEffect } from 'react'
import { Budget, Category, Account, BudgetPeriod } from '@/lib/types'
import { generateId, getBudgetPeriodDates } from '@/lib/helpers'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'

interface BudgetDialogProps {
  open: boolean
  onClose: () => void
  onSave: (budget: Budget) => void
  budget?: Budget
  categories: Category[]
  accounts: Account[]
}

export function BudgetDialog({ open, onClose, onSave, budget, categories, accounts }: BudgetDialogProps) {
  const [nome, setNome] = useState('')
  const [importoTarget, setImportoTarget] = useState('')
  const [periodo, setPeriodo] = useState<BudgetPeriod>('mensile')
  const [budgetType, setBudgetType] = useState<'generale' | 'categoria' | 'conto'>('generale')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [contoId, setContoId] = useState<string>('')
  const [attivo, setAttivo] = useState(true)

  useEffect(() => {
    if (budget) {
      setNome(budget.nome)
      setImportoTarget(budget.importoTarget.toString())
      setPeriodo(budget.periodo)
      setAttivo(budget.attivo)
      
      if (budget.categoriaId) {
        setBudgetType('categoria')
        setCategoriaId(budget.categoriaId)
      } else if (budget.contoId) {
        setBudgetType('conto')
        setContoId(budget.contoId)
      } else {
        setBudgetType('generale')
      }
    } else {
      setNome('')
      setImportoTarget('')
      setPeriodo('mensile')
      setBudgetType('generale')
      setCategoriaId('')
      setContoId('')
      setAttivo(true)
    }
  }, [budget, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const amount = parseFloat(importoTarget)
    if (isNaN(amount) || amount <= 0) {
      return
    }

    const dates = getBudgetPeriodDates(periodo)

    const newBudget: Budget = {
      id: budget?.id || generateId(),
      nome: nome.trim(),
      importoTarget: amount,
      periodo,
      categoriaId: budgetType === 'categoria' ? categoriaId : undefined,
      contoId: budgetType === 'conto' ? contoId : undefined,
      dataInizio: budget?.dataInizio || dates.dataInizio,
      dataFine: budget?.dataFine || dates.dataFine,
      attivo
    }

    onSave(newBudget)
    onClose()
  }

  const expenseCategories = categories.filter(c => c.tipo === 'uscita')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{budget ? 'Modifica Budget' : 'Nuovo Budget'}</DialogTitle>
          <DialogDescription>
            Imposta un obiettivo di spesa per controllare le tue finanze
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="budget-name">Nome Budget</Label>
            <Input
              id="budget-name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="es. Spese mensili"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-amount">Importo Target (€)</Label>
            <Input
              id="budget-amount"
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
            <Label htmlFor="budget-period">Periodo</Label>
            <Select value={periodo} onValueChange={(value) => setPeriodo(value as BudgetPeriod)}>
              <SelectTrigger id="budget-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensile">Mensile</SelectItem>
                <SelectItem value="trimestrale">Trimestrale</SelectItem>
                <SelectItem value="annuale">Annuale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Tipo di Budget</Label>
            <RadioGroup value={budgetType} onValueChange={(value) => setBudgetType(value as typeof budgetType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="generale" id="budget-generale" />
                <Label htmlFor="budget-generale" className="font-normal cursor-pointer">
                  Generale (tutte le spese)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="categoria" id="budget-categoria" />
                <Label htmlFor="budget-categoria" className="font-normal cursor-pointer">
                  Per Categoria
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="conto" id="budget-conto" />
                <Label htmlFor="budget-conto" className="font-normal cursor-pointer">
                  Per Conto
                </Label>
              </div>
            </RadioGroup>
          </div>

          {budgetType === 'categoria' && (
            <div className="space-y-2">
              <Label htmlFor="budget-category">Categoria</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId} required>
                <SelectTrigger id="budget-category">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {budgetType === 'conto' && (
            <div className="space-y-2">
              <Label htmlFor="budget-account">Conto</Label>
              <Select value={contoId} onValueChange={setContoId} required>
                <SelectTrigger id="budget-account">
                  <SelectValue placeholder="Seleziona conto" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="budget-active"
                checked={attivo}
                onCheckedChange={setAttivo}
              />
              <Label htmlFor="budget-active" className="font-normal cursor-pointer">
                Budget attivo
              </Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annulla
            </Button>
            <Button type="submit" className="flex-1">
              {budget ? 'Salva Modifiche' : 'Crea Budget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
