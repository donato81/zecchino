import { useIsMobile } from '@/hooks/use-mobile'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { DotsThreeVertical } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface TransactionActionMenuProps {
  transactionLabel: string
  triggerIndex: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onFocusReturn: () => void
}

export function TransactionActionMenu({
  transactionLabel,
  triggerIndex,
  isOpen,
  onOpenChange,
  onEdit,
  onDelete,
  onFocusReturn,
}: TransactionActionMenuProps) {
  const isMobile = useIsMobile()

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) {
      onFocusReturn()
    }
  }

  const handleDetail = () => {
    onOpenChange(false)
    toast.info('Funzionalità in arrivo')
    onFocusReturn()
  }

  const handleEdit = () => {
    onOpenChange(false)
    onFocusReturn()
    onEdit()
  }

  const handleDelete = () => {
    onOpenChange(false)
    onFocusReturn()
    onDelete()
  }

  const triggerButton = (
    <Button
      size="icon"
      variant="ghost"
      aria-label={`Azioni per: ${transactionLabel}`}
      aria-haspopup="menu"
      data-trigger-index={triggerIndex}
    >
      <DotsThreeVertical size={18} aria-hidden="true" />
    </Button>
  )

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Azioni</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col p-4 pt-0 gap-1">
            <SheetClose asChild>
              <button
                role="menuitem"
                className="flex items-center w-full rounded-sm px-3 py-3 text-sm text-left hover:bg-accent focus:bg-accent focus:outline-none"
                onClick={handleDetail}
              >
                Apri dettaglio
              </button>
            </SheetClose>
            <SheetClose asChild>
              <button
                role="menuitem"
                className="flex items-center w-full rounded-sm px-3 py-3 text-sm text-left hover:bg-accent focus:bg-accent focus:outline-none"
                onClick={handleEdit}
              >
                Modifica
              </button>
            </SheetClose>
            <SheetClose asChild>
              <button
                role="menuitem"
                className="flex items-center w-full rounded-sm px-3 py-3 text-sm text-left text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"
                onClick={handleDelete}
              >
                Elimina
              </button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDetail}>
          Apri dettaglio
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>
          Modifica
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          Elimina
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
