import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants'
import type { AccountType } from '@/lib/types'
import { create as createAccount } from '@/lib/supabase/repositories/conti'
import { seedDefaultCategories } from '@/lib/supabase/repositories/categorie'
import { updateField, updatePreference } from '@/lib/supabase/repositories/impostazioni-utente'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { toast } from 'sonner'

type SeedStatus = 'idle' | 'running' | 'done' | 'error' | (string & {})

const TOTAL_STEPS = 5
const STEP_LABELS = [
  'Benvenuto',
  'Nome visualizzato',
  'Valuta preferita',
  'Categorie iniziali',
  'Primo conto',
] as const

const SUPPORTED_CURRENCIES = [
  { code: 'EUR', label: 'Euro' },
  { code: 'USD', label: 'Dollaro USA' },
  { code: 'GBP', label: 'Sterlina britannica' },
  { code: 'CHF', label: 'Franco svizzero' },
  { code: 'JPY', label: 'Yen giapponese' },
  { code: 'CAD', label: 'Dollaro canadese' },
  { code: 'AUD', label: 'Dollaro australiano' },
] as const

function StepTitle({ title, description, titleRef }: { title: string; description: string; titleRef: React.RefObject<HTMLSpanElement | null> }) {
  return (
    <CardHeader>
      <CardTitle>
        <span ref={titleRef} tabIndex={-1} className="outline-none">
          {title}
        </span>
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  )
}

