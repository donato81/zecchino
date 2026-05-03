import { useUserSettings } from '@/context/UserSettingsContext'
import type { DisplayPreferences } from '@/hooks/use-user-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Eye, Palette, TextAa, Monitor } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { soundSystem } from '@/lib/sound-system'
import { useScreenReader } from '@/hooks/use-screen-reader'

export function DisplaySettings() {
  const screenReader = useScreenReader()
  const { displayPreferences, setDisplayPreference } = useUserSettings()

  const {
    showBalances, showAccountIcons, compactMode, showCategories,
    animationsEnabled, fontSize, currencyDisplay, numberFormat,
    highContrast, showPercentages, showTransactionIcons, reduceMotion,
  } = displayPreferences

  const handleToggle = (
    key: keyof DisplayPreferences,
    currentValue: boolean,
    label: string
  ) => {
    const newValue = !currentValue
    setDisplayPreference(key, newValue as DisplayPreferences[typeof key]).catch(console.error)
    soundSystem.play('click')
    toast.success(`${label} ${newValue ? 'attivato' : 'disattivato'}`)
    screenReader.announceSuccess(`${label} ${newValue ? 'attivato' : 'disattivato'}`)
  }

  const handleFontSizeChange = (value: number[]) => {
    setDisplayPreference('fontSize', value[0]).catch(console.error)
    soundSystem.play('click')
    const percentage = value[0]
    screenReader.announce(`Dimensione testo: ${percentage}%`, 'polite')
  }

  const handleCurrencyDisplayChange = (value: 'symbol' | 'code' | 'full') => {
    setDisplayPreference('currencyDisplay', value).catch(console.error)
    soundSystem.play('click')
    const displayNames = {
      symbol: 'Simbolo (€)',
      code: 'Codice (EUR)',
      full: 'Completo (Euro)'
    }
    toast.success(`Formato valuta: ${displayNames[value]}`)
    screenReader.announceSuccess(`Formato valuta cambiato in ${displayNames[value]}`)
  }

  const handleNumberFormatChange = (value: 'standard' | 'compact') => {
    setDisplayPreference('numberFormat', value).catch(console.error)
    soundSystem.play('click')
    const displayNames = {
      standard: 'Standard (1.000,00)',
      compact: 'Compatto (1K)'
    }
    toast.success(`Formato numeri: ${displayNames[value]}`)
    screenReader.announceSuccess(`Formato numeri cambiato in ${displayNames[value]}`)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent/80 flex items-center justify-center shadow-md">
            <Eye size={24} weight="duotone" className="text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              Impostazioni Visualizzazione
            </CardTitle>
            <CardDescription>
              Personalizza l'aspetto e il comportamento dell'interfaccia
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Monitor size={20} weight="duotone" className="text-primary" />
            <h4 className="text-sm font-semibold">Visualizzazione Generale</h4>
          </div>
          
          <div className="space-y-4 pl-7">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-balances" className="text-base">
                  Mostra Saldi
                </Label>
                <p className="text-sm text-muted-foreground">
                  Visualizza i saldi dei conti e movimenti
                </p>
              </div>
              <Switch
                id="show-balances"
                checked={showBalances}
                onCheckedChange={(_checked) => handleToggle('showBalances', showBalances, 'Visualizzazione saldi')}
                aria-label="Mostra o nascondi i saldi dei conti"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-account-icons" className="text-base">
                  Mostra Icone Conti
                </Label>
                <p className="text-sm text-muted-foreground">
                  Visualizza icone distintive per tipo di conto
                </p>
              </div>
              <Switch
                id="show-account-icons"
                checked={showAccountIcons}
                onCheckedChange={(_checked) => handleToggle('showAccountIcons', showAccountIcons, 'Icone conti')}
                aria-label="Mostra o nascondi le icone dei tipi di conto"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-categories" className="text-base">
                  Mostra Categorie
                </Label>
                <p className="text-sm text-muted-foreground">
                  Visualizza categorie nei movimenti
                </p>
              </div>
              <Switch
                id="show-categories"
                checked={showCategories}
                onCheckedChange={(_checked) => handleToggle('showCategories', showCategories, 'Visualizzazione categorie')}
                aria-label="Mostra o nascondi le categorie nei movimenti"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-transaction-icons" className="text-base">
                  Mostra Icone Movimenti
                </Label>
                <p className="text-sm text-muted-foreground">
                  Visualizza icone per tipo di movimento
                </p>
              </div>
              <Switch
                id="show-transaction-icons"
                checked={showTransactionIcons}
                onCheckedChange={(_checked) => handleToggle('showTransactionIcons', showTransactionIcons, 'Icone movimenti')}
                aria-label="Mostra o nascondi le icone dei movimenti"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-percentages" className="text-base">
                  Mostra Percentuali
                </Label>
                <p className="text-sm text-muted-foreground">
                  Visualizza percentuali nei budget e statistiche
                </p>
              </div>
              <Switch
                id="show-percentages"
                checked={showPercentages}
                onCheckedChange={(_checked) => handleToggle('showPercentages', showPercentages, 'Visualizzazione percentuali')}
                aria-label="Mostra o nascondi le percentuali"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-mode" className="text-base">
                  Modalità Compatta
                </Label>
                <p className="text-sm text-muted-foreground">
                  Riduci spaziatura per visualizzare più informazioni
                </p>
              </div>
              <Switch
                id="compact-mode"
                checked={compactMode}
                onCheckedChange={(_checked) => handleToggle('compactMode', compactMode, 'Modalità compatta')}
                aria-label="Attiva o disattiva la modalità compatta"
              />
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TextAa size={20} weight="duotone" className="text-secondary" />
            <h4 className="text-sm font-semibold">Formato e Dimensioni</h4>
          </div>
          
          <div className="space-y-4 pl-7">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="font-size" className="text-base">
                  Dimensione Testo
                </Label>
                <Badge variant="secondary" className="font-mono">
                  {fontSize}%
                </Badge>
              </div>
              <Slider
                id="font-size"
                min={80}
                max={150}
                step={10}
                value={[fontSize]}
                onValueChange={handleFontSizeChange}
                className="w-full"
                aria-label={`Dimensione testo: ${fontSize}%`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Piccolo (80%)</span>
                <span>Normale (100%)</span>
                <span>Grande (150%)</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="currency-display" className="text-base">
                Formato Valuta
              </Label>
              <Select
                value={currencyDisplay}
                onValueChange={handleCurrencyDisplayChange}
              >
                <SelectTrigger id="currency-display" aria-label="Seleziona formato valuta">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="symbol">Simbolo (€ 1.000,00)</SelectItem>
                  <SelectItem value="code">Codice (EUR 1.000,00)</SelectItem>
                  <SelectItem value="full">Completo (1.000,00 Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="number-format" className="text-base">
                Formato Numeri
              </Label>
              <Select
                value={numberFormat}
                onValueChange={handleNumberFormatChange}
              >
                <SelectTrigger id="number-format" aria-label="Seleziona formato numeri">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (1.000,00)</SelectItem>
                  <SelectItem value="compact">Compatto (1K)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette size={20} weight="duotone" className="text-accent" />
            <h4 className="text-sm font-semibold">Accessibilità Visiva</h4>
          </div>
          
          <div className="space-y-4 pl-7">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="high-contrast" className="text-base">
                  Alto Contrasto
                </Label>
                <p className="text-sm text-muted-foreground">
                  Aumenta il contrasto per migliorare la leggibilità
                </p>
              </div>
              <Switch
                id="high-contrast"
                checked={highContrast}
                onCheckedChange={(_checked) => handleToggle('highContrast', highContrast, 'Alto contrasto')}
                aria-label="Attiva o disattiva l'alto contrasto"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="animations-enabled" className="text-base">
                  Animazioni
                </Label>
                <p className="text-sm text-muted-foreground">
                  Abilita transizioni e animazioni dell'interfaccia
                </p>
              </div>
              <Switch
                id="animations-enabled"
                checked={animationsEnabled}
                onCheckedChange={(_checked) => handleToggle('animationsEnabled', animationsEnabled, 'Animazioni')}
                aria-label="Attiva o disattiva le animazioni"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reduce-motion" className="text-base">
                  Riduci Movimento
                </Label>
                <p className="text-sm text-muted-foreground">
                  Minimizza animazioni per ridurre il disagio visivo
                </p>
              </div>
              <Switch
                id="reduce-motion"
                checked={reduceMotion}
                onCheckedChange={(_checked) => handleToggle('reduceMotion', reduceMotion, 'Riduci movimento')}
                aria-label="Attiva o disattiva riduzione movimento"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Le impostazioni di visualizzazione vengono salvate automaticamente e applicate immediatamente.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
