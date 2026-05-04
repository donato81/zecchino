import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'

class MockGainNode {
  gain = {
    value: 1,
    linearRampToValueAtTime: vi.fn(),
  }

  connect = vi.fn()
}

class MockOscillatorNode {
  type: OscillatorType = 'sine'
  frequency = { value: 0 }
  connect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

class MockAudioContext {
  state: AudioContextState = 'running'
  currentTime = 0
  destination = {}

  createGain() {
    return new MockGainNode() as unknown as GainNode
  }

  createOscillator() {
    return new MockOscillatorNode() as unknown as OscillatorNode
  }

  resume = vi.fn(async () => undefined)
}

Object.defineProperty(window, 'AudioContext', {
  configurable: true,
  value: MockAudioContext,
})

Object.defineProperty(window, 'webkitAudioContext', {
  configurable: true,
  value: MockAudioContext,
})

// jsdom non implementa window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(navigator, 'vibrate', {
  configurable: true,
  value: vi.fn(),
})

afterEach(() => {
  cleanup()
})
