import { BudgetAlert, getAlertIconColor } from '@/lib/budget-alerts'
import { formatCurrency } from '@/lib/helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Warning, TrendUp, X, Target } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { soundSystem } from '@/lib/sound-system'

interface BudgetAlertBannerProps {
  alerts: BudgetAlert[]
  onDismiss: (alertId: string) => void
  onViewBudget: (budgetId: string) => void
}

export function BudgetAlertBanner({ alerts, onDismiss, onViewBudget }: BudgetAlertBannerProps) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <motion.div
            key={alert.budgetId}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Card 
              className={`border-l-4 ${
                alert.level === 'exceeded' 
                  ? 'border-l-destructive bg-destructive/5' 
                  : alert.level === 'critical'
                  ? 'border-l-amber-500 bg-amber-50/50'
                  : 'border-l-yellow-500 bg-yellow-50/50'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${getAlertIconColor(alert.level)}`}>
                    {alert.level === 'exceeded' ? (
                      <Warning size={24} weight="fill" />
                    ) : alert.level === 'critical' ? (
                      <TrendUp size={24} weight="duotone" />
                    ) : (
                      <Target size={24} weight="duotone" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant={
                              alert.level === 'exceeded' 
                                ? 'destructive' 
                                : alert.level === 'critical'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {alert.level === 'exceeded' 
                              ? 'Superato' 
                              : alert.level === 'critical'
                              ? 'Critico'
                              : 'Attenzione'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {alert.percentage.toFixed(0)}% utilizzato
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-relaxed">
                          {alert.message}
                        </p>
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          soundSystem.play('dialog-close')
                          onDismiss(alert.budgetId)
                        }}
                        aria-label="Chiudi notifica"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Speso: </span>
                        <span className="font-mono font-semibold">
                          {formatCurrency(alert.spent)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target: </span>
                        <span className="font-mono font-semibold">
                          {formatCurrency(alert.target)}
                        </span>
                      </div>
                      {alert.level !== 'exceeded' && (
                        <div>
                          <span className="text-muted-foreground">Rimasto: </span>
                          <span className={`font-mono font-semibold ${
                            alert.remaining < alert.target * 0.1 ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(alert.remaining)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewBudget(alert.budgetId)}
                        className="h-7 text-xs"
                      >
                        Visualizza Budget
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
