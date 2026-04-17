export type AnnouncementPriority = 'polite' | 'assertive'

class ScreenReaderAnnouncer {
  private politeRegion: HTMLDivElement | null = null
  private assertiveRegion: HTMLDivElement | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeLiveRegions()
    }
  }

  private initializeLiveRegions() {
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
  }

  announce(message: string, priority: AnnouncementPriority = 'polite') {
    const region = priority === 'assertive' ? this.assertiveRegion : this.politeRegion
    if (!region) return

    region.textContent = ''
    
    setTimeout(() => {
      region.textContent = message
    }, 100)

    setTimeout(() => {
      if (region.textContent === message) {
        region.textContent = ''
      }
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

  announceBalance(accountName: string, balance: number, currency: string = '€') {
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
}

export const screenReader = new ScreenReaderAnnouncer()