export function OnboardingFlow() {
  const { user, userSettings, completeOnboarding } = useAuth()
  const { accounts, refreshAll, isLoading } = useAppData()
  const screenReader = useScreenReader()
  const titleRef = useRef<HTMLSpanElement>(null)

  const [currentStep, setCurrentStep] = useState(1)
  const [nomeValue, setNomeValue] = useState(userSettings?.nomeVisualizzato ?? '')
  const [valutaValue, setValutaValue] = useState(userSettings?.valutaDefault ?? 'EUR')
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('bancario')
  const [initialBalance, setInitialBalance] = useState('0')
  const [showAccountForm, setShowAccountForm] = useState(accounts.length === 0)
  const [nameError, setNameError] = useState<string | null>(null)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [seedStatus, setSeedStatus] = useState<SeedStatus>('idle')
  const [accountError, setAccountError] = useState<string | null>(null)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [isSavingName, setIsSavingName] = useState(false)
  const [isSavingCurrency, setIsSavingCurrency] = useState(false)
  const [isSavingAccount, setIsSavingAccount] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [pendingFinalize, setPendingFinalize] = useState(false)
  const isSaving = isSavingName || isSavingCurrency || isSavingAccount || isCompleting

  const suggestedName = useMemo(() => user?.email?.split('@')[0] ?? 'utente', [user?.email])

  const runSeed = useCallback(async () => {
    setSeedStatus('running')
    setSeedError(null)
    try {
      await seedDefaultCategories()
      setSeedStatus('done')
      toast.success('Categorie predefinite preparate')
      screenReader.announceSuccess('Categorie predefinite pronte.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Impossibile preparare le categorie, controlla la connessione e riprova.'
      setSeedStatus('error')
      setSeedError(message)
      toast.error('Impossibile preparare le categorie')
      screenReader.announceError(message)
    }
  }, [screenReader])

  useEffect(() => {
    if (currentStep <= TOTAL_STEPS) {
      screenReader.announceProgress(currentStep, TOTAL_STEPS, STEP_LABELS[currentStep - 1])
    } else {
      screenReader.announceSuccess('Configurazione finale pronta.')
    }
    titleRef.current?.focus()
  }, [currentStep, screenReader])

  useEffect(() => {
    if (currentStep === 5) {
      setShowAccountForm(accounts.length === 0)
      setAccountError(null)
    }
  }, [accounts.length, currentStep])

  useEffect(() => {
    if (currentStep === 4 && seedStatus === 'idle') {
      void runSeed()
    }
  }, [currentStep, runSeed, seedStatus])

  useEffect(() => {
    if (!pendingFinalize || isLoading) return
    completeOnboarding()
    setPendingFinalize(false)
  }, [completeOnboarding, isLoading, pendingFinalize])

  const goBack = useCallback(() => {
    if (currentStep <= 1) return
    setCurrentStep((step) => step - 1)
  }, [currentStep])

  const handleSaveName = useCallback(async () => {
    const normalized = nomeValue.trim()
    if (!normalized) {
      setNameError('Inserisci un nome oppure conferma il suggerimento.')
      screenReader.announceError('Inserisci un nome per continuare.')
      return
    }

    setIsSavingName(true)
    setNameError(null)

    try {
      await updateField('nomeVisualizzato', normalized)
      setNomeValue(normalized)
      toast.success('Nome visualizzato salvato')
      screenReader.announceSuccess('Nome visualizzato salvato.')
      setCurrentStep(3)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Non è stato possibile salvare il nome, riprova.'
      setNameError(message)
      screenReader.announceError(message)
    } finally {
      setIsSavingName(false)
    }
  }, [nomeValue, screenReader])

  const handleSaveCurrency = useCallback(async () => {
    setIsSavingCurrency(true)
    setCurrencyError(null)

    try {
      await updateField('valutaDefault', valutaValue)
      toast.success('Valuta preferita salvata')
      screenReader.announceSuccess('Valuta preferita salvata.')
      setCurrentStep(4)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Non è stato possibile salvare la valuta, riprova.'
      setCurrencyError(message)
      screenReader.announceError(message)
    } finally {
      setIsSavingCurrency(false)
    }
  }, [screenReader, valutaValue])

  const handleSaveAccount = useCallback(async () => {
    const normalizedName = accountName.trim()
    if (!normalizedName) {
      setAccountError('Inserisci un nome per il conto.')
      screenReader.announceError('Inserisci un nome per il conto.')
      return
    }

    const parsedBalance = Number.parseFloat(initialBalance.replace(',', '.'))
    if (Number.isNaN(parsedBalance)) {
      setAccountError('Il saldo iniziale deve essere un numero valido.')
      screenReader.announceError('Il saldo iniziale deve essere un numero valido.')
      return
    }

    setIsSavingAccount(true)
    setAccountError(null)

    try {
      await createAccount({
        nome: normalizedName,
        tipo: accountType,
        saldoIniziale: parsedBalance,
        valuta: valutaValue,
        isPrivato: accountType === 'privato',
        dataCreazione: new Date().toISOString().slice(0, 10),
      })
      toast.success('Conto creato con successo')
      screenReader.announceSuccess('Conto creato con successo.')
      setCurrentStep(6)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Non è stato possibile creare il conto, riprova.'
      setAccountError(message)
      screenReader.announceError(message)
    } finally {
      setIsSavingAccount(false)
    }
  }, [accountName, accountType, initialBalance, screenReader, valutaValue])

  const handleComplete = useCallback(async () => {
    setIsCompleting(true)
    setCompletionError(null)

    try {
      await updatePreference('onboarding_completed', true)
      toast.success('Onboarding completato')
      screenReader.announceSuccess('Onboarding completato. Caricamento dashboard in corso.')
      setPendingFinalize(true)
      refreshAll()
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Non è stato possibile completare l\'onboarding, riprova.'
      setCompletionError(message)
      screenReader.announceError(message)
      setIsCompleting(false)
    }
  }, [refreshAll, screenReader])

  useEffect(() => {
    if (!pendingFinalize || isLoading) return
    setIsCompleting(false)
  }, [isLoading, pendingFinalize])

  const renderCurrentStep = () => {
    if (currentStep === 1) {
      return (
        <>
          <StepTitle
            title="Benvenuto in Zecchino"
            description="Ti guideremo in pochi passi nella configurazione iniziale del tuo profilo e dei dati minimi necessari per iniziare."
            titleRef={titleRef}
          />
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configurerai nome visualizzato, valuta preferita, categorie iniziali e, se vuoi, il tuo primo conto.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Imposta il nome che vedrai nell&apos;app.</li>
              <li>Scegli la valuta principale dei tuoi saldi.</li>
              <li>Prepariamo le categorie predefinite in modo automatico.</li>
              <li>Puoi creare subito un conto oppure saltare questo passaggio.</li>
            </ul>
          </CardContent>
          <CardFooter className="justify-end">
            <Button size="lg" onClick={() => setCurrentStep(2)}>Inizia</Button>
          </CardFooter>
        </>
      )
    }

    if (currentStep === 2) {
      return (
        <>
          <StepTitle
            title="Come ti chiami?"
            description="Il nome visualizzato comparirà nell'intestazione dell'app e nelle schermate di benvenuto."
            titleRef={titleRef}
          />
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-name">Nome visualizzato</Label>
              <Input
                id="onboarding-name"
                value={nomeValue}
                onChange={(event) => setNomeValue(event.target.value)}
                placeholder={suggestedName}
                autoComplete="name"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Suggerimento: puoi confermare <strong>{suggestedName}</strong> oppure inserire un nome diverso.
            </p>
            <p
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              aria-hidden={!nameError}
              className="text-sm text-destructive"
            >
              {nameError}
            </p>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Button variant="outline" onClick={goBack}>Indietro</Button>
            <Button onClick={() => void handleSaveName()} disabled={isSavingName}>
              {isSavingName ? 'Salvataggio...' : 'Avanti'}
            </Button>
          </CardFooter>
        </>
      )
    }

    if (currentStep === 3) {
      return (
        <>
          <StepTitle
            title="Scegli la valuta preferita"
            description="La valuta selezionata sarà usata per saldi, riepiloghi e report iniziali."
            titleRef={titleRef}
          />
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-currency">Valuta</Label>
              <Select value={valutaValue} onValueChange={setValutaValue}>
                <SelectTrigger id="onboarding-currency" className="w-full">
                  <SelectValue placeholder="Seleziona una valuta" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              aria-hidden={!currencyError}
              className="text-sm text-destructive"
            >
              {currencyError}
            </p>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Button variant="outline" onClick={goBack}>Indietro</Button>
            <Button onClick={() => void handleSaveCurrency()} disabled={isSavingCurrency}>
              {isSavingCurrency ? 'Salvataggio...' : 'Avanti'}
            </Button>
          </CardFooter>
        </>
      )
    }

    if (currentStep === 4) {
      return (
        <>
          <StepTitle
            title="Prepariamo le categorie iniziali"
            description="Questo passaggio è obbligatorio e crea le categorie predefinite necessarie per usare l'app correttamente."
            titleRef={titleRef}
          />
          <CardContent className="space-y-4">
            {seedStatus === 'running' ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-live="polite">
                <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
                <span>Stiamo preparando le categorie di spesa predefinite...</span>
              </div>
            ) : null}
            {seedStatus === 'done' ? (
              <p className="text-sm text-emerald-700" aria-live="polite">Categorie pronte. Puoi proseguire.</p>
            ) : null}
            <p
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              aria-hidden={!seedError}
              className="text-sm text-destructive"
            >
              {seedError}
            </p>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Button variant="outline" onClick={goBack}>Indietro</Button>
            <div className="flex gap-3">
              {seedStatus === 'error' ? (
                <Button variant="outline" onClick={() => void runSeed()} disabled={seedStatus === 'running'}>Riprova</Button>
              ) : null}
              <Button onClick={() => setCurrentStep(5)} disabled={seedStatus !== 'done'}>Avanti</Button>
            </div>
          </CardFooter>
        </>
      )
    }

    if (currentStep === 5) {
      return (
        <>
          <StepTitle
            title="Vuoi creare il primo conto?"
            description="Puoi creare subito un conto con i dati minimi oppure saltare questo passaggio e farlo più tardi."
            titleRef={titleRef}
          />
          <CardContent className="space-y-4">
            {accounts.length > 0 && !showAccountForm ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Hai già un conto configurato. Puoi saltare questo passo oppure aggiungerne un altro.</p>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {accounts.map((account) => (
                    <li key={account.id}>{account.nome} · {ACCOUNT_TYPE_LABELS[account.tipo]}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-account-name">Nome del conto</Label>
                  <Input
                    id="onboarding-account-name"
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                    placeholder="Conto principale"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-account-type">Tipo di conto</Label>
                  <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountType)}>
                    <SelectTrigger id="onboarding-account-type" className="w-full">
                      <SelectValue placeholder="Seleziona un tipo di conto" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-account-balance">Saldo iniziale</Label>
                  <Input
                    id="onboarding-account-balance"
                    type="number"
                    inputMode="decimal"
                    value={initialBalance}
                    onChange={(event) => setInitialBalance(event.target.value)}
                  />
                </div>
              </div>
            )}
            <p
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              aria-hidden={!accountError}
              className="text-sm text-destructive"
            >
              {accountError}
            </p>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Button variant="outline" onClick={goBack}>Indietro</Button>
            <div className="flex flex-wrap justify-end gap-3">
              {accounts.length > 0 && !showAccountForm ? (
                <Button variant="outline" onClick={() => setShowAccountForm(true)}>Aggiungi un altro conto</Button>
              ) : null}
              <Button variant="outline" onClick={() => setCurrentStep(6)}>Salta per ora</Button>
              {showAccountForm ? (
                <Button onClick={() => void handleSaveAccount()} disabled={isSavingAccount}>
                  {isSavingAccount ? 'Creazione...' : 'Crea conto e continua'}
                </Button>
              ) : null}
            </div>
          </CardFooter>
        </>
      )
    }

    return (
      <>
        <StepTitle
          title="Tutto pronto"
          description="Hai completato la configurazione iniziale. Un ultimo passaggio e potrai usare la dashboard."
          titleRef={titleRef}
        />
        <CardContent className="space-y-4">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Nome visualizzato: <strong>{nomeValue.trim() || suggestedName}</strong></li>
            <li>Valuta preferita: <strong>{valutaValue}</strong></li>
            <li>Categorie iniziali: <strong>pronte</strong></li>
            <li>Conti disponibili: <strong>{accounts.length}</strong></li>
          </ul>
          <p
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            aria-hidden={!completionError}
            className="text-sm text-destructive"
          >
            {completionError}
          </p>
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <Button
            size="lg"
            onClick={() => void handleComplete()}
            disabled={isCompleting}
            aria-busy={isCompleting}
          >
            {isCompleting ? 'Completamento...' : 'Inizia a usare Zecchino'}
          </Button>
        </CardFooter>
      </>
    )
  }

  return (
    <main
      id="main-content"
      className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6 lg:px-8"
      aria-label="Configurazione iniziale Zecchino"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div aria-live="polite" className="sr-only">
          {currentStep <= TOTAL_STEPS
            ? `Passo ${currentStep} di ${TOTAL_STEPS}: ${STEP_LABELS[currentStep - 1]}`
            : 'Configurazione completata'}
        </div>

        {currentStep <= TOTAL_STEPS ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Passo {currentStep} di {TOTAL_STEPS}</p>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        <Card className="border-primary/10" aria-busy={isSaving}>
          {renderCurrentStep()}
        </Card>
      </div>
    </main>
  )
}