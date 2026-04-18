import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { SpeakerHigh, TextAa, Info, CheckCircle } from '@phosphor-icons/react'
import { soundSystem } from '@/lib/sound-system'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
  const [announceKeyboardShortcuts, setAnnounceKeyboardShortcuts] = useKV<boolean>('sr-announce-shortcuts', true)
  const [announceBalanceChanges, setAnnounceBalanceChanges] = useKV<boolean>('sr-announce-balance-changes', true)
  const [announceBudgetAlerts, setAnnounceBudgetAlerts] = useKV<boolean>('sr-announce-budget-alerts', true)
  const [announceProgress, setAnnounceProgress] = useKV<boolean>('sr-announce-progress', true)
  const [announceFocusChanges, setAnnounceFocusChanges] = useKV<boolean>('sr-announce-focus-changes', false)
  const [announceListPosition, setAnnounceListPosition] = useKV<boolean>('sr-announce-list-position', true)
  const [announceDelay, setAnnounceDelay] = useKV<number>('sr-announce-delay', 100)
  const [reducedAnnouncements, setReducedAnnouncements] = useKV<boolean>('sr-reduced-announcements', false)

  const [localVerbosity, setLocalVerbosity] = useState<VerbosityLevel>(verbosityLevel || 'normale')
  const [localAnnounceNav, setLocalAnnounceNav] = useState<boolean>(announceNavigation ?? true)
  const [localAnnounceFilters, setLocalAnnounceFilters] = useState<boolean>(announceFilters ?? true)
  const [localAnnounceFormChanges, setLocalAnnounceFormChanges] = useState<boolean>(announceFormChanges ?? false)
  const [localAnnounceShortcuts, setLocalAnnounceShortcuts] = useState<boolean>(announceKeyboardShortcuts ?? true)
  const [localAnnounceBalance, setLocalAnnounceBalance] = useState<boolean>(announceBalanceChanges ?? true)
  const [localAnnounceBudget, setLocalAnnounceBudget] = useState<boolean>(announceBudgetAlerts ?? true)
  const [localAnnounceProgress, setLocalAnnounceProgress] = useState<boolean>(announceProgress ?? true)
  const [localAnnounceFocus, setLocalAnnounceFocus] = useState<boolean>(announceFocusChanges ?? false)
  const [localAnnounceListPos, setLocalAnnounceListPos] = useState<boolean>(announceListPosition ?? true)
  const [localAnnounceDelay, setLocalAnnounceDelay] = useState<number>(announceDelay ?? 100)
  const [localReducedAnnouncements, setLocalReducedAnnouncements] = useState<boolean>(reducedAnnouncements ?? false)

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

  useEffect(() => {
    setAnnounceKeyboardShortcuts(() => localAnnounceShortcuts)
  }, [localAnnounceShortcuts, setAnnounceKeyboardShortcuts])

  useEffect(() => {
    setAnnounceBalanceChanges(() => localAnnounceBalance)
  }, [localAnnounceBalance, setAnnounceBalanceChanges])

  useEffect(() => {
    setAnnounceBudgetAlerts(() => localAnnounceBudget)
  }, [localAnnounceBudget, setAnnounceBudgetAlerts])

  useEffect(() => {
    setAnnounceProgress(() => localAnnounceProgress)
  }, [localAnnounceProgress, setAnnounceProgress])

  useEffect(() => {
    setAnnounceFocusChanges(() => localAnnounceFocus)
  }, [localAnnounceFocus, setAnnounceFocusChanges])

  useEffect(() => {
    setAnnounceListPosition(() => localAnnounceListPos)
  }, [localAnnounceListPos, setAnnounceListPosition])

  useEffect(() => {
    setAnnounceDelay(() => localAnnounceDelay)
  }, [localAnnounceDelay, setAnnounceDelay])

  useEffect(() => {
    setReducedAnnouncements(() => localReducedAnnouncements)
  }, [localReducedAnnouncements, setReducedAnnouncements])

  const handleVerbosityChange = (value: VerbosityLevel) => {
    setLocalVerbosity(value)
    soundSystem.play('settings-change')
    const option = verbosityOptions.find(o => o.value === value)
    toast.success(`Verbosità impostata: ${option?.label}`)
    screenReader.announce(`Livello di verbosità impostato a ${option?.label}. ${option?.description}`, 'polite')
  }

  const handleToggle = (
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    name: string
  ) => {
    setter((current) => {
      const newValue = !current
      soundSystem.play('settings-change')
      if (newValue) {
        toast.success(`${name} abilitati`)
        screenReader.announceToggleState(name, true)
      } else {
        toast.success(`${name} disabilitati`)
        screenReader.announceToggleState(name, false)
      }
      return newValue
    })
  }

  const handleDelayChange = (values: number[]) => {
    setLocalAnnounceDelay(values[0])
    soundSystem.play('volume-change')
  }

  const handleTestAnnouncement = () => {
    screenReader.announce('Questo è un annuncio di test per verificare le impostazioni dello screen reader', 'polite')
    soundSystem.play('test-sound')
    toast('Annuncio di test inviato allo screen reader')
  }

  const handleResetToDefaults = () => {
    setLocalVerbosity('normale')
    setLocalAnnounceNav(true)
    setLocalAnnounceFilters(true)
    setLocalAnnounceFormChanges(false)
    setLocalAnnounceShortcuts(true)
    setLocalAnnounceBalance(true)
    setLocalAnnounceBudget(true)
    setLocalAnnounceProgress(true)
    setLocalAnnounceFocus(false)
    setLocalAnnounceListPos(true)
    setLocalAnnounceDelay(100)
    setLocalReducedAnnouncements(false)
    
    soundSystem.play('settings-reset')
    toast.success('Impostazioni screen reader ripristinate ai valori predefiniti')
    screenReader.announce('Tutte le impostazioni dello screen reader sono state ripristinate ai valori predefiniti', 'polite')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <TextAa size={20} weight="duotone" />
              Impostazioni Screen Reader
            </CardTitle>
            <CardDescription>
              Personalizza il comportamento degli annunci vocali per screen reader
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 cursor-help">
                <Info size={12} weight="fill" />
                Aiuto
              </Badge>
            </TooltipTrigger>
            <TooltipContent variant="accent" className="max-w-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold">Informazioni Screen Reader</p>
                <p className="text-xs opacity-90">
                  Queste impostazioni controllano come e quando lo screen reader annuncia le informazioni.
                  Personalizza in base alle tue preferenze di accessibilità.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
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

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Modalità Ridotta</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={16} className="text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent variant="accent" className="max-w-xs">
                <p className="text-xs">
                  Attiva per ridurre la frequenza degli annunci e ricevere solo le informazioni critiche
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="reduced-announcements" className="font-medium">
                Annunci Ridotti
              </Label>
              <p className="text-sm text-muted-foreground">
                Ricevi solo annunci essenziali e critici
              </p>
            </div>
            <Switch
              id="reduced-announcements"
              checked={localReducedAnnouncements}
              onCheckedChange={() => handleToggle(setLocalReducedAnnouncements, 'Annunci ridotti')}
              aria-label={localReducedAnnouncements ? 'Disabilita annunci ridotti' : 'Abilita annunci ridotti'}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <Label className="text-base font-medium">Annunci Specifici</Label>
          <p className="text-sm text-muted-foreground -mt-2">
            Scegli quali tipi di informazioni devono essere annunciate
          </p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1 mr-3">
                <Label htmlFor="announce-navigation" className="font-medium text-sm">
                  Navigazione
                </Label>
                <p className="text-xs text-muted-foreground">
                  Quando cambi scheda o sezione
                </p>
              </div>
              <Switch
                id="announce-navigation"
                checked={localAnnounceNav}
                onCheckedChange={() => handleToggle(setLocalAnnounceNav, 'Annunci di navigazione')}
                aria-label={localAnnounceNav ? 'Disabilita annunci di navigazione' : 'Abilita annunci di navigazione'}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1 mr-3">
                <Label htmlFor="announce-filters" className="font-medium text-sm">
                  Filtri
                </Label>
                <p className="text-xs text-muted-foreground">
                  Attivazione/disattivazione filtri
                </p>
              </div>
              <Switch
                id="announce-filters"
                checked={localAnnounceFilters}
                onCheckedChange={() => handleToggle(setLocalAnnounceFilters, 'Annunci filtri')}
                aria-label={localAnnounceFilters ? 'Disabilita annunci filtri' : 'Abilita annunci filtri'}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1 mr-3">
                <Label htmlFor="announce-form-changes" className="font-medium text-sm">
                  Modifiche Form
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ogni modifica nei campi (verboso)
                </p>
              </div>
              <Switch
                id="announce-form-changes"
                checked={localAnnounceFormChanges}
                onCheckedChange={() => handleToggle(setLocalAnnounceFormChanges, 'Annunci modifiche form')}
                aria-label={localAnnounceFormChanges ? 'Disabilita annunci modifiche form' : 'Abilita annunci modifiche form'}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1 mr-3">
                <Label htmlFor="announce-shortcuts" className="font-medium text-sm">
                  Scorciatoie
                </Label>
                <p className="text-xs text-muted-foreground">
                  Uso di scorciatoie da tastiera
                </p>
              </div>
              <Switch
                id="announce-shortcuts"
                checked={localAnnounceShortcuts}
                onCheckedChange={() => handleToggle(setLocalAnnounceShortcuts, 'Annunci scorciatoie')}
                aria-label={localAnnounceShortcuts ? 'Disabilita annunci scorciatoie' : 'Abilita annunci scorciatoie'}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1 mr-3">
                <Label htmlFor="announce-balance" className="font-medium text-sm">
                  Saldi
                </Label>
                <p className="text-xs text-muted-foreground">
                  Modifiche ai saldi dei conti
                </p>
              </div>
              <Switch
                id="announce-balance"
                checked={localAnnounceBalance}
                onCheckedChange={() => handleToggle(setLocalAnnounceBalance, 'Annunci saldi')}
                aria-label={localAnnounceBalance ? 'Disabilita annunci saldi' : 'Abilita annunci saldi'}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1 mr-3">
                <Label htmlFor="announce-budget" className="font-medium text-sm">
                  Avvisi Budget
                </Label>
                <p className="text-xs text-muted-foreground">
                  Avvisi di superamento budget
                </p>
              </div>
              <Switch
                id="announce-budget"
                checked={localAnnounceBudget}
                onCheckedChange={() => handleToggle(setLocalAnnounceBudget, 'Avvisi budget')}
                aria-label={localAnnounceBudget ? 'Disabilita avvisi budget' : 'Abilita avvisi budget'}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1 mr-3">
                <Label htmlFor="announce-progress" className="font-medium text-sm">
                  Progressi
                </Label>
                <p className="text-xs text-muted-foreground">
                  Barre di progresso e percentuali
                </p>
              </div>
              <Switch
                id="announce-progress"
                checked={localAnnounceProgress}
                onCheckedChange={() => handleToggle(setLocalAnnounceProgress, 'Annunci progressi')}
                aria-label={localAnnounceProgress ? 'Disabilita annunci progressi' : 'Abilita annunci progressi'}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1 mr-3">
                <Label htmlFor="announce-focus" className="font-medium text-sm">
                  Cambio Focus
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ogni cambio di focus (molto verboso)
                </p>
              </div>
              <Switch
                id="announce-focus"
                checked={localAnnounceFocus}
                onCheckedChange={() => handleToggle(setLocalAnnounceFocus, 'Annunci cambio focus')}
                aria-label={localAnnounceFocus ? 'Disabilita annunci cambio focus' : 'Abilita annunci cambio focus'}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-0.5 flex-1 mr-3">
                <Label htmlFor="announce-list-pos" className="font-medium text-sm">
                  Posizione Liste
                </Label>
                <p className="text-xs text-muted-foreground">
                  "Elemento 3 di 10" nelle liste
                </p>
              </div>
              <Switch
                id="announce-list-pos"
                checked={localAnnounceListPos}
                onCheckedChange={() => handleToggle(setLocalAnnounceListPos, 'Annunci posizione liste')}
                aria-label={localAnnounceListPos ? 'Disabilita annunci posizione liste' : 'Abilita annunci posizione liste'}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Ritardo Annunci</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={16} className="text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent variant="accent" className="max-w-xs">
                <p className="text-xs">
                  Imposta il ritardo prima che venga fatto un annuncio. Utile per evitare annunci sovrapposti.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="announce-delay" className="text-sm">
                Ritardo (millisecondi)
              </Label>
              <span className="text-sm font-mono text-muted-foreground">
                {localAnnounceDelay}ms
              </span>
            </div>
            <Slider
              id="announce-delay"
              value={[localAnnounceDelay]}
              onValueChange={handleDelayChange}
              min={0}
              max={500}
              step={50}
              className="flex-1"
              aria-label={`Ritardo annunci: ${localAnnounceDelay} millisecondi`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Immediato (0ms)</span>
              <span>Molto lento (500ms)</span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleTestAnnouncement}
            variant="outline"
            className="gap-2 flex-1"
          >
            <SpeakerHigh size={18} weight="duotone" />
            Prova Annuncio
          </Button>
          <Button
            onClick={handleResetToDefaults}
            variant="outline"
            className="gap-2 flex-1"
          >
            <CheckCircle size={18} weight="duotone" />
            Ripristina Predefiniti
          </Button>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Note Importanti</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Queste impostazioni influenzano solo gli annunci vocali per screen reader</li>
                <li>• I messaggi toast visibili non vengono modificati da queste impostazioni</li>
                <li>• La modalità ridotta disabilita temporaneamente molti annunci non critici</li>
                <li>• Il ritardo può aiutare a evitare sovrapposizioni con annunci nativi del browser</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
