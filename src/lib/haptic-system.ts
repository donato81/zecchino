type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' | 'impact-light' | 'impact-medium' | 'impact-heavy' | 'notification-success' | 'notification-warning' | 'notification-error' | 'rigid' | 'soft'

interface HapticSettings {
  enabled: boolean
  intensity: number
}

class HapticSystem {
  private settings: HapticSettings = {
    enabled: true,
    intensity: 1.0
  }
  private supportsVibration: boolean = false

  constructor() {
    this.supportsVibration = 'vibrate' in navigator
    this.loadSettings()
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem('haptic-settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        this.settings = { ...this.settings, ...parsed }
      }
    } catch (error) {
      console.warn('Failed to load haptic settings:', error)
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('haptic-settings', JSON.stringify(this.settings))
    } catch (error) {
      console.warn('Failed to save haptic settings:', error)
    }
  }

  isEnabled(): boolean {
    return this.settings.enabled && this.supportsVibration
  }

  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled
    this.saveSettings()
  }

  getIntensity(): number {
    return this.settings.intensity
  }

  setIntensity(intensity: number): void {
    this.settings.intensity = Math.max(0, Math.min(1, intensity))
    this.saveSettings()
  }

  getSettings(): HapticSettings {
    return { ...this.settings }
  }

  isSupported(): boolean {
    return this.supportsVibration
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.isEnabled()) return

    try {
      if (Array.isArray(pattern)) {
        const adjustedPattern = pattern.map(duration => 
          Math.round(duration * this.settings.intensity)
        )
        navigator.vibrate(adjustedPattern)
      } else {
        navigator.vibrate(Math.round(pattern * this.settings.intensity))
      }
    } catch (error) {
      console.warn('Vibration failed:', error)
    }
  }

  play(pattern: HapticPattern): void {
    if (!this.isEnabled()) return

    switch (pattern) {
      case 'light':
        this.vibrate(10)
        break
      
      case 'medium':
        this.vibrate(20)
        break
      
      case 'heavy':
        this.vibrate(40)
        break
      
      case 'success':
        this.vibrate([10, 30, 10])
        break
      
      case 'warning':
        this.vibrate([20, 50, 20, 50, 20])
        break
      
      case 'error':
        this.vibrate([50, 100, 50])
        break
      
      case 'selection':
        this.vibrate(5)
        break
      
      case 'impact-light':
        this.vibrate(15)
        break
      
      case 'impact-medium':
        this.vibrate(30)
        break
      
      case 'impact-heavy':
        this.vibrate(50)
        break
      
      case 'notification-success':
        this.vibrate([10, 50, 10, 50, 15])
        break
      
      case 'notification-warning':
        this.vibrate([25, 50, 25, 50, 25, 50, 25])
        break
      
      case 'notification-error':
        this.vibrate([50, 100, 50, 100, 60])
        break
      
      case 'rigid':
        this.vibrate(20)
        break
      
      case 'soft':
        this.vibrate(8)
        break
      
      default:
        this.vibrate(10)
    }
  }

  click(): void {
    this.play('light')
  }

  buttonPress(): void {
    this.play('medium')
  }

  success(): void {
    this.play('success')
  }

  error(): void {
    this.play('error')
  }

  warning(): void {
    this.play('warning')
  }

  selection(): void {
    this.play('selection')
  }

  impact(): void {
    this.play('impact-medium')
  }

  notification(type: 'success' | 'warning' | 'error' = 'success'): void {
    if (type === 'success') {
      this.play('notification-success')
    } else if (type === 'warning') {
      this.play('notification-warning')
    } else if (type === 'error') {
      this.play('notification-error')
    }
  }

  pinSuccess(): void {
    this.play('notification-success')
  }

  pinError(): void {
    this.play('error')
  }

  unlock(): void {
    this.play('success')
  }

  privateUnlock(): void {
    this.vibrate([15, 30, 15, 30, 15, 30, 20])
  }

  accountCreated(): void {
    this.play('notification-success')
  }

  accountDeleted(): void {
    this.play('error')
  }

  transactionCreated(): void {
    this.play('impact-medium')
  }

  income(): void {
    this.vibrate([10, 40, 15])
  }

  expense(): void {
    this.vibrate([15, 40, 10])
  }

  transfer(): void {
    this.vibrate([10, 30, 10, 30, 10])
  }

  save(): void {
    this.play('success')
  }

  delete(): void {
    this.play('error')
  }

  budgetCreated(): void {
    this.play('notification-success')
  }

  budgetDeleted(): void {
    this.play('error')
  }

  budgetWarning(): void {
    this.play('warning')
  }

  budgetCritical(): void {
    this.vibrate([30, 60, 30, 60, 30])
  }

  budgetExceeded(): void {
    this.vibrate([50, 80, 50, 80, 50, 80, 60])
  }

  goalCreated(): void {
    this.play('notification-success')
  }

  goalCompleted(): void {
    this.vibrate([20, 40, 20, 40, 20, 40, 20, 40, 30])
  }

  export(): void {
    this.play('success')
  }

  dialogOpen(): void {
    this.play('soft')
  }

  dialogClose(): void {
    this.play('soft')
  }

  tabChange(): void {
    this.play('selection')
  }

  filterToggle(): void {
    this.play('light')
  }

  categoryToggle(): void {
    this.play('selection')
  }

  alertDismissed(): void {
    this.play('light')
  }

  navigation(): void {
    this.play('selection')
  }

  focus(): void {
    this.vibrate(3)
  }

  swipe(): void {
    this.play('light')
  }

  longPress(): void {
    this.play('rigid')
  }

  refresh(): void {
    this.vibrate([10, 20, 10])
  }

  custom(duration: number | number[]): void {
    this.vibrate(duration)
  }
}

export const hapticSystem = new HapticSystem()
