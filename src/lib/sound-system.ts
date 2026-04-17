type SoundType = 
  | 'click'
  | 'success'
  | 'error'
  | 'warning'
  | 'notification'
  | 'unlock'
  | 'lock'
  | 'income'
  | 'expense'
  | 'transfer'
  | 'navigation'
  | 'focus'
  | 'hover'
  | 'delete'
  | 'save'
  | 'budget-warning'
  | 'budget-critical'
  | 'budget-exceeded'
  | 'milestone'
  | 'dialog-open'
  | 'dialog-close'
  | 'tab-change'
  | 'filter-toggle'
  | 'category-toggle'
  | 'export'
  | 'settings-change'
  | 'volume-change'
  | 'preset-applied'
  | 'account-created'
  | 'account-deleted'
  | 'goal-created'
  | 'goal-completed'
  | 'goal-progress'
  | 'budget-created'
  | 'budget-deleted'
  | 'chart-loaded'
  | 'data-refresh'
  | 'keyboard-shortcut'
  | 'pin-error'
  | 'pin-success'
  | 'private-unlock'
  | 'private-lock'
  | 'alert-dismissed'
  | 'period-change'

class SoundSystem {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private enabled: boolean = true
  private volume: number = 0.3
  private initialized: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings()
      this.initialize()
    }
  }

  private async loadSettings() {
    try {
      const enabledValue = await window.spark.kv.get<boolean>('audio-enabled')
      const volumeValue = await window.spark.kv.get<number>('audio-volume')
      
      if (enabledValue !== undefined) {
        this.enabled = enabledValue
      }
      if (volumeValue !== undefined) {
        this.volume = volumeValue
      }
    } catch (error) {
      console.warn('Could not load audio settings:', error)
    }
  }

  private initialize() {
    if (this.initialized) return
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = this.volume
      this.masterGain.connect(this.audioContext.destination)
      this.initialized = true
    } catch (error) {
      console.warn('Audio context not available:', error)
      this.enabled = false
    }
  }

  private ensureContext() {
    if (!this.audioContext || !this.masterGain) {
      this.initialize()
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  private createOscillator(frequency: number, type: OscillatorType = 'sine'): OscillatorNode {
    if (!this.audioContext) throw new Error('AudioContext not initialized')
    const oscillator = this.audioContext.createOscillator()
    oscillator.type = type
    oscillator.frequency.value = frequency
    return oscillator
  }

  private createEnvelope(duration: number, attack: number = 0.01, decay: number = 0.1, sustain: number = 0.7, release: number = 0.1): GainNode {
    if (!this.audioContext || !this.masterGain) throw new Error('AudioContext not initialized')
    
    const gain = this.audioContext.createGain()
    const now = this.audioContext.currentTime
    
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(1, now + attack)
    gain.gain.linearRampToValueAtTime(sustain, now + attack + decay)
    gain.gain.linearRampToValueAtTime(sustain, now + duration - release)
    gain.gain.linearRampToValueAtTime(0, now + duration)
    
    gain.connect(this.masterGain)
    return gain
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', envelope?: { attack?: number, decay?: number, sustain?: number, release?: number }) {
    if (!this.enabled || !this.audioContext || !this.masterGain) return

    this.ensureContext()

    const oscillator = this.createOscillator(frequency, type)
    const gain = this.createEnvelope(
      duration,
      envelope?.attack,
      envelope?.decay,
      envelope?.sustain,
      envelope?.release
    )

    oscillator.connect(gain)
    oscillator.start()
    oscillator.stop(this.audioContext.currentTime + duration)
  }

  private playSequence(notes: Array<{ freq: number; duration: number; type?: OscillatorType; delay?: number }>) {
    if (!this.enabled || !this.audioContext) return

    this.ensureContext()

    let totalDelay = 0
    notes.forEach(note => {
      setTimeout(() => {
        this.playTone(note.freq, note.duration, note.type || 'sine')
      }, totalDelay)
      totalDelay += (note.delay || note.duration * 1000)
    })
  }

  private playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine') {
    if (!this.enabled || !this.audioContext || !this.masterGain) return

    this.ensureContext()

    frequencies.forEach(freq => {
      this.playTone(freq, duration, type)
    })
  }

  play(soundType: SoundType) {
    if (!this.enabled) return

    switch (soundType) {
      case 'click':
        this.playTone(800, 0.05, 'sine', { attack: 0.001, decay: 0.02, sustain: 0.3, release: 0.03 })
        break

      case 'success':
        this.playSequence([
          { freq: 523.25, duration: 0.1, type: 'sine' },
          { freq: 659.25, duration: 0.1, type: 'sine', delay: 80 },
          { freq: 783.99, duration: 0.15, type: 'sine', delay: 80 }
        ])
        break

      case 'error':
        this.playSequence([
          { freq: 300, duration: 0.1, type: 'sawtooth' },
          { freq: 250, duration: 0.15, type: 'sawtooth', delay: 100 }
        ])
        break

      case 'warning':
        this.playSequence([
          { freq: 440, duration: 0.1, type: 'square' },
          { freq: 440, duration: 0.1, type: 'square', delay: 150 }
        ])
        break

      case 'notification':
        this.playSequence([
          { freq: 659.25, duration: 0.08, type: 'sine' },
          { freq: 783.99, duration: 0.12, type: 'sine', delay: 70 }
        ])
        break

      case 'unlock':
        this.playSequence([
          { freq: 523.25, duration: 0.08, type: 'sine' },
          { freq: 659.25, duration: 0.08, type: 'sine', delay: 60 },
          { freq: 783.99, duration: 0.08, type: 'sine', delay: 60 },
          { freq: 1046.50, duration: 0.15, type: 'sine', delay: 60 }
        ])
        break

      case 'lock':
        this.playSequence([
          { freq: 783.99, duration: 0.08, type: 'sine' },
          { freq: 659.25, duration: 0.08, type: 'sine', delay: 60 },
          { freq: 523.25, duration: 0.12, type: 'sine', delay: 60 }
        ])
        break

      case 'income':
        this.playChord([523.25, 659.25, 783.99], 0.2, 'sine')
        break

      case 'expense':
        this.playSequence([
          { freq: 440, duration: 0.15, type: 'triangle' }
        ])
        break

      case 'transfer':
        this.playSequence([
          { freq: 587.33, duration: 0.08, type: 'sine' },
          { freq: 659.25, duration: 0.08, type: 'sine', delay: 70 },
          { freq: 587.33, duration: 0.08, type: 'sine', delay: 70 }
        ])
        break

      case 'navigation':
        this.playTone(600, 0.04, 'sine', { attack: 0.001, decay: 0.01, sustain: 0.5, release: 0.03 })
        break

      case 'focus':
        this.playTone(700, 0.03, 'sine', { attack: 0.001, decay: 0.01, sustain: 0.4, release: 0.02 })
        break

      case 'hover':
        this.playTone(900, 0.02, 'sine', { attack: 0.001, decay: 0.005, sustain: 0.3, release: 0.015 })
        break

      case 'delete':
        this.playSequence([
          { freq: 400, duration: 0.1, type: 'sawtooth' },
          { freq: 300, duration: 0.1, type: 'sawtooth', delay: 80 },
          { freq: 200, duration: 0.15, type: 'sawtooth', delay: 80 }
        ])
        break

      case 'save':
        this.playSequence([
          { freq: 659.25, duration: 0.08, type: 'sine' },
          { freq: 783.99, duration: 0.12, type: 'sine', delay: 60 }
        ])
        break

      case 'budget-warning':
        this.playSequence([
          { freq: 440, duration: 0.12, type: 'triangle' },
          { freq: 523.25, duration: 0.12, type: 'triangle', delay: 100 }
        ])
        break

      case 'budget-critical':
        this.playSequence([
          { freq: 440, duration: 0.1, type: 'square' },
          { freq: 392, duration: 0.1, type: 'square', delay: 90 },
          { freq: 440, duration: 0.15, type: 'square', delay: 90 }
        ])
        break

      case 'budget-exceeded':
        this.playSequence([
          { freq: 329.63, duration: 0.15, type: 'sawtooth' },
          { freq: 293.66, duration: 0.15, type: 'sawtooth', delay: 120 },
          { freq: 261.63, duration: 0.2, type: 'sawtooth', delay: 120 }
        ])
        break

      case 'milestone':
        this.playSequence([
          { freq: 523.25, duration: 0.1, type: 'sine' },
          { freq: 659.25, duration: 0.1, type: 'sine', delay: 80 },
          { freq: 783.99, duration: 0.1, type: 'sine', delay: 80 },
          { freq: 1046.50, duration: 0.2, type: 'sine', delay: 80 }
        ])
        break

      case 'dialog-open':
        this.playSequence([
          { freq: 659.25, duration: 0.06, type: 'sine' },
          { freq: 783.99, duration: 0.08, type: 'sine', delay: 50 }
        ])
        break

      case 'dialog-close':
        this.playSequence([
          { freq: 783.99, duration: 0.06, type: 'sine' },
          { freq: 659.25, duration: 0.08, type: 'sine', delay: 50 }
        ])
        break

      case 'tab-change':
        this.playTone(650, 0.05, 'sine', { attack: 0.001, decay: 0.015, sustain: 0.4, release: 0.035 })
        break

      case 'filter-toggle':
        this.playTone(550, 0.06, 'triangle', { attack: 0.005, decay: 0.02, sustain: 0.5, release: 0.035 })
        break

      case 'category-toggle':
        this.playSequence([
          { freq: 523.25, duration: 0.05, type: 'sine' },
          { freq: 659.25, duration: 0.06, type: 'sine', delay: 40 }
        ])
        break

      case 'export':
        this.playSequence([
          { freq: 659.25, duration: 0.08, type: 'sine' },
          { freq: 783.99, duration: 0.08, type: 'sine', delay: 70 },
          { freq: 1046.50, duration: 0.12, type: 'sine', delay: 70 }
        ])
        break

      case 'settings-change':
        this.playSequence([
          { freq: 523.25, duration: 0.07, type: 'sine' },
          { freq: 587.33, duration: 0.09, type: 'sine', delay: 60 }
        ])
        break

      case 'volume-change':
        this.playTone(440, 0.05, 'sine', { attack: 0.005, decay: 0.015, sustain: 0.5, release: 0.03 })
        break

      case 'preset-applied':
        this.playSequence([
          { freq: 523.25, duration: 0.06, type: 'sine' },
          { freq: 659.25, duration: 0.06, type: 'sine', delay: 50 },
          { freq: 523.25, duration: 0.08, type: 'sine', delay: 50 }
        ])
        break

      case 'account-created':
        this.playSequence([
          { freq: 523.25, duration: 0.09, type: 'sine' },
          { freq: 659.25, duration: 0.09, type: 'sine', delay: 70 },
          { freq: 783.99, duration: 0.12, type: 'sine', delay: 70 }
        ])
        break

      case 'account-deleted':
        this.playSequence([
          { freq: 523.25, duration: 0.1, type: 'sawtooth' },
          { freq: 392, duration: 0.15, type: 'sawtooth', delay: 90 }
        ])
        break

      case 'goal-created':
        this.playSequence([
          { freq: 587.33, duration: 0.08, type: 'sine' },
          { freq: 659.25, duration: 0.08, type: 'sine', delay: 60 },
          { freq: 783.99, duration: 0.08, type: 'sine', delay: 60 },
          { freq: 880, duration: 0.12, type: 'sine', delay: 60 }
        ])
        break

      case 'goal-completed':
        this.playSequence([
          { freq: 523.25, duration: 0.1, type: 'sine' },
          { freq: 659.25, duration: 0.1, type: 'sine', delay: 80 },
          { freq: 783.99, duration: 0.1, type: 'sine', delay: 80 },
          { freq: 1046.50, duration: 0.15, type: 'sine', delay: 80 },
          { freq: 1318.51, duration: 0.2, type: 'sine', delay: 80 }
        ])
        break

      case 'goal-progress':
        this.playSequence([
          { freq: 659.25, duration: 0.08, type: 'sine' },
          { freq: 783.99, duration: 0.1, type: 'sine', delay: 70 }
        ])
        break

      case 'budget-created':
        this.playSequence([
          { freq: 587.33, duration: 0.08, type: 'triangle' },
          { freq: 659.25, duration: 0.08, type: 'triangle', delay: 65 },
          { freq: 783.99, duration: 0.11, type: 'triangle', delay: 65 }
        ])
        break

      case 'budget-deleted':
        this.playSequence([
          { freq: 440, duration: 0.1, type: 'sawtooth' },
          { freq: 349.23, duration: 0.15, type: 'sawtooth', delay: 85 }
        ])
        break

      case 'chart-loaded':
        this.playSequence([
          { freq: 523.25, duration: 0.05, type: 'sine' },
          { freq: 587.33, duration: 0.05, type: 'sine', delay: 40 },
          { freq: 659.25, duration: 0.06, type: 'sine', delay: 40 }
        ])
        break

      case 'data-refresh':
        this.playTone(700, 0.05, 'sine', { attack: 0.002, decay: 0.02, sustain: 0.4, release: 0.028 })
        break

      case 'keyboard-shortcut':
        this.playTone(750, 0.04, 'square', { attack: 0.001, decay: 0.015, sustain: 0.3, release: 0.025 })
        break

      case 'pin-error':
        this.playSequence([
          { freq: 349.23, duration: 0.12, type: 'square' },
          { freq: 293.66, duration: 0.12, type: 'square', delay: 100 },
          { freq: 261.63, duration: 0.15, type: 'square', delay: 100 }
        ])
        break

      case 'pin-success':
        this.playSequence([
          { freq: 523.25, duration: 0.08, type: 'sine' },
          { freq: 659.25, duration: 0.08, type: 'sine', delay: 60 },
          { freq: 783.99, duration: 0.12, type: 'sine', delay: 60 }
        ])
        break

      case 'private-unlock':
        this.playSequence([
          { freq: 587.33, duration: 0.08, type: 'sine' },
          { freq: 659.25, duration: 0.08, type: 'sine', delay: 60 },
          { freq: 783.99, duration: 0.08, type: 'sine', delay: 60 },
          { freq: 880, duration: 0.08, type: 'sine', delay: 60 },
          { freq: 1046.50, duration: 0.14, type: 'sine', delay: 60 }
        ])
        break

      case 'private-lock':
        this.playSequence([
          { freq: 880, duration: 0.07, type: 'sine' },
          { freq: 783.99, duration: 0.07, type: 'sine', delay: 55 },
          { freq: 659.25, duration: 0.07, type: 'sine', delay: 55 },
          { freq: 587.33, duration: 0.1, type: 'sine', delay: 55 }
        ])
        break

      case 'alert-dismissed':
        this.playSequence([
          { freq: 523.25, duration: 0.06, type: 'sine' },
          { freq: 440, duration: 0.08, type: 'sine', delay: 50 }
        ])
        break

      case 'period-change':
        this.playSequence([
          { freq: 587.33, duration: 0.05, type: 'sine' },
          { freq: 659.25, duration: 0.07, type: 'sine', delay: 45 }
        ])
        break

      default:
        console.warn(`Unknown sound type: ${soundType}`)
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  getEnabled(): boolean {
    return this.enabled
  }

  getVolume(): number {
    return this.volume
  }
}

export const soundSystem = new SoundSystem()
