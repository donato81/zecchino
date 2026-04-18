import { useState } from 'react'
import { soundSystem } from '@/lib/sound-system'
import { useScreenReader } from '@/hooks/use-screen-reader'
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

export function DataManagement() {
  const screenReader = useScreenReader()
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)

  const handleExportData = async () => {
    try {
      soundSystem.play('export')
      
      const allKeys = await window.spark.kv.keys()
      const exportData: Record<string, any> = {}
      
      for (const key of allKeys) {
        const value = await window.spark.kv.get(key)
        exportData[key] = value
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zecchino-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Backup completato con successo')
      screenReader.announceSuccess(`Backup dei dati esportato. File: zecchino-backup-${new Date().toISOString().split('T')[0]}.json`)
    } catch (error) {
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

    try {
      const text = await importFile.text()
      const data = JSON.parse(text)

      for (const [key, value] of Object.entries(data)) {
        await window.spark.kv.set(key, value)
      }

      soundSystem.play('success')
      toast.success('Dati importati con successo. Ricarica la pagina per applicare le modifiche.')
      screenReader.announceSuccess('Importazione completata. Ricaricare la pagina per vedere i dati importati.')
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      soundSystem.play('error')
      toast.error('Errore durante l\'importazione. Verifica che il file sia valido.')
      screenReader.announceError('Errore durante l\'importazione dei dati')
    }

    setShowImportConfirm(false)
    setImportFile(null)
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
                  Salva una copia completa del database in formato JSON
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
                  Ripristina i dati da un backup precedente
                </p>
                <div>
                  <input
                    type="file"
                    id="import-file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    className="hidden"
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
          </div>

          <Separator />

          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="text-destructive shrink-0 mt-0.5" weight="duotone" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Avvertenze Importanti</p>
                <ul className="text-xs text-destructive/80 space-y-1">
                  <li>• L'importazione sovrascrive TUTTI i dati esistenti</li>
                  <li>• Assicurati di avere un backup recente prima di importare</li>
                  <li>• Verifica che il file di backup sia integro e valido</li>
                  <li>• L'applicazione si ricaricherà automaticamente dopo l'importazione</li>
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
              Verrà creato un file JSON contenente tutti i tuoi dati finanziari: conti, movimenti, 
              categorie, budget e obiettivi di risparmio.
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
              <span className="font-semibold text-destructive">ATTENZIONE:</span> Questa operazione sostituirà 
              TUTTI i dati attuali con quelli contenuti nel file di backup.
              <br /><br />
              File selezionato: <span className="font-mono text-sm">{importFile?.name}</span>
              <br /><br />
              L'applicazione verrà ricaricata automaticamente dopo l'importazione.
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
              Importa e Sovrascrivi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
