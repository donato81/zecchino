import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Keyboard } from '@phosphor-icons/react'
import { soundSystem } from '@/lib/sound-system'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { useEffect } from 'react'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

interface ShortcutGroup {
  title: string
  shortcuts: Array<{
    keys: string[]
    description: string
  }>
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigazione',
    shortcuts: [
      { keys: ['Ctrl', 'D'], description: 'Vai a Dashboard' },
      { keys: ['Ctrl', 'T'], description: 'Vai a Movimenti' },
      { keys: ['Ctrl', 'R'], description: 'Vai a Report' }
    ]
  },
  {
    title: 'Navigazione Liste',
    shortcuts: [
      { keys: ['↑'], description: 'Movimento precedente' },
      { keys: ['↓'], description: 'Movimento successivo' },
      { keys: ['Home'], description: 'Primo movimento' },
      { keys: ['End'], description: 'Ultimo movimento' },
      { keys: ['Enter'], description: 'Modifica movimento selezionato' },
      { keys: ['E'], description: 'Modifica movimento selezionato' },
      { keys: ['Delete'], description: 'Elimina movimento selezionato' }
    ]
  },
  {
    title: 'Azioni Rapide',
    shortcuts: [
      { keys: ['Ctrl', 'M'], description: 'Nuovo Movimento' },
      { keys: ['Ctrl', 'B'], description: 'Nuovo Conto' },
      { keys: ['Ctrl', 'U'], description: 'Sblocca Conto Privato' },
      { keys: ['Ctrl', 'E'], description: 'Esporta CSV (dalla tab Movimenti)' }
    ]
  },
  {
    title: 'Filtri Categorie (solo Dashboard)',
    shortcuts: [
      { keys: ['1'], description: 'Filtra Bancari' },
      { keys: ['2'], description: 'Filtra Digitali' },
      { keys: ['3'], description: 'Filtra Risparmio' },
      { keys: ['4'], description: 'Filtra Investimenti' },
      { keys: ['5'], description: 'Filtra Privato' },
      { keys: ['Ctrl', 'A'], description: 'Mostra/Nascondi Tutti' }
    ]
  },
  {
    title: 'Preset Volume Audio',
    shortcuts: [
      { keys: ['Alt', '1'], description: 'Volume Silenzioso (10%)' },
      { keys: ['Alt', '2'], description: 'Volume Basso (30%)' },
      { keys: ['Alt', '3'], description: 'Volume Medio (60%)' },
      { keys: ['Alt', '4'], description: 'Volume Alto (90%)' }
    ]
  },
  {
    title: 'Generali',
    shortcuts: [
      { keys: ['?'], description: 'Mostra questa guida' },
      { keys: ['Esc'], description: 'Chiudi finestre di dialogo' }
    ]
  }
]

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  const screenReader = useScreenReader()

  useEffect(() => {
    if (open) {
      soundSystem.play('dialog-open')
      screenReader.announceHelpOpened()
    }
  }, [open, screenReader])

  const handleClose = () => {
    soundSystem.play('dialog-close')
    screenReader.announceHelpClosed()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard size={24} weight="duotone" aria-hidden="true" />
            Scorciatoie da Tastiera
          </DialogTitle>
          <DialogDescription>
            Usa queste scorciatoie per navigare rapidamente nell'app
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {shortcutGroups.map((group, index) => (
            <div key={group.title}>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                          <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                            {key}
                          </Badge>
                          {idx < shortcut.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {index < shortcutGroups.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Suggerimento:</strong> Le scorciatoie da tastiera 
            non funzionano quando sei in un campo di testo o in una finestra di dialogo.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
