import { useState } from 'react'
import { hapticSystem } from '@/lib/haptic-system'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Vibrate, SpeakerSimpleHigh, SpeakerSimpleSlash } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function HapticSettings() {
  const [enabled, setEnabled] = useState(hapticSystem.isEnabled())
  const [intensity, setIntensity] = useState(hapticSystem.getIntensity() * 100)
  const isSupported = hapticSystem.isSupported()

  const handleToggleEnabled = (checked: boolean) => {
    hapticSystem.setEnabled(checked)
    setEnabled(checked)
    if (checked && isSupported) {
      hapticSystem.success()
      toast.success('Vibrazione attivata')
    } else if (isSupported) {
      toast.success('Vibrazione disattivata')
    }
  }

  const handleIntensityChange = (value: number[]) => {
    const newIntensity = value[0]
    setIntensity(newIntensity)
    hapticSystem.setIntensity(newIntensity / 100)
  }

  const handleIntensityCommit = () => {
    if (enabled && isSupported) {
      hapticSystem.impact()
    }
  }

  const testVibration = (pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (!enabled || !isSupported) {
      toast.error('La vibrazione è disabilitata')
      return
    }
    hapticSystem.play(pattern)
    toast.success(`Test vibrazione: ${pattern}`)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Vibrate size={24} weight="duotone" className="text-primary" aria-hidden="true" />
          <div className="flex-1">
            <CardTitle>Feedback Tattile</CardTitle>
            <CardDescription>Configura la vibrazione per le azioni dell'app</CardDescription>
          </div>
          {!isSupported && (
            <Badge variant="destructive" className="text-xs">
              Non supportato
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSupported && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <p className="text-sm text-destructive-foreground">
              Il tuo dispositivo o browser non supporta la vibrazione tattile.
              Questa funzionalità è disponibile principalmente su dispositivi mobili.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="haptic-enabled" className="text-base font-medium">
              Abilita Vibrazione
            </Label>
            <p className="text-sm text-muted-foreground">
              Ricevi feedback tattile durante l'utilizzo dell'app
            </p>
          </div>
          <Switch
            id="haptic-enabled"
            checked={enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={!isSupported}
            aria-label="Abilita o disabilita la vibrazione tattile"
          />
        </div>

        <div className="space-y-4 opacity-100 transition-opacity" style={{ opacity: enabled && isSupported ? 1 : 0.5 }}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="haptic-intensity" className="text-base font-medium">
                Intensità
              </Label>
              <Badge variant="secondary" className="text-xs font-mono">
                {Math.round(intensity)}%
              </Badge>
            </div>
            <Slider
              id="haptic-intensity"
              value={[intensity]}
              onValueChange={handleIntensityChange}
              onValueCommit={handleIntensityCommit}
              min={0}
              max={100}
              step={5}
              disabled={!enabled || !isSupported}
              className="w-full"
              aria-label="Regola l'intensità della vibrazione"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <SpeakerSimpleSlash size={14} weight="duotone" aria-hidden="true" />
                Leggera
              </span>
              <span className="flex items-center gap-1">
                <SpeakerSimpleHigh size={14} weight="duotone" aria-hidden="true" />
                Forte
              </span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Test Pattern Vibrazione</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => testVibration('light')}
                variant="outline"
                size="sm"
                disabled={!enabled || !isSupported}
                className="gap-2"
              >
                <Vibrate size={16} weight="duotone" aria-hidden="true" />
                Leggera
              </Button>
              <Button
                onClick={() => testVibration('medium')}
                variant="outline"
                size="sm"
                disabled={!enabled || !isSupported}
                className="gap-2"
              >
                <Vibrate size={16} weight="duotone" aria-hidden="true" />
                Media
              </Button>
              <Button
                onClick={() => testVibration('heavy')}
                variant="outline"
                size="sm"
                disabled={!enabled || !isSupported}
                className="gap-2"
              >
                <Vibrate size={16} weight="duotone" aria-hidden="true" />
                Forte
              </Button>
              <Button
                onClick={() => testVibration('success')}
                variant="outline"
                size="sm"
                disabled={!enabled || !isSupported}
                className="gap-2 text-success border-success/30"
              >
                <Vibrate size={16} weight="duotone" aria-hidden="true" />
                Successo
              </Button>
              <Button
                onClick={() => testVibration('warning')}
                variant="outline"
                size="sm"
                disabled={!enabled || !isSupported}
                className="gap-2 text-warning border-warning/30"
              >
                <Vibrate size={16} weight="duotone" aria-hidden="true" />
                Avviso
              </Button>
              <Button
                onClick={() => testVibration('error')}
                variant="outline"
                size="sm"
                disabled={!enabled || !isSupported}
                className="gap-2 text-destructive border-destructive/30"
              >
                <Vibrate size={16} weight="duotone" aria-hidden="true" />
                Errore
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Vibrate size={16} weight="duotone" className="text-primary" aria-hidden="true" />
              Quando viene utilizzata la vibrazione?
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
              <li>Creazione e eliminazione di conti</li>
              <li>Aggiunta di movimenti (entrate/uscite/trasferimenti)</li>
              <li>Salvataggio e eliminazione dati</li>
              <li>Sblocco conto privato</li>
              <li>Avvisi budget (avvertimento, critico, superato)</li>
              <li>Navigazione tra schede e apertura dialoghi</li>
              <li>Successo o errore nelle operazioni</li>
              <li>Selezione elementi e filtri</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
