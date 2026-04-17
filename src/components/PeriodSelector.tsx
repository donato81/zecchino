import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { soundSystem } from '@/lib/sound-system'
import { useScreenReader } from '@/hooks/use-screen-reader'

type Period = 'week' | 'month' | '3months' | '6months' | 'year'

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
}

const periods: { value: Period; label: string }[] = [
  { value: 'week', label: 'Settimana' },
  { value: 'month', label: 'Mese' },
  { value: '3months', label: '3 Mesi' },
  { value: '6months', label: '6 Mesi' },
  { value: 'year', label: 'Anno' }
]

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const screenReader = useScreenReader()

  const handlePeriodChange = (period: Period) => {
    soundSystem.play('period-change')
    onChange(period)
    const periodLabel = periods.find(p => p.value === period)?.label || period
    screenReader.announcePeriodChange(periodLabel)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-sm text-muted-foreground self-center mr-2">Periodo:</span>
      {periods.map((period) => (
        <Button
          key={period.value}
          onClick={() => handlePeriodChange(period.value)}
          variant={value === period.value ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
          data-focus-info={`Visualizza trend ${period.label.toLowerCase()}`}
        >
          {period.label}
        </Button>
      ))}
    </div>
  )
}
