import { SavingsGoal, Account } from '@/lib/types'
import { formatCurrency } from '@/lib/helpers'
import { getSavingsGoalProgress, calculateSavingsProjection } from '@/lib/helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
  Briefcase,
  PencilSimple,
  Trash,
  Plus,
  Check,
  TrendUp,
  Calendar,
  ArrowUp,
  Warning
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'

const ICON_MAP: Record<string, any> = {
  'piggy-bank': PiggyBank,
  'airplane': Airplane,
  'house': House,
  'graduation-cap': GraduationCap,
  'car': Car,
  'heart': Heart,
  'gift': Gift,
  'sparkle': Sparkle,
  'target': Target,
  'briefcase': Briefcase
}

interface SavingsGoalCardProps {
  goal: SavingsGoal
  accounts: Account[]
  onEdit: (goal: SavingsGoal) => void
  onDelete: (goal: SavingsGoal) => void
  onAddFunds: (goal: SavingsGoal) => void
}

export function SavingsGoalCard({ goal, accounts, onEdit, onDelete, onAddFunds }: SavingsGoalCardProps) {
  const Icon = ICON_MAP[goal.icona] || Target
  const progress = getSavingsGoalProgress(goal)
  const projection = calculateSavingsProjection(goal)

  const linkedAccount = goal.contoAssociato 
    ? accounts.find(a => a.id === goal.contoAssociato)
    : null

  const getStatusColor = () => {
    if (progress.isComplete) return 'oklch(0.75 0.12 85)'
    if (progress.isOverdue) return 'oklch(0.55 0.15 25)'
    if (progress.percentage >= 75) return 'oklch(0.65 0.15 190)'
    if (progress.percentage >= 50) return 'oklch(0.75 0.18 60)'
    return 'oklch(0.5 0.12 200)'
  }

  const getProgressColor = () => {
    if (progress.isComplete) return 'bg-income'
    if (progress.isOverdue) return 'bg-destructive'
    if (progress.percentage >= 75) return 'bg-accent'
    return 'bg-primary'
  }

  const formatDeadline = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden transition-all hover:shadow-lg">
        <div 
          className="absolute top-0 left-0 w-1 h-full"
          style={{ backgroundColor: goal.colore }}
        />
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${goal.colore}20`, color: goal.colore }}
              >
                <Icon size={28} weight="duotone" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg truncate">{goal.nome}</CardTitle>
                  {progress.isComplete && (
                    <Badge variant="default" className="bg-income text-income-foreground">
                      <Check size={12} weight="bold" className="mr-1" />
                      Completato
                    </Badge>
                  )}
                  {progress.isOverdue && !progress.isComplete && (
                    <Badge variant="destructive">
                      <Warning size={12} weight="fill" className="mr-1" />
                      Scaduto
                    </Badge>
                  )}
                </div>
                {goal.descrizione && (
                  <CardDescription className="text-xs line-clamp-2">
                    {goal.descrizione}
                  </CardDescription>
                )}
                {linkedAccount && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {linkedAccount.nome}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-1 ml-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEdit(goal)}
                    aria-label="Modifica obiettivo"
                  >
                    <PencilSimple size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Modifica obiettivo</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(goal)}
                    aria-label="Elimina obiettivo"
                  >
                    <Trash size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent variant="destructive">Elimina obiettivo</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-mono font-bold" style={{ color: getStatusColor() }}>
                {formatCurrency(goal.importoCorrente)}
              </span>
              <span className="text-sm text-muted-foreground">
                di {formatCurrency(goal.importoTarget)}
              </span>
            </div>

            <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20">
              <div 
                className={`h-full transition-all ${getProgressColor()}`}
                style={{ width: `${Math.min(progress.percentage, 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold">
                {Math.round(progress.percentage)}% completato
              </span>
              <span className="text-muted-foreground">
                {progress.remaining > 0 ? `${formatCurrency(progress.remaining)} rimanenti` : 'Obiettivo raggiunto!'}
              </span>
            </div>
          </div>

          {goal.dataScadenza && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} weight="duotone" className="text-muted-foreground" />
              <span className={progress.isOverdue && !progress.isComplete ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                {progress.isOverdue && !progress.isComplete ? 'Scaduto il ' : 'Scadenza: '}
                {formatDeadline(goal.dataScadenza)}
              </span>
              {progress.daysRemaining !== undefined && progress.daysRemaining > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {progress.daysRemaining} {progress.daysRemaining === 1 ? 'giorno' : 'giorni'} rimanenti
                </Badge>
              )}
            </div>
          )}

          {projection && !progress.isComplete && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendUp size={14} weight="duotone" />
                <span className="font-medium">Proiezioni Risparmio</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Settimanale</p>
                  <p className="font-mono font-semibold">{formatCurrency(projection.weeklyRequired)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Mensile</p>
                  <p className="font-mono font-semibold">{formatCurrency(projection.monthlyRequired)}</p>
                </div>
              </div>

              {projection.projectedCompletion && (
                <div className="flex items-center gap-2 text-xs">
                  <Badge 
                    variant={projection.onTrack ? 'default' : 'destructive'}
                    className={projection.onTrack ? 'bg-accent text-accent-foreground' : ''}
                  >
                    {projection.onTrack ? (
                      <>
                        <ArrowUp size={12} weight="bold" className="mr-1" />
                        In linea
                      </>
                    ) : (
                      <>
                        <Warning size={12} weight="fill" className="mr-1" />
                        In ritardo
                      </>
                    )}
                  </Badge>
                  <span className="text-muted-foreground">
                    Completamento previsto: {formatDeadline(projection.projectedCompletion)}
                  </span>
                </div>
              )}
            </div>
          )}

          {!progress.isComplete && (
            <Button
              onClick={() => onAddFunds(goal)}
              className="w-full gap-2"
              variant="outline"
            >
              <Plus size={18} weight="bold" />
              Aggiungi Fondi
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
