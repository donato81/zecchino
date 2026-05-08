import { useState } from 'react'
import type { Account, Budget, SavingsGoal, Transaction } from '@/lib/types'
import { soundSystem } from '@/lib/sound-system'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import {
  create as createConto,
  getById as getContoById,
  update as updateConto,
} from '@/lib/supabase/repositories/conti'
import {
  create as createBudget,
  getById as getBudgetById,
  update as updateBudget,
} from '@/lib/supabase/repositories/budget'
import {
  create as createSavingsGoal,
  getById as getSavingsGoalById,
  update as updateSavingsGoal,
} from '@/lib/supabase/repositories/obiettivi-risparmio'
import {
  create as createTransaction,
  getById as getTransactionById,
  update as updateTransaction,
} from '@/lib/supabase/repositories/transazioni'
import { RepositoryError } from '@/lib/supabase/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Database, DownloadSimple, UploadSimple, Info, Heart, Code, ShieldCheck, GitBranch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
const SUPPORTED_SCHEMA_MAJOR = '1'
const APP_VERSION = '1.0.0'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type MigrationError = {
  entity: string
  id: string
  message: string
}

type BackupPayload = {
  meta?: {
    schema_version?: string
    exported_at?: string
    app_version?: string
  }
  accounts?: unknown
  transactions?: unknown
  budgets?: unknown
  savingsGoals?: unknown
  [key: string]: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function schemaMajor(version?: string): string | null {
  if (!version || !isString(version)) return null
  const [major] = version.split('.')
  return major || null
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Errore sconosciuto'
}

function isNotFoundError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  if (error instanceof RepositoryError && error.code === 'PGRST116') {
    return true
  }
  return (
    message.includes('0 rows') ||
    message.includes('no rows') ||
    message.includes('not found') ||
    message.includes('multiple (or no) rows returned')
  )
}

function collectValidItems<T extends { id: string }>(
  items: unknown[],
  entity: string,
  validator: (value: unknown) => value is T,
  errors: MigrationError[]
): T[] {
  const valid: T[] = []

  for (const item of items) {
    if (validator(item)) {
      valid.push(item)
      continue
    }

    const maybeId = isRecord(item) && isString(item.id) ? item.id : 'sconosciuto'
    errors.push({
      entity,
      id: maybeId,
      message: 'Struttura dati non valida nel backup o nel KV Spark',
    })
  }

  return valid
}

function isValidAccount(value: unknown): value is Account {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.nome) &&
    isString(value.tipo) &&
    isNumber(value.saldoIniziale) &&
    isString(value.valuta) &&
    isBoolean(value.isPrivato) &&
    isString(value.dataCreazione)
  )
}

function isValidBudget(value: unknown): value is Budget {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.nome) &&
    isNumber(value.importoTarget) &&
    isString(value.periodo) &&
    isString(value.dataInizio) &&
    isString(value.dataFine) &&
    isBoolean(value.attivo) &&
    (value.categoriaId === undefined || value.categoriaId === null || isString(value.categoriaId)) &&
    (value.contoId === undefined || value.contoId === null || isString(value.contoId))
  )
}

function isValidSavingsGoal(value: unknown): value is SavingsGoal {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.nome) &&
    isString(value.descrizione) &&
    isNumber(value.importoTarget) &&
    isNumber(value.importoCorrente) &&
    isString(value.dataInizio) &&
    isString(value.colore) &&
    isString(value.icona) &&
    isBoolean(value.completato) &&
    (value.dataScadenza === undefined || value.dataScadenza === null || isString(value.dataScadenza)) &&
    (value.contoAssociato === undefined || value.contoAssociato === null || isString(value.contoAssociato)) &&
    (value.dataCompletamento === undefined || value.dataCompletamento === null || isString(value.dataCompletamento))
  )
}

function isValidTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.data) &&
    isNumber(value.importo) &&
    isString(value.tipo) &&
    isString(value.contoId) &&
    isString(value.categoriaId) &&
    isString(value.descrizione) &&
    isBoolean(value.ricorrente) &&
    isBoolean(value.cifrato) &&
    (value.contoDestinazioneId === undefined || value.contoDestinazioneId === null || isString(value.contoDestinazioneId)) &&
    (value.frequenzaRicorrenza === undefined || value.frequenzaRicorrenza === null || isString(value.frequenzaRicorrenza))
  )
}

