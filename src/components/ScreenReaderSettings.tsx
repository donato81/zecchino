import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { SpeakerHigh, TextAa } from '@phosphor-icons/react'
import { soundSystem } from '@/lib/sound-system'
import { toast } from 'sonner'

type VerbosityLevel = 'conciso' | 'normale' | 'verboso'

interface VerbosityOption {
  value: VerbosityLevel
  label: string
  description: string
  example: string
}

const verbosityOptions: VerbosityOption[] = [
  {
    value: 'conciso',
    label: 'Conciso',
    description: 'Solo informazioni essenziali',
    example: 'Movimento aggiunto: €50,00'
  },
  {
    value: 'normale',
    label: 'Normale',
    description: 'Informazioni standard con contesto',
    example: 'Movimento uscita: €50,00 su Conto Corrente'
  },
  {
    value: 'verboso',
    label: 'Verboso',
    description: 'Tutte le informazioni disponibili',
    example: 'Movimento uscita: €50,00 su Conto Corrente, categoria Spesa alimentare, data 15 gennaio 2025'
  }
]

export function ScreenReaderSettings() {
  const screenReader = useScreenReader()
  const [verbosityLevel, setVerbosityLevel] = useKV<VerbosityLevel>('sr-verbosity', 'normale')
  const [announceNavigation, setAnnounceNavigation] = useKV<boolean>('sr-announce-navigation', true)
  const [announceFilters, setAnnounceFilters] = useKV<boolean>('sr-announce-filters', true)
  const [announceFormChanges, setAnnounceFormChanges] = useKV<boolean>('sr-announce-form-changes', false)

  const [localVerbosity, setLocalVerbosity] = useState<VerbosityLevel>(verbosityLevel || 'normale')
  const [localAnnounceNav, setLocalAnnounceNav] = useState<boolean>(announceNavigation ?? true)
  const [localAnnounceFilters, setLocalAnnounceFilters] = useState<boolean>(announceFilters ?? true)
  const [localAnnounceFormChanges, setLocalAnnounceFormChanges] = useState<boolean>(announceFormChanges ?? false)

  useEffect(() => {
    setVerbosityLevel(() => localVerbosity)
  }, [localVerbosity, setVerbosityLevel])

  useEffect(() => {
    setAnnounceNavigation(() => localAnnounceNav)
  }, [localAnnounceNav, setAnnounceNavigation])

  useEffect(() => {
    setAnnounceFilters(() => localAnnounceFilters)
  }, [localAnnounceFilters, setAnnounceFilters])

  useEffect(() => {
    setAnnounceFormChanges(() => localAnnounceFormChanges)
  }, [localAnnounceFormChanges, setAnnounceFormChanges])

  const handleVerbosityChange = (value: VerbosityLevel) => {
    setLocalVerbosity(value)
    soundSystem.play('settings-change')
    const option = verbosityOptions.find(o => o.value === value)
    toast.success(`Verbosità impostata: ${option?.label}`)
    screenReader.announce(`Livello di verbosità impostato a ${option?.label}. ${option?.description}`, 'polite')
  }

  const handleToggleNavigation = () => {
    setLocalAnnounceNav((current) => {
      const newValue = !current
      soundSystem.play('settings-change')
      if (newValue) {
        toast.success('Annunci di navigazione abilitati')
        screenReader.announceToggleState('Annunci di navigazione', true)
      } else {
        toast.success('Annunci di navigazione disabilitati')
      }
      return newValue
    })
  }

  const handleToggleFilters = () => {
    setLocalAnnounceFilters((current) => {
      const newValue = !current
      soundSystem.play('settings-change')
      if (newValue) {
        toast.success('Annunci filtri abilitati')
        screenReader.announceToggleState('Annunci filtri', true)
      } else {
        toast.success('Annunci filtri disabilitati')
      }
      return newValue
    })
  }

  const handleToggleFormChanges = () => {
    setLocalAnnounceFormChanges((current) => {
      const newValue = !current
      soundSystem.play('settings-change')
      if (newValue) {
        toast.success('Annunci modifiche form abilitati')
        screenReader.announceToggleState('Annunci modifiche form', true)
      } else {
        toast.success('Annunci modifiche form disabilitati')
      }
      return newValue
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TextAa size={20} weight="duotone" />
          Impostazioni Screen Reader
        </CardTitle>
        <CardDescription>
          Personalizza il comportamento degli annunci vocali
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium mb-3 block">
              Livello di Verbosità
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              Scegli quante informazioni includere negli annunci vocali
            </p>
          </div>
          
          <RadioGroup
            value={localVerbosity}
            onValueChange={(value) => handleVerbosityChange(value as VerbosityLevel)}
            className="space-y-3"
          >
            {verbosityOptions.map((option) => (
              <div key={option.value} className="flex items-start space-x-3">
                <RadioGroupItem
                  value={option.value}
                  id={`verbosity-${option.value}`}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={`verbosity-${option.value}`}
                    className="font-medium cursor-pointer flex items-center gap-2"
                  >
                    {option.label}
                    {localVerbosity === option.value && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        Attivo
                      </Badge>
                    )}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                  <p className="text-xs text-muted-foreground italic mt-1 pl-3 border-l-2 border-muted">
                    Esempio: {option.example}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-medium">Annunci Specifici</Label>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="announce-navigation" className="font-medium">
                Annunci di Navigazione
              </Label>
              <p className="text-sm text-muted-foreground">
                Annuncia quando cambi scheda o sezione
              </p>
            </div>
            <Switch
              id="announce-navigation"
              checked={localAnnounceNav}
              onCheckedChange={handleToggleNavigation}
              aria-label={localAnnounceNav ? 'Disabilita annunci di navigazione' : 'Abilita annunci di navigazione'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="announce-filters" className="font-medium">
                Annunci Filtri
              </Label>
              <p className="text-sm text-muted-foreground">
                Annuncia quando attivi o disattivi filtri categorie
              </p>
            </div>
            <Switch
              id="announce-filters"
              checked={localAnnounceFilters}
              onCheckedChange={handleToggleFilters}
              aria-label={localAnnounceFilters ? 'Disabilita annunci filtri' : 'Abilita annunci filtri'}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="announce-form-changes" className="font-medium">
                Annunci Modifiche Form
              </Label>
              <p className="text-sm text-muted-foreground">
                Annuncia ogni modifica nei campi dei moduli (può essere verbose)
              </p>
            </div>
            <Switch
              id="announce-form-changes"
              checked={localAnnounceFormChanges}
              onCheckedChange={handleToggleFormChanges}
              aria-label={localAnnounceFormChanges ? 'Disabilita annunci modifiche form' : 'Abilita annunci modifiche form'}
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Nota:</strong> Queste impostazioni influenzano solo 
            gli annunci vocali per screen reader. I messaggi toast visibili non vengono modificati.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
