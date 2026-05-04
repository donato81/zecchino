import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTalkBack } from '@/hooks/use-talkback'
import type { TalkBackAdaptations } from '@/lib/supabase/types'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { soundSystem } from '@/lib/sound-system'
import { hapticSystem } from '@/lib/haptic-system'
import { DeviceMobile, Eye, Timer, ChatText, Palette, FilmStrip, CursorClick, SpeakerHigh, ArrowCounterClockwise, CheckCircle, WarningCircle, Info } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function TalkBackSettings() {
  const { 
    talkBackState, 
    adaptations,
    enableTalkBack,
    disableTalkBack,
    resetDetection,
    updateAdaptation,
    resetAdaptations
  } = useTalkBack()
  const screenReader = useScreenReader()

  const handleToggleTalkBack = (enabled: boolean) => {
    if (enabled) {
      enableTalkBack(true)
      soundSystem.play('unlock')
      hapticSystem.unlock()
      toast.success('Modalità TalkBack attivata manualmente')
      screenReader.announceSuccess('Modalità TalkBack attivata manualmente. Tutte le ottimizzazioni per screen reader sono ora attive.')
    } else {
      disableTalkBack(true)
      soundSystem.play('save')
      hapticSystem.save()
      toast.success('Modalità TalkBack disattivata')
      screenReader.announceSuccess('Modalità TalkBack disattivata. Interfaccia standard ripristinata.')
    }
  }

  const handleResetDetection = () => {
    resetDetection()
    soundSystem.play('notification')
    hapticSystem.save()
    toast.success('Rilevamento TalkBack azzerato')
    screenReader.announceSuccess('Rilevamento TalkBack azzerato. Il sistema rileverà automaticamente lo stato di TalkBack.')
  }

  const handleResetAdaptations = () => {
    resetAdaptations()
    soundSystem.play('notification')
    hapticSystem.save()
    toast.success('Ottimizzazioni ripristinate ai valori predefiniti')
    screenReader.announceSuccess('Tutte le ottimizzazioni TalkBack sono state ripristinate ai valori predefiniti.')
  }

  const handleAdaptationChange = (key: keyof TalkBackAdaptations, value: boolean, label: string) => {
    updateAdaptation(key, value)
    soundSystem.play('click')
    hapticSystem.buttonPress()
    const action = value ? 'attivata' : 'disattivata'
    toast.success(`${label} ${action}`)
    screenReader.announceToggleState(label, value)
  }

  const getConfidenceBadge = () => {
    const { confidenceLevel, isDetected } = talkBackState
    
    if (!isDetected) {
      return (
        <Badge variant="secondary" className="gap-1.5">
          <Info size={14} weight="fill" />
          Non rilevato
        </Badge>
      )
    }

    if (confidenceLevel === 'high') {
      return (
        <Badge variant="secondary" className="gap-1.5 bg-success/10 text-success border-success/20">
          <CheckCircle size={14} weight="fill" />
          Alta affidabilità
        </Badge>
      )
    } else if (confidenceLevel === 'medium') {
      return (
        <Badge variant="secondary" className="gap-1.5 bg-warning/10 text-warning border-warning/20">
          <WarningCircle size={14} weight="fill" />
          Media affidabilità
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="gap-1.5">
          <Info size={14} weight="fill" />
          Bassa affidabilità
        </Badge>
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="flex items-center gap-2">
              <DeviceMobile size={24} weight="duotone" className="text-primary" aria-hidden="true" />
              Rilevamento Automatico TalkBack
            </CardTitle>
            <CardDescription>
              L'applicazione rileva automaticamente quando TalkBack è attivo e adatta l'interfaccia per un'esperienza ottimale
            </CardDescription>
          </div>
          {getConfidenceBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="talkback-enabled" className="text-base font-medium cursor-pointer">
                Stato TalkBack
              </Label>
              <p className="text-sm text-muted-foreground">
                {talkBackState.isEnabled 
                  ? 'Modalità TalkBack attiva - Interfaccia ottimizzata per screen reader'
                  : 'Modalità standard - Interfaccia predefinita'}
              </p>
            </div>
            <Switch
              id="talkback-enabled"
              checked={talkBackState.isEnabled}
              onCheckedChange={handleToggleTalkBack}
              aria-label={`Modalità TalkBack ${talkBackState.isEnabled ? 'attiva' : 'disattivata'}. Attiva questo interruttore per abilitare manualmente le ottimizzazioni per screen reader.`}
              aria-describedby="talkback-status-description"
            />
          </div>
          <p id="talkback-status-description" className="text-xs text-muted-foreground">
            Quando attivo, l'interfaccia applica automaticamente: target touch più grandi, navigazione semplificata, 
            descrizioni verbali estese, animazioni ridotte e gestione automatica del focus.
          </p>
        </div>

        {talkBackState.isDetected && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <CheckCircle size={18} weight="fill" className="text-primary" />
              TalkBack rilevato automaticamente
            </p>
            <p className="text-xs text-muted-foreground">
              Il sistema ha rilevato indicatori che suggeriscono l'uso di TalkBack. 
              Livello di affidabilità: <strong>{talkBackState.confidenceLevel}</strong>.
            </p>
          </div>
        )}

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Ottimizzazioni Interfaccia</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAdaptations}
              className="gap-2"
              aria-label="Ripristina tutte le ottimizzazioni ai valori predefiniti"
            >
              <ArrowCounterClockwise size={16} weight="duotone" />
              Ripristina
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-0.5">
                <Label htmlFor="enhanced-targets" className="flex items-center gap-2 cursor-pointer">
                  <CursorClick size={18} weight="duotone" className="text-primary" aria-hidden="true" />
                  <span>Target Touch Maggiorati</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aumenta le dimensioni dei pulsanti e degli elementi cliccabili da 44px a 56px
                </p>
              </div>
              <Switch
                id="enhanced-targets"
                checked={adaptations?.enhancedTouchTargets ?? true}
                onCheckedChange={(checked) => handleAdaptationChange('enhancedTouchTargets', checked, 'Target touch maggiorati')}
                disabled={!talkBackState.isEnabled}
                aria-label="Target touch maggiorati. Quando attivo, tutti i pulsanti e gli elementi interattivi hanno dimensioni minime di 56 pixel."
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-0.5">
                <Label htmlFor="simplified-nav" className="flex items-center gap-2 cursor-pointer">
                  <Eye size={18} weight="duotone" className="text-primary" aria-hidden="true" />
                  <span>Navigazione Semplificata</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Riduce la complessità della navigazione rimuovendo elementi decorativi
                </p>
              </div>
              <Switch
                id="simplified-nav"
                checked={adaptations?.simplifiedNavigation ?? true}
                onCheckedChange={(checked) => handleAdaptationChange('simplifiedNavigation', checked, 'Navigazione semplificata')}
                disabled={!talkBackState.isEnabled}
                aria-label="Navigazione semplificata. Rimuove elementi decorativi e semplifica la struttura della pagina."
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-0.5">
                <Label htmlFor="extended-timeouts" className="flex items-center gap-2 cursor-pointer">
                  <Timer size={18} weight="duotone" className="text-primary" aria-hidden="true" />
                  <span>Timeout Estesi</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Raddoppia i tempi di timeout per consentire interazioni più lente
                </p>
              </div>
              <Switch
                id="extended-timeouts"
                checked={adaptations?.extendedTimeouts ?? true}
                onCheckedChange={(checked) => handleAdaptationChange('extendedTimeouts', checked, 'Timeout estesi')}
                disabled={!talkBackState.isEnabled}
                aria-label="Timeout estesi. Raddoppia i tempi di timeout per messaggi, notifiche e interazioni automatiche."
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-0.5">
                <Label htmlFor="verbose-descriptions" className="flex items-center gap-2 cursor-pointer">
                  <ChatText size={18} weight="duotone" className="text-primary" aria-hidden="true" />
                  <span>Descrizioni Verbali Estese</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Usa descrizioni ARIA più dettagliate per ogni elemento dell'interfaccia
                </p>
              </div>
              <Switch
                id="verbose-descriptions"
                checked={adaptations?.verboseDescriptions ?? true}
                onCheckedChange={(checked) => handleAdaptationChange('verboseDescriptions', checked, 'Descrizioni verbali estese')}
                disabled={!talkBackState.isEnabled}
                aria-label="Descrizioni verbali estese. Fornisce informazioni più dettagliate su ogni elemento per screen reader."
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-0.5">
                <Label htmlFor="high-contrast" className="flex items-center gap-2 cursor-pointer">
                  <Palette size={18} weight="duotone" className="text-primary" aria-hidden="true" />
                  <span>Modalità Alto Contrasto</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aumenta il contrasto dei colori per una migliore leggibilità
                </p>
              </div>
              <Switch
                id="high-contrast"
                checked={adaptations?.highContrastMode ?? false}
                onCheckedChange={(checked) => handleAdaptationChange('highContrastMode', checked, 'Modalità alto contrasto')}
                disabled={!talkBackState.isEnabled}
                aria-label="Modalità alto contrasto. Aumenta il contrasto tra testo e sfondo per facilitare la lettura."
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-0.5">
                <Label htmlFor="reduced-motion" className="flex items-center gap-2 cursor-pointer">
                  <FilmStrip size={18} weight="duotone" className="text-primary" aria-hidden="true" />
                  <span>Animazioni Ridotte</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Riduce del 50% la durata delle animazioni per evitare distrazioni
                </p>
              </div>
              <Switch
                id="reduced-motion"
                checked={adaptations?.reducedMotion ?? true}
                onCheckedChange={(checked) => handleAdaptationChange('reducedMotion', checked, 'Animazioni ridotte')}
                disabled={!talkBackState.isEnabled}
                aria-label="Animazioni ridotte. Riduce la durata e l'intensità di tutte le animazioni dell'interfaccia."
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-0.5">
                <Label htmlFor="auto-focus" className="flex items-center gap-2 cursor-pointer">
                  <Eye size={18} weight="duotone" className="text-primary" aria-hidden="true" />
                  <span>Gestione Automatica del Focus</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Sposta automaticamente il focus sugli elementi importanti (dialoghi, errori, conferme)
                </p>
              </div>
              <Switch
                id="auto-focus"
                checked={adaptations?.autoFocusManagement ?? true}
                onCheckedChange={(checked) => handleAdaptationChange('autoFocusManagement', checked, 'Gestione automatica del focus')}
                disabled={!talkBackState.isEnabled}
                aria-label="Gestione automatica del focus. Il sistema sposta automaticamente il focus su elementi importanti quando cambiano."
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1 space-y-0.5">
                <Label htmlFor="spatial-audio" className="flex items-center gap-2 cursor-pointer">
                  <SpeakerHigh size={18} weight="duotone" className="text-primary" aria-hidden="true" />
                  <span>Audio Spaziale</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Usa feedback audio direzionali per indicare la posizione degli elementi
                </p>
              </div>
              <Switch
                id="spatial-audio"
                checked={adaptations?.spatialAudio ?? true}
                onCheckedChange={(checked) => handleAdaptationChange('spatialAudio', checked, 'Audio spaziale')}
                disabled={!talkBackState.isEnabled}
                aria-label="Audio spaziale. Usa suoni direzionali per indicare la posizione relativa degli elementi nell'interfaccia."
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleResetDetection}
            className="gap-2 flex-1"
            aria-label="Azzera rilevamento TalkBack. Il sistema ricomincerà a rilevare automaticamente lo stato di TalkBack."
          >
            <ArrowCounterClockwise size={18} weight="duotone" />
            Azzera Rilevamento
          </Button>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <p className="text-xs font-medium flex items-center gap-2">
            <Info size={16} weight="fill" className="text-primary" />
            Informazioni sul Rilevamento
          </p>
          <p className="text-xs text-muted-foreground">
            Il sistema rileva TalkBack analizzando: preferenze di animazione ridotta, user agent Android, 
            eventi touch, API speech synthesis e pattern comportamentali. Il rilevamento avviene automaticamente 
            ogni 30 secondi.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