function sameAccount(left: Omit<Account, 'id'>, right: Account): boolean {
  return (
    left.nome === right.nome &&
    left.tipo === right.tipo &&
    left.saldoIniziale === right.saldoIniziale &&
    left.valuta === right.valuta &&
    left.isPrivato === right.isPrivato &&
    left.dataCreazione === right.dataCreazione
  )
}

function sameBudget(left: Omit<Budget, 'id'>, right: Budget): boolean {
  return (
    left.nome === right.nome &&
    left.importoTarget === right.importoTarget &&
    left.periodo === right.periodo &&
    left.categoriaId === right.categoriaId &&
    left.contoId === right.contoId &&
    left.dataInizio === right.dataInizio &&
    left.dataFine === right.dataFine &&
    left.attivo === right.attivo
  )
}

function sameSavingsGoal(left: Omit<SavingsGoal, 'id'>, right: SavingsGoal): boolean {
  return (
    left.nome === right.nome &&
    left.descrizione === right.descrizione &&
    left.importoTarget === right.importoTarget &&
    left.importoCorrente === right.importoCorrente &&
    left.dataInizio === right.dataInizio &&
    left.dataScadenza === right.dataScadenza &&
    left.contoAssociato === right.contoAssociato &&
    left.colore === right.colore &&
    left.icona === right.icona &&
    left.completato === right.completato &&
    left.dataCompletamento === right.dataCompletamento
  )
}

function sameTransaction(left: Omit<Transaction, 'id' | 'cifrato'>, right: Transaction): boolean {
  return (
    left.data === right.data &&
    left.importo === right.importo &&
    left.tipo === right.tipo &&
    left.contoId === right.contoId &&
    left.contoDestinazioneId === right.contoDestinazioneId &&
    left.categoriaId === right.categoriaId &&
    left.descrizione === right.descrizione &&
    left.ricorrente === right.ricorrente &&
    left.frequenzaRicorrenza === right.frequenzaRicorrenza
  )
}

