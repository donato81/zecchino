import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Transaction } from '@/lib/types'
import { formatCurrency } from '@/lib/helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Minus } from '@phosphor-icons/react'

interface MonthlyComparisonChartProps {
  transactions: Transaction[]
}

interface ComparisonData {
  currentMonth: {
    name: string
    income: number
    expenses: number
    net: number
  }
  previousMonth: {
    name: string
    income: number
    expenses: number
    net: number
  }
  changes: {
    income: number
    expenses: number
    net: number
    incomePercent: number
    expensesPercent: number
    netPercent: number
  }
}

export function MonthlyComparisonChart({ transactions }: MonthlyComparisonChartProps) {
  const comparisonData = useMemo((): ComparisonData => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const currentMonthTransactions = transactions.filter(t => {
      const date = new Date(t.data)
      return date >= currentMonthStart && date <= currentMonthEnd
    })

    const previousMonthTransactions = transactions.filter(t => {
      const date = new Date(t.data)
      return date >= previousMonthStart && date <= previousMonthEnd
    })

    const calculateTotals = (txs: Transaction[]) => {
      const income = txs.filter(t => t.tipo === 'entrata').reduce((sum, t) => sum + t.importo, 0)
      const expenses = txs.filter(t => t.tipo === 'uscita').reduce((sum, t) => sum + t.importo, 0)
      return { income, expenses, net: income - expenses }
    }

    const current = calculateTotals(currentMonthTransactions)
    const previous = calculateTotals(previousMonthTransactions)

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    return {
      currentMonth: {
        name: currentMonthStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
        ...current
      },
      previousMonth: {
        name: previousMonthStart.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
        ...previous
      },
      changes: {
        income: current.income - previous.income,
        expenses: current.expenses - previous.expenses,
        net: current.net - previous.net,
        incomePercent: calculateChange(current.income, previous.income),
        expensesPercent: calculateChange(current.expenses, previous.expenses),
        netPercent: calculateChange(current.net, previous.net)
      }
    }
  }, [transactions])

  const chartData = [
    {
      name: comparisonData.previousMonth.name.split(' ')[0],
      Entrate: comparisonData.previousMonth.income,
      Uscite: comparisonData.previousMonth.expenses
    },
    {
      name: comparisonData.currentMonth.name.split(' ')[0],
      Entrate: comparisonData.currentMonth.income,
      Uscite: comparisonData.currentMonth.expenses
    }
  ]

  const chartAriaLabel = `Confronto mensile: ${comparisonData.currentMonth.name} - Entrate ${formatCurrency(comparisonData.currentMonth.income)}, Uscite ${formatCurrency(comparisonData.currentMonth.expenses)}. ${comparisonData.previousMonth.name} - Entrate ${formatCurrency(comparisonData.previousMonth.income)}, Uscite ${formatCurrency(comparisonData.previousMonth.expenses)}.`

  interface RechartsTooltipProps {
    active?: boolean
    payload?: Array<{ payload: { name: string } }>
  }

  const CustomTooltip = ({ active, payload }: RechartsTooltipProps) => {
    if (active && payload && payload.length) {
      const isCurrentMonth = payload[0].payload.name === comparisonData.currentMonth.name.split(' ')[0]
      const data = isCurrentMonth ? comparisonData.currentMonth : comparisonData.previousMonth
      
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 space-y-2">
          <p className="font-semibold text-sm">{isCurrentMonth ? comparisonData.currentMonth.name : comparisonData.previousMonth.name}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-income" />
              <span className="text-muted-foreground">Entrate:</span>
              <span className="font-mono font-semibold text-income">
                {formatCurrency(data.income)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-expense" />
              <span className="text-muted-foreground">Uscite:</span>
              <span className="font-mono font-semibold text-expense">
                {formatCurrency(data.expenses)}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t">
              <span className="text-muted-foreground">Saldo netto:</span>
              <span className={`font-mono font-semibold ${data.net >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(data.net)}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const renderChangeIndicator = (change: number, percent: number) => {
    const isPositive = change > 0
    const isNegative = change < 0
    const isNeutral = change === 0

    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-income' : isNegative ? 'text-expense' : 'text-muted-foreground'}`}>
        {isPositive && <ArrowUp size={16} weight="bold" aria-hidden="true" />}
        {isNegative && <ArrowDown size={16} weight="bold" aria-hidden="true" />}
        {isNeutral && <Minus size={16} weight="bold" aria-hidden="true" />}
        <span className="font-mono font-semibold text-sm">
          {isPositive && '+'}{formatCurrency(Math.abs(change))}
        </span>
        <span className="text-xs opacity-75">
          ({isPositive && '+'}{percent.toFixed(1)}%)
        </span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confronto Mensile</CardTitle>
        <CardDescription>
          Confronto tra {comparisonData.currentMonth.name} e {comparisonData.previousMonth.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Entrate</span>
              {renderChangeIndicator(comparisonData.changes.income, comparisonData.changes.incomePercent)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mese corrente:</span>
                <span className="font-mono font-semibold text-income">
                  {formatCurrency(comparisonData.currentMonth.income)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm opacity-60">
                <span className="text-muted-foreground">Mese precedente:</span>
                <span className="font-mono">
                  {formatCurrency(comparisonData.previousMonth.income)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Uscite</span>
              {renderChangeIndicator(comparisonData.changes.expenses, comparisonData.changes.expensesPercent)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mese corrente:</span>
                <span className="font-mono font-semibold text-expense">
                  {formatCurrency(comparisonData.currentMonth.expenses)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm opacity-60">
                <span className="text-muted-foreground">Mese precedente:</span>
                <span className="font-mono">
                  {formatCurrency(comparisonData.previousMonth.expenses)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saldo Netto</span>
              {renderChangeIndicator(comparisonData.changes.net, comparisonData.changes.netPercent)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mese corrente:</span>
                <span className={`font-mono font-semibold ${comparisonData.currentMonth.net >= 0 ? 'text-income' : 'text-expense'}`}>
                  {formatCurrency(comparisonData.currentMonth.net)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm opacity-60">
                <span className="text-muted-foreground">Mese precedente:</span>
                <span className="font-mono">
                  {formatCurrency(comparisonData.previousMonth.net)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div role="img" aria-label={chartAriaLabel}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 240)" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                stroke="oklch(0.5 0.02 240)"
                tick={{ fill: 'oklch(0.5 0.02 240)', fontSize: 12 }}
                tickLine={{ stroke: 'oklch(0.88 0.01 240)' }}
              />
              <YAxis 
                stroke="oklch(0.5 0.02 240)"
                tick={{ fill: 'oklch(0.5 0.02 240)', fontSize: 12 }}
                tickLine={{ stroke: 'oklch(0.88 0.01 240)' }}
                tickFormatter={(value) => `€${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="rect"
              />
              <Bar 
                dataKey="Entrate" 
                fill="oklch(0.75 0.12 85)" 
                radius={[8, 8, 0, 0]}
                maxBarSize={80}
              />
              <Bar 
                dataKey="Uscite" 
                fill="oklch(0.55 0.15 25)" 
                radius={[8, 8, 0, 0]}
                maxBarSize={80}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
