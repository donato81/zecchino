import { ArrowCounterClockwise, Keyboard, WarningCircle } from '@phosphor-icons/react'
import { useAppData } from '@/context/AppDataContext'
import { useVisibleData } from '@/context/VisibleDataContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { hapticSystem } from '@/lib/haptic-system'
import { formatCurrency } from '@/lib/helpers'
import { soundSystem } from '@/lib/sound-system'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function AppHeader() {
  const { error, isLoading, refreshAll, setShowKeyboardHelp } = useAppData()
  const { totalBalance, visibleAccounts } = useVisibleData()
  const { isOffline } = useOnlineStatus()
  const isMobile = useIsMobile()
  const showOfflineBanner = isOffline || error?.startsWith('Modalità offline') === true

  return (
    <header
      className="border-b border-primary/30 bg-card/90 backdrop-blur-lg sticky top-0 z-10 shadow-lg shadow-primary/10"
      role="banner"
      aria-label="Intestazione principale applicazione Zecchino"
    >
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-5">
        {showOfflineBanner ? (
          <div
            className="mb-3 flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-50 via-background to-amber-100/70 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-amber-600" aria-hidden="true">
                <WarningCircle size={20} weight="fill" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-amber-900">Modalità offline</p>
                  <Badge variant="outline" className="border-amber-300 bg-amber-100/70 text-amber-900">
                    sola lettura
                  </Badge>
                </div>
                <p className="text-sm text-amber-950/90">
                  {error?.startsWith('Modalità offline')
                    ? error
                    : 'Stai vedendo dati salvati in precedenza. Riconnettiti per aggiornare i contenuti.'}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="border-amber-400/60 bg-background/70 text-amber-900 hover:bg-amber-100"
              disabled={isOffline || isLoading}
              onClick={() => {
                soundSystem.play('dialog-open')
                hapticSystem.dialogOpen()
                refreshAll()
              }}
            >
              <ArrowCounterClockwise size={18} weight="duotone" aria-hidden="true" />
              Aggiorna ora
            </Button>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg shadow-primary/30 ring-2 ring-primary/40 flex-shrink-0">
              <span className="text-xl sm:text-2xl font-bold text-primary-foreground drop-shadow-md" aria-hidden="true">Z</span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent drop-shadow-sm truncate"
              id="app-title"
            >
              Zecchino
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0" role="region" aria-label="Informazioni saldo e azioni rapide">
            {!isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      soundSystem.play('dialog-open')
                      hapticSystem.dialogOpen()
                      setShowKeyboardHelp(true)
                    }}
                    aria-label="Mostra scorciatoie da tastiera. Apre finestra di dialogo con elenco comandi tastiera disponibili."
                    className="hidden sm:inline-flex hover:bg-accent/30 hover:text-accent transition-all hover:shadow-md hover:shadow-accent/20"
                  >
                    <Keyboard size={20} weight="duotone" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent variant="accent">
                  <div className="space-y-0.5">
                    <p className="font-semibold">Scorciatoie da Tastiera</p>
                    <p className="text-xs opacity-90">Premi ? per visualizzare tutti i comandi</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="text-right cursor-help bg-gradient-to-br from-card to-primary/10 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-primary/30 shadow-md shadow-primary/10 min-w-0"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label={`Saldo totale: ${formatCurrency(totalBalance)}`}
                >
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider" id="total-balance-label">
                    {isMobile ? 'Saldo' : 'Saldo Totale'}
                  </p>
                  <p
                    className={`text-lg sm:text-2xl font-mono font-bold ${totalBalance < 0 ? 'text-destructive drop-shadow-md' : 'bg-gradient-to-r from-income via-success to-accent bg-clip-text text-transparent drop-shadow-sm'} truncate`}
                    aria-labelledby="total-balance-label"
                  >
                    {formatCurrency(totalBalance)}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent variant={totalBalance < 0 ? 'destructive' : 'success'}>
                <div className="space-y-0.5">
                  <p className="font-semibold">Saldo Consolidato</p>
                  <p className="text-xs opacity-90">
                    Somma di tutti i conti visibili ({visibleAccounts.length} {visibleAccounts.length === 1 ? 'conto' : 'conti'})
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  )
}