export function DataManagement() {
  const screenReader = useScreenReader()
  const {
    accounts: appAccounts,
    transactions: appTransactions,
    budgets: appBudgets,
    savingsGoals: appSavingsGoals,
    refreshAll,
  } = useAppData()
  const { user } = useAuth()
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [progressMessage, setProgressMessage] = useState('')
  const [progressMode, setProgressMode] = useState<'polite' | 'assertive'>('polite')
  const [importErrors, setImportErrors] = useState<MigrationError[]>([])
  const [importSummary, setImportSummary] = useState<string | null>(null)

  const setProgress = (message: string, mode: 'polite' | 'assertive' = 'polite') => {
    setProgressMessage(message)
    setProgressMode(mode)
  }

  const handleExportData = async () => {
    try {
      soundSystem.play('export')

      const exportedAt = new Date().toISOString()
      const fileDate = exportedAt.split('T')[0]
      const payload = {
        meta: {
          schema_version: '1.0',
          exported_at: exportedAt,
          app_version: APP_VERSION,
        },
        accounts: appAccounts,
        transactions: appTransactions,
        budgets: appBudgets,
        savingsGoals: appSavingsGoals,
      }

      const dataStr = JSON.stringify(payload, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zecchino-backup-${fileDate}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const totalEntities = appAccounts.length + appTransactions.length + appBudgets.length + appSavingsGoals.length
      toast.success(`Backup completato con successo. Entità esportate: ${totalEntities}.`)
      screenReader.announceSuccess(`Backup dei dati esportato. File: zecchino-backup-${fileDate}.json. Entità incluse: ${totalEntities}.`)
    } catch (_error) {
      soundSystem.play('error')
      toast.error('Errore durante l\'esportazione dei dati')
      screenReader.announceError('Errore durante il backup dei dati')
    }
    
    setShowExportConfirm(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setImportFile(file)
        setShowImportConfirm(true)
        soundSystem.play('dialog-open')
        screenReader.announce(`File selezionato: ${file.name}. Conferma per importare i dati.`, 'assertive')
      } else {
        soundSystem.play('error')
        toast.error('Formato file non valido. Seleziona un file JSON.')
        screenReader.announceError('Errore: formato file non valido')
      }
    }
  }

  const handleImportData = async () => {
    if (!importFile) return
    if (!user) {
      soundSystem.play('error')
      toast.error('Utente non autenticato. Import non disponibile.')
      screenReader.announceError('Utente non autenticato. Import non disponibile.')
      return
    }

    try {
      const text = await importFile.text()
      const parsed: unknown = JSON.parse(text)

      if (!isRecord(parsed)) {
        throw new Error('Il file selezionato non contiene un oggetto JSON valido.')
      }

      const data = parsed as BackupPayload
      if (!Array.isArray(data.accounts) || !Array.isArray(data.transactions) || !Array.isArray(data.budgets) || !Array.isArray(data.savingsGoals)) {
        throw new Error('Il file di backup non contiene tutte le sezioni richieste: accounts, transactions, budgets, savingsGoals.')
      }

      const version = data.meta?.schema_version
      const versionMajor = schemaMajor(version)
      if (versionMajor !== null && versionMajor !== SUPPORTED_SCHEMA_MAJOR) {
        throw new Error(`Il file di backup non è compatibile con questa versione dell'app (versione file: ${version}, versione supportata: ${SUPPORTED_SCHEMA_MAJOR}.x). Esporta un nuovo backup dall'app corrente.`)
      }

      const errors: MigrationError[] = []
      let createdCount = 0
      let updatedCount = 0

      const importAccountIdMap = new Map<string, string>()
      let knownAccounts = [...appAccounts]
      let knownBudgets = [...appBudgets]
      let knownSavingsGoals = [...appSavingsGoals]
      let knownTransactions = [...appTransactions]

      const validAccounts = collectValidItems(data.accounts, 'account', isValidAccount, errors)
      const validBudgets = collectValidItems(data.budgets, 'budget', isValidBudget, errors)
      const validSavingsGoals = collectValidItems(data.savingsGoals, 'savings-goal', isValidSavingsGoal, errors)
      const validTransactions = collectValidItems(data.transactions, 'transaction', isValidTransaction, errors)

      for (const [index, account] of validAccounts.entries()) {
        setProgress(`Import conti da backup: ${index + 1} di ${validAccounts.length}`)
        if (!isUuid(account.id)) {
          errors.push({ entity: 'account', id: account.id, message: 'Entità con ID non riconosciuto: potrebbe provenire da un backup precedente alla migrazione.' })
          continue
        }

        const payload: Omit<Account, 'id'> = {
          nome: account.nome,
          tipo: account.tipo,
          saldoIniziale: account.saldoIniziale,
          valuta: account.valuta,
          isPrivato: account.isPrivato,
          dataCreazione: account.dataCreazione,
          archiviato: account.archiviato ?? false,
        }

        try {
          const existingById = await getContoById(account.id)
          await updateConto(existingById.id, payload)
          importAccountIdMap.set(account.id, existingById.id)
          knownAccounts = knownAccounts.map((current) => current.id === existingById.id ? { ...current, ...payload, id: existingById.id } : current)
          updatedCount += 1
        } catch (error) {
          if (!isNotFoundError(error)) {
            errors.push({ entity: 'account', id: account.id, message: getErrorMessage(error) })
            continue
          }

          const existingMatch = knownAccounts.find((current) => sameAccount(payload, current))
          if (existingMatch) {
            try {
              await updateConto(existingMatch.id, payload)
              importAccountIdMap.set(account.id, existingMatch.id)
              knownAccounts = knownAccounts.map((current) => current.id === existingMatch.id ? { ...current, ...payload, id: existingMatch.id } : current)
              updatedCount += 1
            } catch (updateError) {
              errors.push({ entity: 'account', id: account.id, message: getErrorMessage(updateError) })
            }
            continue
          }

          try {
            const created = await createConto(payload)
            importAccountIdMap.set(account.id, created.id)
            knownAccounts = [...knownAccounts, created]
            createdCount += 1
          } catch (createError) {
            errors.push({ entity: 'account', id: account.id, message: getErrorMessage(createError) })
          }
        }
      }

      for (const [index, budget] of validBudgets.entries()) {
        setProgress(`Import budget da backup: ${index + 1} di ${validBudgets.length}`)
        if (!isUuid(budget.id)) {
          errors.push({ entity: 'budget', id: budget.id, message: 'Entità con ID non riconosciuto: potrebbe provenire da un backup precedente alla migrazione.' })
          continue
        }

        const mappedAccountId = budget.contoId ? importAccountIdMap.get(budget.contoId) ?? budget.contoId : undefined
        const payload: Omit<Budget, 'id'> = {
          nome: budget.nome,
          importoTarget: budget.importoTarget,
          periodo: budget.periodo,
          categoriaId: budget.categoriaId,
          contoId: mappedAccountId,
          dataInizio: budget.dataInizio,
          dataFine: budget.dataFine,
          attivo: budget.attivo,
        }

        try {
          const existingById = await getBudgetById(budget.id)
          await updateBudget(existingById.id, payload)
          knownBudgets = knownBudgets.map((current) => current.id === existingById.id ? { ...current, ...payload, id: existingById.id } : current)
          updatedCount += 1
        } catch (error) {
          if (!isNotFoundError(error)) {
            errors.push({ entity: 'budget', id: budget.id, message: getErrorMessage(error) })
            continue
          }

          const existingMatch = knownBudgets.find((current) => sameBudget(payload, current))
          if (existingMatch) {
            try {
              await updateBudget(existingMatch.id, payload)
              knownBudgets = knownBudgets.map((current) => current.id === existingMatch.id ? { ...current, ...payload, id: existingMatch.id } : current)
              updatedCount += 1
            } catch (updateError) {
              errors.push({ entity: 'budget', id: budget.id, message: getErrorMessage(updateError) })
            }
            continue
          }

          try {
            const created = await createBudget(payload)
            knownBudgets = [...knownBudgets, created]
            createdCount += 1
          } catch (createError) {
            errors.push({ entity: 'budget', id: budget.id, message: getErrorMessage(createError) })
          }
        }
      }

      for (const [index, goal] of validSavingsGoals.entries()) {
        setProgress(`Import obiettivi da backup: ${index + 1} di ${validSavingsGoals.length}`)
        if (!isUuid(goal.id)) {
          errors.push({ entity: 'savings-goal', id: goal.id, message: 'Entità con ID non riconosciuto: potrebbe provenire da un backup precedente alla migrazione.' })
          continue
        }

        const mappedAccountId = goal.contoAssociato ? importAccountIdMap.get(goal.contoAssociato) ?? goal.contoAssociato : undefined
        const payload: Omit<SavingsGoal, 'id'> = {
          nome: goal.nome,
          descrizione: goal.descrizione,
          importoTarget: goal.importoTarget,
          importoCorrente: goal.importoCorrente,
          dataInizio: goal.dataInizio,
          dataScadenza: goal.dataScadenza,
          contoAssociato: mappedAccountId,
          colore: goal.colore,
          icona: goal.icona,
          completato: goal.completato,
          dataCompletamento: goal.dataCompletamento,
        }

        try {
          const existingById = await getSavingsGoalById(goal.id)
          await updateSavingsGoal(existingById.id, payload)
          knownSavingsGoals = knownSavingsGoals.map((current) => current.id === existingById.id ? { ...current, ...payload, id: existingById.id } : current)
          updatedCount += 1
        } catch (error) {
          if (!isNotFoundError(error)) {
            errors.push({ entity: 'savings-goal', id: goal.id, message: getErrorMessage(error) })
            continue
          }

          const existingMatch = knownSavingsGoals.find((current) => sameSavingsGoal(payload, current))
          if (existingMatch) {
            try {
              await updateSavingsGoal(existingMatch.id, payload)
              knownSavingsGoals = knownSavingsGoals.map((current) => current.id === existingMatch.id ? { ...current, ...payload, id: existingMatch.id } : current)
              updatedCount += 1
            } catch (updateError) {
              errors.push({ entity: 'savings-goal', id: goal.id, message: getErrorMessage(updateError) })
            }
            continue
          }

          try {
            const created = await createSavingsGoal(payload)
            knownSavingsGoals = [...knownSavingsGoals, created]
            createdCount += 1
          } catch (createError) {
            errors.push({ entity: 'savings-goal', id: goal.id, message: getErrorMessage(createError) })
          }
        }
      }

      for (const [index, transaction] of validTransactions.entries()) {
        setProgress(`Import transazioni da backup: ${index + 1} di ${validTransactions.length}`)
        if (!isUuid(transaction.id)) {
          errors.push({ entity: 'transaction', id: transaction.id, message: 'Entità con ID non riconosciuto: potrebbe provenire da un backup precedente alla migrazione.' })
          continue
        }

        const mappedAccountId = importAccountIdMap.get(transaction.contoId) ?? transaction.contoId
        const mappedDestinationId = transaction.contoDestinazioneId
          ? importAccountIdMap.get(transaction.contoDestinazioneId) ?? transaction.contoDestinazioneId
          : undefined

        const payload: Omit<Transaction, 'id' | 'cifrato'> = {
          data: transaction.data,
          importo: transaction.importo,
          tipo: transaction.tipo,
          contoId: mappedAccountId,
          contoDestinazioneId: mappedDestinationId,
          categoriaId: transaction.categoriaId,
          descrizione: transaction.descrizione,
          ricorrente: transaction.ricorrente,
          frequenzaRicorrenza: transaction.frequenzaRicorrenza,
        }

        try {
          const existingById = await getTransactionById(transaction.id)
          await updateTransaction(existingById.id, payload)
          knownTransactions = knownTransactions.map((current) => current.id === existingById.id ? { ...current, ...payload, id: existingById.id, cifrato: current.cifrato } : current)
          updatedCount += 1
        } catch (error) {
          if (!isNotFoundError(error)) {
            errors.push({ entity: 'transaction', id: transaction.id, message: getErrorMessage(error) })
            continue
          }

          const existingMatch = knownTransactions.find((current) => sameTransaction(payload, current))
          if (existingMatch) {
            try {
              await updateTransaction(existingMatch.id, payload)
              knownTransactions = knownTransactions.map((current) => current.id === existingMatch.id ? { ...current, ...payload, id: existingMatch.id, cifrato: current.cifrato } : current)
              updatedCount += 1
            } catch (updateError) {
              errors.push({ entity: 'transaction', id: transaction.id, message: getErrorMessage(updateError) })
            }
            continue
          }

          try {
            const created = await createTransaction(payload)
            knownTransactions = [...knownTransactions, created]
            createdCount += 1
          } catch (createError) {
            errors.push({ entity: 'transaction', id: transaction.id, message: getErrorMessage(createError) })
          }
        }
      }

      soundSystem.play('success')
      refreshAll()
      setImportErrors(errors)
      setImportSummary(`Import completato. Entità create: ${createdCount}. Entità aggiornate: ${updatedCount}. Problemi registrati: ${errors.length}.`)
      if (errors.length === 0) {
        toast.success(`Dati importati con successo. Create: ${createdCount}, aggiornate: ${updatedCount}.`)
        screenReader.announceSuccess(`Importazione completata. Entità create: ${createdCount}, aggiornate: ${updatedCount}.`)
      } else {
        toast.warning(`Import completato con ${errors.length} avvisi o errori. Create: ${createdCount}, aggiornate: ${updatedCount}.`)
        screenReader.announceError(`Importazione completata con ${errors.length} avvisi o errori.`)
      }
    } catch (_error) {
      soundSystem.play('error')
      toast.error('Errore durante l\'importazione. Verifica che il file sia valido.')
      screenReader.announceError('Errore durante l\'importazione dei dati')
    } finally {
      setProgress('Import da backup completato.', 'assertive')
      setShowImportConfirm(false)
      setImportFile(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-md">
              <Database size={24} weight="duotone" className="text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Gestione Dati e Backup
              </CardTitle>
              <CardDescription>
                Esporta e importa i tuoi dati finanziari
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database size={20} weight="duotone" className="text-primary" />
              <h4 className="text-sm font-semibold">Backup e Ripristino</h4>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <DownloadSimple size={20} weight="duotone" className="text-success" />
                  <h5 className="font-medium">Esporta Dati</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Salva un backup JSON con conti, movimenti, budget e obiettivi di risparmio
                </p>
                <Button
                  onClick={() => {
                    setShowExportConfirm(true)
                    soundSystem.play('dialog-open')
                  }}
                  variant="outline"
                  className="w-full gap-2"
                  data-focus-info="Esporta tutti i dati in un file di backup JSON"
                >
                  <DownloadSimple size={18} weight="duotone" />
                  Esporta Backup
                </Button>
              </div>

              <div className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <UploadSimple size={20} weight="duotone" className="text-warning" />
                  <h5 className="font-medium">Importa Dati</h5>
                </div>
                <p className="text-sm text-muted-foreground">
                  Importa un backup Supabase in modalità additiva e aggiornante
                </p>
                <div>
                  <input
                    type="file"
                    id="import-file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label="Seleziona file di backup JSON da importare"
                  />
                  <Button
                    onClick={() => {
                      document.getElementById('import-file')?.click()
                      soundSystem.play('click')
                    }}
                    variant="outline"
                    className="w-full gap-2"
                    data-focus-info="Seleziona un file di backup JSON da importare"
                  >
                    <UploadSimple size={18} weight="duotone" />
                    Importa Backup
                  </Button>
                </div>
              </div>
            </div>

            {(progressMessage || importSummary) ? (
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                {progressMessage ? (
                  <p className="text-sm text-muted-foreground">{progressMessage}</p>
                ) : null}
                {importSummary ? (
                  <p className="text-sm font-medium">{importSummary}</p>
                ) : null}
                {importErrors.length > 0 ? (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {importErrors.map((error, index) => (
                      <li key={`${error.entity}-${error.id}-${index}`}>
                        • {error.entity} ({error.id}): {error.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="sr-only" aria-live={progressMode}>{progressMessage}</div>
          </div>

          <Separator />

          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="text-destructive shrink-0 mt-0.5" weight="duotone" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Avvertenze Importanti</p>
                <ul className="text-xs text-destructive/80 space-y-1">
                  <li>• L'importazione crea nuove entità e aggiorna quelle già presenti</li>
                  <li>• I dati presenti nell'app ma assenti nel file non vengono eliminati</li>
                  <li>• Assicurati di avere un backup recente prima di importare</li>
                  <li>• Verifica che il file di backup sia integro e valido</li>
                  <li>• I dati vengono ricaricati tramite refreshAll senza ricaricare la pagina</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-secondary flex items-center justify-center shadow-md">
              <Info size={24} weight="duotone" className="text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Informazioni Applicazione
              </CardTitle>
              <CardDescription>
                Dettagli su Zecchino e crediti
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-1">
                <p className="text-sm font-medium">Nome Applicazione</p>
                <p className="text-xs text-muted-foreground">Gestore finanze personali</p>
              </div>
              <Badge variant="default" className="text-base px-3 py-1">
                Zecchino
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-1">
                <p className="text-sm font-medium">Versione</p>
                <p className="text-xs text-muted-foreground">Build corrente</p>
              </div>
              <Badge variant="secondary" className="font-mono">
                v1.0.0
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-1">
                <p className="text-sm font-medium">Tecnologia</p>
                <p className="text-xs text-muted-foreground">Stack di sviluppo</p>
              </div>
              <div className="flex items-center gap-2">
                <Code size={16} weight="duotone" className="text-primary" />
                <span className="text-sm">React + TypeScript</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-1">
                <p className="text-sm font-medium">Licenza</p>
                <p className="text-xs text-muted-foreground">Tipo di licenza software</p>
              </div>
              <Badge variant="outline">MIT License</Badge>
            </div>
          </div>

          <Separator />

          <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart size={20} weight="fill" className="text-destructive animate-pulse" />
                <h4 className="text-sm font-semibold">Sviluppato con Passione</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Zecchino è un'applicazione di gestione finanze personali progettata con un focus particolare 
                sull'accessibilità e l'usabilità per tutti gli utenti, inclusi quelli che utilizzano screen reader.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <GitBranch size={16} weight="duotone" className="text-primary" />
                <p className="text-xs text-muted-foreground">
                  Open source • Contribuisci su GitHub
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">100%</p>
              <p className="text-xs text-muted-foreground mt-1">Accessibile</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-success">256-bit</p>
              <p className="text-xs text-muted-foreground mt-1">Crittografia</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-accent">Locale</p>
              <p className="text-xs text-muted-foreground mt-1">Privacy</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showExportConfirm} onOpenChange={setShowExportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Esportazione</AlertDialogTitle>
            <AlertDialogDescription>
              Verrà creato un file JSON contenente i tuoi dati finanziari su Supabase: conti,
              movimenti, budget e obiettivi di risparmio.
              <br /><br />
              Conserva questo file in un luogo sicuro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => soundSystem.play('dialog-close')}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleExportData}>
              Esporta Dati
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Importazione</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-destructive">ATTENZIONE:</span> Questa operazione può creare nuove entità e aggiornare quelle già presenti con i dati contenuti nel file di backup.
              <br /><br />
              File selezionato: <span className="font-mono text-sm">{importFile?.name}</span>
              <br /><br />
              I dati presenti nell'app ma assenti nel file non verranno eliminati. Al termine verrà eseguito un refresh dei dati senza ricaricare la pagina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setImportFile(null)
                soundSystem.play('dialog-close')
              }}
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImportData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Importa backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
