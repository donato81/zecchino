import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { soundSystem } from '@/lib/sound-system'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SpeakerHigh, SpeakerSlash, SpeakerLow, SpeakerSimpleHigh, SpeakerSimpleLow, SpeakerSimpleSlash, SpeakerX } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

const VOLUME_PRESETS = [
  { name: 'Silenzioso', value: 10, icon: SpeakerSimpleSlash, variant: 'secondary' as const, description: '10%', key: '1' },
  { name: 'Basso', value: 30, icon: SpeakerSimpleLow, variant: 'outline' as const, description: '30%', key: '2' },
  { name: 'Medio', value: 60, icon: SpeakerLow, variant: 'outline' as const, description: '60%', key: '3' },
  { name: 'Alto', value: 90, icon: SpeakerSimpleHigh, variant: 'outline' as const, description: '90%', key: '4' }
] as const

export function AudioSettings() {
  const screenReader = useScreenReader()
  const [audioEnabled, setAudioEnabled] = useKV<boolean>('audio-enabled', true)
  const [audioVolume, setAudioVolume] = useKV<number>('audio-volume', 0.3)
  
  const [localEnabled, setLocalEnabled] = useState<boolean>(audioEnabled ?? true)
  const [localVolume, setLocalVolume] = useState<number>((audioVolume ?? 0.3) * 100)

  useEffect(() => {
    soundSystem.setEnabled(localEnabled)
    setAudioEnabled(() => localEnabled)
  }, [localEnabled, setAudioEnabled])

  useEffect(() => {
    const normalizedVolume = localVolume / 100
    soundSystem.setVolume(normalizedVolume)
    setAudioVolume(() => normalizedVolume)
  }, [localVolume, setAudioVolume])

  const handleToggleAudio = () => {
    setLocalEnabled((current) => !current)
    if (!localEnabled) {
      soundSystem.play('settings-change')
      toast.success('Audio abilitato')
      screenReader.announceToggleState('Audio', true)
      setTimeout(() => soundSystem.play('success'), 100)
    } else {
      toast.success('Audio disabilitato')
      screenReader.announceToggleState('Audio', false)
    }
  }

  const handleVolumeChange = (values: number[]) => {
    setLocalVolume(values[0])
    soundSystem.play('volume-change')
    screenReader.announceVolumeChange(values[0], false)
  }

  const handleTestSound = () => {
    soundSystem.play('notification')
    toast('Suono di test riprodotto')
  }

  const handlePresetVolume = (value: number) => {
    setLocalVolume(value)
    soundSystem.play('preset-applied')
    const presetName = VOLUME_PRESETS.find(p => p.value === value)?.name || 'personalizzato'
    toast.success(`Volume impostato: ${presetName} (${value}%)`)
    screenReader.announcePresetApplied(`${presetName} - ${value}%`)
  }

  useKeyboardShortcuts(
    VOLUME_PRESETS.map((preset) => ({
      key: preset.key,
      alt: true,
      callback: () => {
        if (localEnabled) {
          handlePresetVolume(preset.value)
        } else {
          toast.warning(`Audio disabilitato. Abilita l'audio per usare i preset di volume.`)
        }
      },
      description: `Set volume to ${preset.name} (${preset.value}%)`
    })),
    true
  )

  const getVolumeIcon = () => {
    if (!localEnabled) return <SpeakerSlash size={20} weight="duotone" />
    if (localVolume === 0) return <SpeakerSlash size={20} weight="duotone" />
    if (localVolume < 33) return <SpeakerLow size={20} weight="duotone" />
    if (localVolume < 66) return <SpeakerHigh size={20} weight="duotone" />
    return <SpeakerSimpleHigh size={20} weight="duotone" />
  }

  const getCurrentPreset = () => {
    return VOLUME_PRESETS.find(p => p.value === localVolume)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getVolumeIcon()}
          Impostazioni Audio
        </CardTitle>
        <CardDescription>
          Gestisci i suoni e il volume dell'applicazione
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="audio-enabled" className="text-base font-medium">
              Effetti sonori
            </Label>
            <p className="text-sm text-muted-foreground">
              {localEnabled ? 'I suoni sono abilitati' : 'I suoni sono disabilitati'}
            </p>
          </div>
          <Switch
            id="audio-enabled"
            checked={localEnabled}
            onCheckedChange={handleToggleAudio}
            aria-label={localEnabled ? 'Disabilita audio' : 'Abilita audio'}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Preset Volume</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Usa Alt+1, Alt+2, Alt+3, Alt+4 per cambiare rapidamente il volume
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {VOLUME_PRESETS.map((preset) => {
                const Icon = preset.icon
                const isActive = getCurrentPreset()?.value === preset.value
                return (
                  <Button
                    key={preset.name}
                    onClick={() => handlePresetVolume(preset.value)}
                    variant={isActive ? 'default' : preset.variant}
                    size="sm"
                    disabled={!localEnabled}
                    className="gap-2 flex-col h-auto py-3 relative"
                    data-focus-info={`Preset ${preset.name}: ${preset.description} - Scorciatoia Alt+${preset.key}`}
                  >
                    <Icon size={20} weight="duotone" />
                    <span className="text-xs font-medium">{preset.name}</span>
                    <span className="text-[10px] opacity-75">{preset.description}</span>
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-1 -right-1 h-4 px-1 text-[9px]"
                    >
                      Alt+{preset.key}
                    </Badge>
                    {isActive && (
                      <Badge 
                        variant="secondary" 
                        className="absolute -bottom-1 -right-1 h-4 px-1 text-[9px] bg-accent text-accent-foreground"
                      >
                        Attivo
                      </Badge>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="volume-slider" className="text-base font-medium">
                Volume Personalizzato
              </Label>
              <span className="text-sm font-mono text-muted-foreground">
                {Math.round(localVolume)}%
              </span>
            </div>
            <div className="flex items-center gap-4">
              <SpeakerX size={18} className="text-muted-foreground shrink-0" />
              <Slider
                id="volume-slider"
                value={[localVolume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={100}
                step={1}
                disabled={!localEnabled}
                className="flex-1"
                aria-label={`Volume: ${Math.round(localVolume)}%`}
              />
              <SpeakerSimpleHigh size={18} className="text-muted-foreground shrink-0" />
            </div>
          </div>
        </div>

        <Button
          onClick={handleTestSound}
          variant="outline"
          className="w-full gap-2"
          disabled={!localEnabled}
        >
          <SpeakerHigh size={18} weight="duotone" />
          Prova Suono
        </Button>
      </CardContent>
    </Card>
  )
}
