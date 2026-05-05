import { useState, useEffect } from 'react'
import { Budget, Category, Account, BudgetPeriod } from '@/lib/types'
import { generateId, getBudgetPeriodDates } from '@/lib/helpers'
import { BUDGET_TEMPLATES, findTemplateCategories, BudgetTemplate } from '@/lib/budget-templates'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Lightbulb } from '@phosphor-icons/react'
import { soundSystem } from '@/lib/sound-system'

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
  const [showTemplates, setShowTemplates] = useState(!budget)

  const handleTemplateSelect = (template: BudgetTemplate) => {
    setNome(template.nome)
    setImportoTarget(template.importoSuggerito.toString())
    setPeriodo(template.periodo)
    
    if (template.categorieTarget.length === 0) {
      setBudgetType('generale')
    } else if (template.categorieTarget.length === 1) {
      setBudgetType('categoria')
      const categoryIds = findTemplateCategories(template, categories)
      if (categoryIds.length > 0) {
        setCategoriaId(categoryIds[0])
      }
    } else {
      setBudgetType('generale')
    }
    
    setShowTemplates(false)
  }

  useEffect(() => {
    if (open) {
      soundSystem.play('dialog-open')
    }
  }, [open])

  useEffect(() => {
    if (budget) {
      setNome(budget.nome)
      setImportoTarget(budget.importoTarget.toString())
      setPeriodo(budget.periodo)
      setAttivo(budget.attivo)
      setShowTemplates(false)
      
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
      setShowTemplates(true)
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
    soundSystem.play('dialog-close')
    onClose()
  }

  const handleClose = () => {
    soundSystem.play('dialog-close')
    onClose()
  }

  const expenseCategories = categories.filter(c => c.tipo === 'uscita')

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{budget ? 'Modifica Budget' : 'Nuovo Budget'}</DialogTitle>
          <DialogDescription>
            {showTemplates 
              ? 'Scegli un template o crea un budget personalizzato' 
              : 'Imposta un obiettivo di spesa per controllare le tue finanze'}
          </DialogDescription>
        </DialogHeader>

        {showTemplates && !budget ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb size={18} weight="duotone" className="text-accent" />
              <span>Inizia con un template predefinito o crea da zero</span>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div role="radiogroup" aria-label="Modelli di budget predefiniti" className="grid gap-3">
                {BUDGET_TEMPLATES.map((template) => {
                  const Icon = template.icon
                  const periodLabel = template.periodo === 'mensile' ? 'al mese' : template.periodo === 'trimestrale' ? 'al trimestre' : 'all\'anno'
                  const isSelected = nome === template.nome
                    && importoTarget === template.importoSuggerito.toString()
                    && periodo === template.periodo
                  
                  return (
                    <Card 
                      key={template.id}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      className="cursor-pointer transition-all hover:shadow-md hover:border-accent"
                      onClick={() => handleTemplateSelect(template)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleTemplateSelect(template)
                        }
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: `${template.color}20`, color: template.color }}
                            >
                              <Icon size={24} weight="duotone" aria-hidden="true" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{template.nome}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {template.descrizione}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-semibold text-lg" style={{ color: template.color }}>
                              €{template.importoSuggerito}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {periodLabel}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>

            <Separator />

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Annulla
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setShowTemplates(false)} 
                className="flex-1"
              >
                Crea Budget Personalizzato
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {!budget && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(true)}
                className="gap-2 text-xs -mt-2"
              >
                <Lightbulb size={14} weight="duotone" />
                Usa un template
              </Button>
            )}

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
        )}
      </DialogContent>
    </Dialog>
  )
}
