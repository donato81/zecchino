import { Account } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/helpers'
import { AccountType } from '@/lib/types'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_TO_CATEGORY, ACCOUNT_CATEGORIES } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'

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

export function AccountCard({ account, balance, onClick }: AccountCardProps) {
  const isNegative = balance < 0
  const Icon = ACCOUNT_TYPE_ICONS[account.tipo]
  const categoryId = ACCOUNT_TYPE_TO_CATEGORY[account.tipo]
  const categoryInfo = ACCOUNT_CATEGORIES.find(cat => cat.id === categoryId)

  return (
    <Card
      onClick={onClick}
      className={`transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">
          {account.nome}
        </CardTitle>
        <Icon size={32} weight="duotone" className={ACCOUNT_COLORS[account.tipo]} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className={`text-2xl font-mono font-semibold ${isNegative ? 'text-destructive' : ''}`}>
            {formatCurrency(balance, account.valuta)}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {ACCOUNT_TYPE_LABELS[account.tipo]}
            </Badge>
            {categoryInfo && (
              <Badge variant={categoryInfo.badgeVariant} className="text-xs">
                {categoryInfo.label}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
