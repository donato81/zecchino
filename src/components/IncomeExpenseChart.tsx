import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Transaction } from '@/lib/types'
import { formatCurrency } from '@/lib/helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface IncomeExpenseChartProps {
  transactions: Transaction[]
  period?: 'week' | 'month' | '3months' | '6months' | 'year'
}

interface ChartDataPoint {
  date: string
  entrate: number
  uscite: number
  saldo: number
}

export function IncomeExpenseChart({ transactions, period = 'month' }: IncomeExpenseChartProps) {
  const chartData = useMemo(() => {
    const now = new Date()
    let startDate = new Date()
    let groupBy: 'day' | 'week' | 'month' = 'day'

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        groupBy = 'day'
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        groupBy = 'day'
        break
      case '3months':
        startDate.setMonth(now.getMonth() - 3)
        groupBy = 'week'
        break
      case '6months':
        startDate.setMonth(now.getMonth() - 6)
        groupBy = 'month'
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        groupBy = 'month'
        break
    }

    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.data)
      return transactionDate >= startDate && transactionDate <= now
    })

    const dataMap = new Map<string, ChartDataPoint>()

    if (groupBy === 'day') {
      for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0]
        dataMap.set(key, {
          date: new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
          entrate: 0,
          uscite: 0,
          saldo: 0
        })
      }
    } else if (groupBy === 'week') {
      const weekStarts: Date[] = []
      for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 7)) {
        weekStarts.push(new Date(d))
      }
      
      weekStarts.forEach((weekStart, index) => {
        const key = weekStart.toISOString().split('T')[0]
        dataMap.set(key, {
          date: `Sett. ${index + 1}`,
          entrate: 0,
          uscite: 0,
          saldo: 0
        })
      })
    } else {
      for (let d = new Date(startDate); d <= now; d.setMonth(d.getMonth() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        dataMap.set(key, {
          date: new Date(d).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
          entrate: 0,
          uscite: 0,
          saldo: 0
        })
      }
    }

    filteredTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.data)
      let key: string

      if (groupBy === 'day') {
        key = transactionDate.toISOString().split('T')[0]
      } else if (groupBy === 'week') {
        const weekStart = new Date(transactionDate)
        weekStart.setDate(transactionDate.getDate() - transactionDate.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else {
        key = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`
      }

      const existing = dataMap.get(key)
      if (existing) {
        if (transaction.tipo === 'entrata') {
          existing.entrate += transaction.importo
        } else if (transaction.tipo === 'uscita') {
          existing.uscite += transaction.importo
        }
      }
    })

    const sortedData = Array.from(dataMap.values())
    let cumulativeSaldo = 0
    sortedData.forEach(point => {
      cumulativeSaldo += point.entrate - point.uscite
      point.saldo = cumulativeSaldo
    })

    return sortedData
  }, [transactions, period])

  const totalIncome = useMemo(() => {
    return chartData.reduce((sum, point) => sum + point.entrate, 0)
  }, [chartData])

  const totalExpenses = useMemo(() => {
    return chartData.reduce((sum, point) => sum + point.uscite, 0)
  }, [chartData])

  const netBalance = totalIncome - totalExpenses

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 space-y-1">
          <p className="font-semibold text-sm">{payload[0].payload.date}</p>
          <div className="space-y-0.5 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-income" />
              <span className="text-muted-foreground">Entrate:</span>
              <span className="font-mono font-semibold text-income">
                {formatCurrency(payload[0].payload.entrate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-expense" />
              <span className="text-muted-foreground">Uscite:</span>
              <span className="font-mono font-semibold text-expense">
                {formatCurrency(payload[0].payload.uscite)}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t">
              <span className="text-muted-foreground">Saldo netto:</span>
              <span className={`font-mono font-semibold ${payload[0].payload.entrate - payload[0].payload.uscite >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(payload[0].payload.entrate - payload[0].payload.uscite)}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const periodLabel = {
    week: 'ultima settimana',
    month: 'ultimo mese',
    '3months': 'ultimi 3 mesi',
    '6months': 'ultimi 6 mesi',
    year: 'ultimo anno'
  }[period]

  const chartAriaLabel = `Grafico andamento entrate e uscite per ${periodLabel}. Entrate totali: ${formatCurrency(totalIncome)}. Uscite totali: ${formatCurrency(totalExpenses)}. Saldo netto: ${formatCurrency(netBalance)}.`

  return (
    <Card role="region" aria-label={chartAriaLabel}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Andamento Entrate vs Uscite</CardTitle>
            <CardDescription>Visualizzazione trend finanziari nel tempo</CardDescription>
          </div>
          <div className="flex gap-2" role="status" aria-live="polite">
            <Badge variant="default" className="bg-income text-income-foreground">
              Entrate: {formatCurrency(totalIncome)}
            </Badge>
            <Badge variant="destructive" className="bg-expense text-expense-foreground">
              Uscite: {formatCurrency(totalExpenses)}
            </Badge>
            <Badge variant={netBalance >= 0 ? 'default' : 'destructive'} className={netBalance >= 0 ? 'bg-income text-income-foreground' : 'bg-expense text-expense-foreground'}>
              Saldo: {formatCurrency(netBalance)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div 
            className="flex items-center justify-center h-80 text-muted-foreground"
            role="status"
            aria-label="Nessun dato disponibile per il periodo selezionato"
          >
            Nessun dato disponibile per il periodo selezionato
          </div>
        ) : (
          <div role="img" aria-label={chartAriaLabel}>
            <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEntrate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.75 0.12 85)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="oklch(0.75 0.12 85)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUscite" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.55 0.15 25)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="oklch(0.55 0.15 25)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 240)" opacity={0.5} />
              <XAxis 
                dataKey="date" 
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
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
                formatter={(value) => {
                  if (value === 'entrate') return 'Entrate'
                  if (value === 'uscite') return 'Uscite'
                  return value
                }}
              />
              <Area 
                type="monotone" 
                dataKey="entrate" 
                stroke="oklch(0.75 0.12 85)" 
                strokeWidth={3}
                fill="url(#colorEntrate)"
                name="entrate"
              />
              <Area 
                type="monotone" 
                dataKey="uscite" 
                stroke="oklch(0.55 0.15 25)" 
                strokeWidth={3}
                fill="url(#colorUscite)"
                name="uscite"
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
