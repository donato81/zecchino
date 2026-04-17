import { Budget, Transaction, Category, Account } from '@/lib/types'
import { getBudgetProgress, formatCurrency } from '@/lib/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PencilSimple, Trash, Target, TrendDown, TrendUp, Warning } from '@phosphor-icons/react'

interface BudgetProgressCardProps {
  budget: Budget
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
  onEdit: (budget: Budget) => void
  onDelete: (budget: Budget) => void
}

export function BudgetProgressCard({ 
  budget, 
  transactions, 
  categories, 
  accounts,
  onEdit, 
  onDelete 
}: BudgetProgressCardProps) {
  const { spent, percentage, remaining, isOverBudget } = getBudgetProgress(budget, transactions)
  
  const periodLabel = {
    mensile: 'Mensile',
    trimestrale: 'Trimestrale',
    annuale: 'Annuale'
  }[budget.periodo]

  let scopeLabel = 'Tutte le spese'
  if (budget.categoriaId) {
    const category = categories.find(c => c.id === budget.categoriaId)
    scopeLabel = category?.nome || 'Categoria'
  } else if (budget.contoId) {
    const account = accounts.find(a => a.id === budget.contoId)
    scopeLabel = account?.nome || 'Conto'
  }

  const getProgressColor = () => {
    if (isOverBudget) return 'bg-destructive'
    if (percentage >= 90) return 'bg-amber-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-accent'
  }

  const getStatusIcon = () => {
    if (isOverBudget) return <Warning size={20} weight="duotone" className="text-destructive" />
    if (percentage >= 90) return <TrendUp size={20} weight="duotone" className="text-amber-500" />
    if (percentage < 50) return <TrendDown size={20} weight="duotone" className="text-green-500" />
    return <Target size={20} weight="duotone" className="text-accent" />
  }

  return (
    <Card className={`transition-all ${!budget.attivo ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg truncate">{budget.nome}</CardTitle>
              {!budget.attivo && (
                <Badge variant="outline" className="text-xs">Inattivo</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {periodLabel}
              </Badge>
              <span>•</span>
              <span className="truncate">{scopeLabel}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(budget)}
                  aria-label="Modifica budget"
                >
                  <PencilSimple size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent variant="secondary">
                <p className="text-xs">Modifica budget</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(budget)}
                  aria-label="Elimina budget"
                >
                  <Trash size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent variant="destructive">
                <p className="text-xs">Elimina budget</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">
                {isOverBudget ? 'Budget superato' : 'In corso'}
              </span>
            </div>
            <span className={`font-mono font-semibold ${isOverBudget ? 'text-destructive' : ''}`}>
              {percentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full transition-all rounded-full ${getProgressColor()}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1 cursor-help">
                <p className="text-xs text-muted-foreground">Speso</p>
                <p className="text-sm font-mono font-semibold text-foreground">
                  {formatCurrency(spent)}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent variant="accent">
              <p className="text-xs">Totale speso nel periodo</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1 cursor-help">
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-sm font-mono font-semibold text-foreground">
                  {formatCurrency(budget.importoTarget)}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent variant="secondary">
              <p className="text-xs">Importo target del budget</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1 cursor-help">
                <p className="text-xs text-muted-foreground">
                  {isOverBudget ? 'Oltre' : 'Rimasto'}
                </p>
                <p className={`text-sm font-mono font-semibold ${
                  isOverBudget ? 'text-destructive' : remaining < budget.importoTarget * 0.1 ? 'text-amber-500' : 'text-green-600'
                }`}>
                  {isOverBudget ? '+' : ''}{formatCurrency(Math.abs(remaining))}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent variant={isOverBudget ? 'destructive' : 'success'}>
              <p className="text-xs">
                {isOverBudget 
                  ? 'Hai superato il budget di questo importo' 
                  : 'Puoi ancora spendere questa cifra'}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {isOverBudget && (
          <div className="pt-2 border-t">
            <p className="text-xs text-destructive flex items-center gap-2">
              <Warning size={14} weight="fill" />
              Hai superato il budget del {((percentage - 100)).toFixed(0)}%
            </p>
          </div>
        )}
        
        {!isOverBudget && percentage >= 90 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-amber-600 flex items-center gap-2">
              <Warning size={14} weight="fill" />
              Attenzione: stai per raggiungere il limite del budget
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
