export type AnnouncementPriority = 'polite' | 'assertive'

class ScreenReaderAnnouncer {
  private politeRegion: HTMLDivElement | null = null
  private assertiveRegion: HTMLDivElement | null = null
  private initialized: boolean = false

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initializeLiveRegions())
      } else {
        this.initializeLiveRegions()
      }
    }
  }

  private initializeLiveRegions() {
    if (this.initialized) return
    
    this.politeRegion = document.createElement('div')
    this.politeRegion.setAttribute('role', 'status')
    this.politeRegion.setAttribute('aria-live', 'polite')
    this.politeRegion.setAttribute('aria-atomic', 'true')
    this.politeRegion.className = 'sr-only'
    this.politeRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;'
    document.body.appendChild(this.politeRegion)

    this.assertiveRegion = document.createElement('div')
    this.assertiveRegion.setAttribute('role', 'alert')
    this.assertiveRegion.setAttribute('aria-live', 'assertive')
    this.assertiveRegion.setAttribute('aria-atomic', 'true')
    this.assertiveRegion.className = 'sr-only'
    this.assertiveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;'
    document.body.appendChild(this.assertiveRegion)
    
    this.initialized = true
  }

  announce(message: string, priority: AnnouncementPriority = 'polite') {
    if (!this.initialized) {
      this.initializeLiveRegions()
    }

    const region = priority === 'assertive'
      ? this.assertiveRegion
      : this.politeRegion
    if (!region) return

    // Svuota usando replaceChildren() invece dell'assegnazione diretta al testo
    // replaceChildren() segnala la rimozione a NVDA in modo
    // ordinato, senza strappare i nodi che NVDA gestisce
    region.replaceChildren()

    setTimeout(() => {
      if (!region) return
      // Aggiunge il testo come nodo separato, non come
      // proprietà diretta — NVDA può agganciarsi senza conflitti
      const textNode = document.createTextNode(message)
      region.replaceChildren(textNode)
    }, 100)

    setTimeout(() => {
      if (!region) return
      region.replaceChildren()
    }, 5000)
  }

  announceNavigation(destination: string) {
    this.announce(`Navigazione a ${destination}`, 'polite')
  }

  announceAction(action: string) {
    this.announce(`${action}`, 'assertive')
  }

  announceError(error: string) {
    this.announce(`Errore: ${error}`, 'assertive')
  }

  announceSuccess(message: string) {
    this.announce(`Successo: ${message}`, 'polite')
  }

  announceCount(items: string, count: number) {
    const plural = count === 1 ? items.replace(/i$/, 'o') : items
    this.announce(`${count} ${plural}`, 'polite')
  }

  announceBalance(accountName: string, balance: number, _currency: string = '€') {
    const formattedBalance = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(balance)
    this.announce(`${accountName}, saldo ${formattedBalance}`, 'polite')
  }

  announceTransaction(type: string, amount: number, account: string, category?: string) {
    const formattedAmount = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
    
    let message = `Movimento ${type}: ${formattedAmount} su ${account}`
    if (category) {
      message += `, categoria ${category}`
    }
    this.announce(message, 'polite')
  }

  announceDialogOpen(title: string) {
    this.announce(`Finestra di dialogo aperta: ${title}`, 'polite')
  }

  announceDialogClose() {
    this.announce('Finestra di dialogo chiusa', 'polite')
  }

  announceProgress(current: number, total: number, label: string) {
    const percentage = Math.round((current / total) * 100)
    this.announce(`${label}: ${percentage}%. ${current} di ${total}`, 'polite')
  }

  announceBudgetStatus(name: string, spent: number, target: number, percentage: number) {
    const formattedSpent = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(spent)
    const formattedTarget = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(target)
    const remaining = target - spent
    const formattedRemaining = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(Math.abs(remaining))

    let status = ''
    if (percentage >= 100) {
      status = `superato di ${formattedRemaining}`
    } else if (percentage >= 90) {
      status = `attenzione, rimangono solo ${formattedRemaining}`
    } else if (percentage >= 75) {
      status = `rimangono ${formattedRemaining}`
    } else {
      status = `in corso, spesi ${formattedSpent} su ${formattedTarget}`
    }

    this.announce(`Budget ${name}: ${Math.round(percentage)}%, ${status}`, 'polite')
  }

  announceFocus(elementDescription: string) {
    this.announce(elementDescription, 'polite')
  }

  announceListNavigation(position: number, total: number, itemDescription: string) {
    this.announce(`Elemento ${position} di ${total}: ${itemDescription}`, 'polite')
  }

  announceFilter(filterName: string, active: boolean) {
    const stato = active ? 'attivato' : 'disattivato'
    this.announce(`Filtro ${filterName} ${stato}`, 'polite')
  }

  announceSort(columnName: string, direction: 'ascending' | 'descending') {
    const direzione = direction === 'ascending' ? 'crescente' : 'decrescente'
    this.announce(`Ordinamento per ${columnName}, ordine ${direzione}`, 'polite')
  }

  announceAccountCreated(name: string, type: string, initialBalance: number) {
    const formattedBalance = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(initialBalance)
    this.announce(`Nuovo conto ${name} di tipo ${type} creato con saldo iniziale di ${formattedBalance}`, 'polite')
  }

  announceAccountDeleted(name: string) {
    this.announce(`Conto ${name} eliminato. Tutti i movimenti associati sono stati rimossi`, 'assertive')
  }

  announceBudgetCreated(name: string, target: number, period: string) {
    const formattedTarget = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(target)
    this.announce(`Nuovo budget ${name} creato. Importo target: ${formattedTarget} per periodo ${period}`, 'polite')
  }

  announceBudgetDeleted(name: string) {
    this.announce(`Budget ${name} eliminato`, 'assertive')
  }

  announceSavingsGoalCreated(name: string, target: number, deadline?: string) {
    const formattedTarget = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(target)
    let message = `Nuovo obiettivo di risparmio ${name} creato. Target: ${formattedTarget}`
    if (deadline) {
      message += `, scadenza ${new Date(deadline).toLocaleDateString('it-IT')}`
    }
    this.announce(message, 'polite')
  }

  announceSavingsGoalProgress(name: string, current: number, target: number, percentage: number) {
    const formattedCurrent = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(current)
    const formattedTarget = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(target)
    const remaining = target - current
    const formattedRemaining = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(remaining)

    let status = ''
    if (percentage >= 100) {
      status = `obiettivo raggiunto!`
    } else if (percentage >= 75) {
      status = `quasi raggiunto, mancano ${formattedRemaining}`
    } else {
      status = `progresso ${Math.round(percentage)}%, risparmiati ${formattedCurrent} su ${formattedTarget}`
    }

    this.announce(`Obiettivo ${name}: ${status}`, 'polite')
  }

  announceSavingsGoalDeleted(name: string) {
    this.announce(`Obiettivo di risparmio ${name} eliminato`, 'assertive')
  }

  announceVolumeChange(level: number, muted: boolean) {
    if (muted) {
      this.announce('Audio disattivato', 'polite')
    } else {
      this.announce(`Volume impostato a ${level}%`, 'polite')
    }
  }

  announcePresetApplied(presetName: string) {
    this.announce(`Preset audio ${presetName} applicato`, 'polite')
  }

  announceTemplateSelected(templateName: string) {
    this.announce(`Template ${templateName} selezionato. Campi compilati automaticamente`, 'polite')
  }

  announceFormError(fieldName: string, error: string) {
    this.announce(`Errore nel campo ${fieldName}: ${error}`, 'assertive')
  }

  announceFormFieldFilled(fieldName: string, value: string) {
    this.announce(`Campo ${fieldName} impostato a ${value}`, 'polite')
  }

  announceToggleState(elementName: string, isEnabled: boolean) {
    const stato = isEnabled ? 'attivato' : 'disattivato'
    this.announce(`${elementName} ${stato}`, 'polite')
  }

  announceCardAction(action: string, itemName: string) {
    this.announce(`${action} ${itemName}`, 'polite')
  }

  announceExport(itemCount: number, format: string) {
    this.announce(`${itemCount} ${itemCount === 1 ? 'elemento esportato' : 'elementi esportati'} in formato ${format}`, 'polite')
  }

  announcePeriodChange(periodName: string) {
    this.announce(`Periodo cambiato a ${periodName}`, 'polite')
  }

  announceHelpOpened() {
    this.announce('Aiuto scorciatoie da tastiera aperto. Usa Tab per navigare, Escape per chiudere', 'polite')
  }

  announceHelpClosed() {
    this.announce('Aiuto scorciatoie da tastiera chiuso', 'polite')
  }

  announcePrivateAccountLocked() {
    this.announce('Conto privato bloccato. I dati privati non sono più visibili', 'polite')
  }

  announceDataCleared(dataType: string) {
    this.announce(`${dataType} cancellati completamente`, 'assertive')
  }

  announceImportComplete(itemCount: number, dataType: string) {
    this.announce(`Importazione completata. ${itemCount} ${dataType} importati`, 'polite')
  }
}

export const screenReader = new ScreenReaderAnnouncer()
