import { Account } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/helpers'
import { AccountType } from '@/lib/types'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_TO_CATEGORY, ACCOUNT_CATEGORIES, ACCOUNT_TYPE_DESCRIPTIONS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface AccountCardProps {
  account: Account
  balance: number
  onClick?: () => void
}

const ACCOUNT_COLORS: Record<AccountType, string> = {
  bancario: 'text-primary',
  prepagata: 'text-accent',
  contanti: 'text-income',
  salvadanaio: 'text-secondary',
  privato: 'text-destructive',
  investimenti: 'text-[oklch(0.55_0.18_140)]',
  credito: 'text-[oklch(0.60_0.15_330)]',
  paypal: 'text-[oklch(0.50_0.15_230)]',
  crypto: 'text-[oklch(0.65_0.20_50)]',
  pensione: 'text-[oklch(0.45_0.10_260)]'
}

const ACCOUNT_GRADIENTS: Record<AccountType, string> = {
  bancario: 'from-primary/10 via-primary/5 to-transparent',
  prepagata: 'from-accent/10 via-accent/5 to-transparent',
  contanti: 'from-income/10 via-income/5 to-transparent',
  salvadanaio: 'from-secondary/10 via-secondary/5 to-transparent',
  privato: 'from-destructive/10 via-destructive/5 to-transparent',
  investimenti: 'from-[oklch(0.55_0.18_140)]/10 via-[oklch(0.55_0.18_140)]/5 to-transparent',
  credito: 'from-[oklch(0.60_0.15_330)]/10 via-[oklch(0.60_0.15_330)]/5 to-transparent',
  paypal: 'from-[oklch(0.50_0.15_230)]/10 via-[oklch(0.50_0.15_230)]/5 to-transparent',
  crypto: 'from-[oklch(0.65_0.20_50)]/10 via-[oklch(0.65_0.20_50)]/5 to-transparent',
  pensione: 'from-[oklch(0.45_0.10_260)]/10 via-[oklch(0.45_0.10_260)]/5 to-transparent'
}

export function AccountCard({ account, balance, onClick }: AccountCardProps) {
  const isNegative = balance < 0
  const Icon = ACCOUNT_TYPE_ICONS[account.tipo]
  const categoryId = ACCOUNT_TYPE_TO_CATEGORY[account.tipo]
  const categoryInfo = ACCOUNT_CATEGORIES.find(cat => cat.id === categoryId)

  return (
    <Card
      onClick={onClick}
      className={`transition-all hover:shadow-lg hover:scale-[1.02] relative overflow-hidden border-2 ${onClick ? 'cursor-pointer' : ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label={`${account.nome}, ${ACCOUNT_TYPE_LABELS[account.tipo]}, saldo ${formatCurrency(balance, account.valuta)}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${ACCOUNT_GRADIENTS[account.tipo]} opacity-50`}></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full"></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
        <CardTitle className="text-lg font-semibold">
          {account.nome}
        </CardTitle>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help p-2 rounded-xl bg-card/80 backdrop-blur-sm shadow-sm">
              <Icon size={28} weight="duotone" className={ACCOUNT_COLORS[account.tipo]} />
            </div>
          </TooltipTrigger>
          <TooltipContent variant={categoryId}>
            <div className="space-y-0.5">
              <p className="font-semibold">{ACCOUNT_TYPE_LABELS[account.tipo]}</p>
              <p className="text-xs opacity-90">{ACCOUNT_TYPE_DESCRIPTIONS[account.tipo]}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`text-3xl font-mono font-bold tracking-tight ${isNegative ? 'text-destructive' : 'bg-gradient-to-r from-income to-success bg-clip-text text-transparent'} cursor-help`}>
                {formatCurrency(balance, account.valuta)}
              </div>
            </TooltipTrigger>
            <TooltipContent variant={isNegative ? 'destructive' : 'success'}>
              {isNegative ? 'Saldo negativo' : 'Saldo positivo'}
            </TooltipContent>
          </Tooltip>
          <div className="flex gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Badge variant="outline" className="text-xs cursor-help font-medium">
                    {ACCOUNT_TYPE_LABELS[account.tipo]}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent variant="muted">
                {ACCOUNT_TYPE_DESCRIPTIONS[account.tipo]}
              </TooltipContent>
            </Tooltip>
            {categoryInfo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Badge variant={categoryInfo.badgeVariant} className="text-xs cursor-help font-medium shadow-sm">
                      {categoryInfo.label}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent variant={categoryId}>
                  <div className="space-y-0.5">
                    <p className="font-semibold">{categoryInfo.description}</p>
                    <p className="text-xs opacity-90">{categoryInfo.types.length} tipi di conto in questa categoria</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
