import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { soundSystem } from '@/lib/sound-system'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { SpeakerHigh, SpeakerSlash, SpeakerLow, SpeakerSimpleHigh } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function AudioSettings() {
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
      toast.success('Audio abilitato')
      setTimeout(() => soundSystem.play('success'), 100)
    } else {
      toast.success('Audio disabilitato')
    }
  }

  const handleVolumeChange = (values: number[]) => {
    setLocalVolume(values[0])
  }

  const handleTestSound = () => {
    soundSystem.play('notification')
    toast('Suono di test riprodotto')
  }

  const getVolumeIcon = () => {
    if (!localEnabled) return <SpeakerSlash size={20} weight="duotone" />
    if (localVolume === 0) return <SpeakerSlash size={20} weight="duotone" />
    if (localVolume < 33) return <SpeakerLow size={20} weight="duotone" />
    if (localVolume < 66) return <SpeakerHigh size={20} weight="duotone" />
    return <SpeakerSimpleHigh size={20} weight="duotone" />
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="volume-slider" className="text-base font-medium">
              Volume
            </Label>
            <span className="text-sm font-mono text-muted-foreground">
              {Math.round(localVolume)}%
            </span>
          </div>
          <div className="flex items-center gap-4">
            <SpeakerSlash size={18} className="text-muted-foreground shrink-0" />
            <Slider
              id="volume-slider"
              value={[localVolume]}
              onValueChange={handleVolumeChange}
              min={0}
              max={100}
              step={5}
              disabled={!localEnabled}
              className="flex-1"
              aria-label={`Volume: ${Math.round(localVolume)}%`}
            />
            <SpeakerSimpleHigh size={18} className="text-muted-foreground shrink-0" />
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
