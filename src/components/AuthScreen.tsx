import { useAuth } from '@/context/AuthContext'
import { SkipLink } from '@/components/SkipLink'
import { PinDialog } from '@/components/PinDialog'

export function AuthScreen() {
  const { showPinDialog, isSetupMode, handleGlobalPinSubmit } = useAuth()

  return (
    <>
      <SkipLink />
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background touch-manipulation"
        role="main"
        aria-label="Schermata di autenticazione Zecchino"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-secondary/80 to-accent/90" aria-hidden="true"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.12),transparent_60%)]" aria-hidden="true"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" aria-hidden="true"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)] animate-pulse" style={{ animationDuration: '4s' }} aria-hidden="true"></div>
        <PinDialog
          open={showPinDialog}
          title={isSetupMode ? 'Imposta PIN Globale' : 'Inserisci PIN'}
          description={isSetupMode ? 'Crea un PIN per proteggere l\'applicazione' : 'Inserisci il tuo PIN per accedere'}
          onSubmit={handleGlobalPinSubmit}
          confirmMode={isSetupMode}
        />
      </div>
    </>
  )
}