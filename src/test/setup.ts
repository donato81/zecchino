import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { useState } from 'react'

const kvStore = new Map<string, unknown>()

function cloneValue<T>(value: T): T {
  return structuredClone(value)
}

export function resetTestKvStore() {
  kvStore.clear()
}

export function seedTestKvStore(entries: Record<string, unknown>) {
  for (const [key, value] of Object.entries(entries)) {
    kvStore.set(key, cloneValue(value))
  }
}

vi.mock('@github/spark/hooks', () => ({
  useKV: (key: string, defaultValue: unknown) => {
    const [value, setValue] = useState(() => {
      if (kvStore.has(key)) {
        return cloneValue(kvStore.get(key))
      }

      const initialValue = cloneValue(defaultValue)
      kvStore.set(key, initialValue)
      return initialValue
    })

    const setStoredValue = (nextValue: unknown) => {
      setValue((currentValue) => {
        const resolvedValue = typeof nextValue === 'function'
          ? (nextValue as (previousValue: unknown) => unknown)(currentValue)
          : nextValue

        const clonedValue = cloneValue(resolvedValue)
        kvStore.set(key, clonedValue)
        return clonedValue
      })
    }

    return [value, setStoredValue]
  },
}))

const sparkKvMock = {
  get: vi.fn(async (key: string) => {
    if (kvStore.has(key)) return cloneValue(kvStore.get(key))
    return undefined
  }),
  set: vi.fn(async (key: string, value: unknown) => {
    kvStore.set(key, cloneValue(value))
  }),
  keys: vi.fn(async () => Array.from(kvStore.keys())),
}

Object.defineProperty(window, 'spark', {
  configurable: true,
  value: {
    kv: sparkKvMock,
  },
})

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
  resetTestKvStore()
})
