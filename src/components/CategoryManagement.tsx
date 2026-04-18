import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Category, CategoryType } from '@/lib/types'
import { generateId } from '@/lib/helpers'
import { soundSystem } from '@/lib/sound-system'
import { useScreenReader } from '@/hooks/use-screen-reader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tag, Plus, PencilSimple, Trash, CheckCircle, X, TrendUp, TrendDown } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

export function CategoryManagement() {
  const screenReader = useScreenReader()
  const [categories, setCategories] = useKV<Category[]>('categories', [])
  
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  
  const [categoryName, setCategoryName] = useState('')
  const [categoryType, setCategoryType] = useState<CategoryType>('uscita')
  const [error, setError] = useState('')

  const safeCategories = categories || []
  const incomeCategories = safeCategories.filter(c => c.tipo === 'entrata')
  const expenseCategories = safeCategories.filter(c => c.tipo === 'uscita')

  const handleOpenCategoryDialog = (category?: Category) => {
    setEditingCategory(category || null)
    setCategoryName(category?.nome || '')
    setCategoryType(category?.tipo || 'uscita')
    setError('')
    setShowCategoryDialog(true)
    soundSystem.play('dialog-open')
    screenReader.announce(
      category 
        ? `Apertura dialog per modifica categoria ${category.nome}`
        : 'Apertura dialog per nuova categoria',
      'assertive'
    )
  }

  const handleCloseCategoryDialog = () => {
    setShowCategoryDialog(false)
    setEditingCategory(null)
    setCategoryName('')
    setCategoryType('uscita')
    setError('')
    soundSystem.play('dialog-close')
  }

  const validateCategory = (): boolean => {
    if (!categoryName.trim()) {
      setError('Inserisci un nome per la categoria')
      soundSystem.play('error')
      screenReader.announceError('Errore: nome categoria richiesto')
      return false
    }

    const isDuplicate = safeCategories.some(
      c => c.nome.toLowerCase() === categoryName.trim().toLowerCase() && c.id !== editingCategory?.id
    )

    if (isDuplicate) {
      setError('Esiste già una categoria con questo nome')
      soundSystem.play('error')
      screenReader.announceError('Errore: categoria duplicata')
      return false
    }

    return true
  }

  const handleSaveCategory = () => {
    if (!validateCategory()) return

    const categoryData: Category = {
      id: editingCategory?.id || generateId(),
      nome: categoryName.trim(),
      tipo: categoryType,
      predefinita: editingCategory?.predefinita || false
    }

    setCategories((current) => {
      const currentCategories = current || []
      if (editingCategory) {
        const updated = currentCategories.map(c =>
          c.id === editingCategory.id ? categoryData : c
        )
        soundSystem.play('save')
        toast.success('Categoria modificata')
        screenReader.announceSuccess(`Categoria ${categoryData.nome} di tipo ${categoryData.tipo} modificata`)
        return updated
      } else {
        soundSystem.play('category-created')
        toast.success(`Categoria "${categoryData.nome}" creata`)
        screenReader.announceSuccess(`Nuova categoria ${categoryData.nome} di tipo ${categoryData.tipo} creata`)
        return [...currentCategories, categoryData]
      }
    })

    handleCloseCategoryDialog()
  }

  const handleOpenDeleteDialog = (category: Category) => {
    setDeletingCategory(category)
    setShowDeleteDialog(true)
    soundSystem.play('dialog-open')
    screenReader.announce(`Conferma eliminazione categoria ${category.nome}`, 'assertive')
  }

  const handleDeleteCategory = () => {
    if (!deletingCategory) return

    setCategories((current) => {
      const updated = (current || []).filter(c => c.id !== deletingCategory.id)
      soundSystem.play('delete')
      toast.success('Categoria eliminata')
      screenReader.announceSuccess(`Categoria ${deletingCategory.nome} eliminata`)
      return updated
    })

    setShowDeleteDialog(false)
    setDeletingCategory(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow-md">
                <Tag size={24} weight="duotone" className="text-secondary-foreground" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Gestione Categorie
                </CardTitle>
                <CardDescription>
                  Organizza le tue entrate e uscite con categorie personalizzate
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => handleOpenCategoryDialog()}
              className="gap-2"
              data-focus-info="Aggiungi una nuova categoria personalizzata"
            >
              <Plus size={18} weight="bold" />
              Nuova Categoria
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendUp size={20} weight="duotone" className="text-income" />
                <h4 className="text-sm font-semibold">Categorie Entrate</h4>
                <Badge variant="secondary" className="text-xs">
                  {incomeCategories.length}
                </Badge>
              </div>
            </div>
            
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nessuna categoria di entrate
                      </TableCell>
                    </TableRow>
                  ) : (
                    incomeCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <TrendUp size={12} weight="duotone" />
                            Entrata
                          </Badge>
                          {category.predefinita && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Predefinita
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenCategoryDialog(category)}
                              aria-label={`Modifica categoria ${category.nome}`}
                            >
                              <PencilSimple size={18} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeleteDialog(category)}
                              disabled={category.predefinita}
                              aria-label={`Elimina categoria ${category.nome}`}
                            >
                              <Trash size={18} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendDown size={20} weight="duotone" className="text-expense" />
                <h4 className="text-sm font-semibold">Categorie Uscite</h4>
                <Badge variant="secondary" className="text-xs">
                  {expenseCategories.length}
                </Badge>
              </div>
            </div>
            
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nessuna categoria di uscite
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenseCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <TrendDown size={12} weight="duotone" />
                            Uscita
                          </Badge>
                          {category.predefinita && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Predefinita
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenCategoryDialog(category)}
                              aria-label={`Modifica categoria ${category.nome}`}
                            >
                              <PencilSimple size={18} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeleteDialog(category)}
                              disabled={category.predefinita}
                              aria-label={`Elimina categoria ${category.nome}`}
                            >
                              <Trash size={18} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <Tag size={16} className="text-muted-foreground shrink-0 mt-0.5" weight="duotone" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Note sulle Categorie</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Le categorie predefinite possono essere rinominate ma non eliminate</li>
                  <li>• Crea categorie personalizzate per organizzare meglio le tue finanze</li>
                  <li>• Le categorie vengono utilizzate nei report e nelle statistiche</li>
                  <li>• Puoi assegnare budget specifici per ogni categoria</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag size={20} weight="duotone" />
              {editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Modifica il nome e il tipo della categoria'
                : 'Crea una nuova categoria per organizzare le tue transazioni'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nome Categoria</Label>
              <Input
                id="category-name"
                placeholder="es. Spesa, Stipendio, Bollette..."
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value)
                  setError('')
                }}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-type">Tipo</Label>
              <Select
                value={categoryType}
                onValueChange={(value) => setCategoryType(value as CategoryType)}
              >
                <SelectTrigger id="category-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrata">
                    <div className="flex items-center gap-2">
                      <TrendUp size={16} weight="duotone" className="text-income" />
                      Entrata
                    </div>
                  </SelectItem>
                  <SelectItem value="uscita">
                    <div className="flex items-center gap-2">
                      <TrendDown size={16} weight="duotone" className="text-expense" />
                      Uscita
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCategoryDialog}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              onClick={handleSaveCategory}
              disabled={!categoryName.trim()}
              className="gap-2"
            >
              <CheckCircle size={18} weight="duotone" />
              {editingCategory ? 'Salva Modifiche' : 'Crea Categoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la categoria "{deletingCategory?.nome}"?
              <br />
              <br />
              I movimenti associati a questa categoria non verranno eliminati, ma non avranno più una categoria assegnata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => soundSystem.play('dialog-close')}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
