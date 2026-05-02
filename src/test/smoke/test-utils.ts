import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { vi } from 'vitest'
import App from '@/App'
import { TooltipProvider } from '@/components/ui/tooltip'
import { resetTestKvStore, seedTestKvStore } from '../setup'

type MockAuthState = {
  user: { id: string; email: string } | null
  session: null
  isAuthReady: boolean
  isAuthenticated: boolean
  needsOnboarding: boolean
  inactivityTimeout: number
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isPrivateUnlocked: boolean
  setIsPrivateUnlocked: (value: boolean) => void
  showPrivatePinDialog: boolean
  setShowPrivatePinDialog: (value: boolean) => void
  setInactivityTimeout: (minutes: number) => Promise<void>
  handlePrivatePinSubmit: (pin: string, onUnlocked?: () => void) => Promise<void>
}

const authStore = vi.hoisted(() => {
  let state: MockAuthState
  const listeners = new Set<() => void>()

  const store = {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getState() {
      return state
    },
    setState(partial: Partial<MockAuthState>) {
      state = { ...state, ...partial }
      listeners.forEach((listener) => listener())
    },
    reset() {
      state = createState()
      listeners.forEach((listener) => listener())
    },
  }

  function createState(): MockAuthState {
    return {
      user: { id: 'smoke-user', email: 'smoke@example.com' },
      session: null,
      isAuthReady: true,
      isAuthenticated: false,
      needsOnboarding: false,
      inactivityTimeout: 5,
      signIn: async () => {
        store.setState({ isAuthenticated: true })
      },
      signUp: async () => undefined,
      signOut: async () => {
        store.setState({
          isAuthenticated: false,
          isPrivateUnlocked: false,
          showPrivatePinDialog: false,
        })
      },
      resetPassword: async () => undefined,
      isPrivateUnlocked: false,
      setIsPrivateUnlocked: (value: boolean) => {
        store.setState({ isPrivateUnlocked: value })
      },
      showPrivatePinDialog: false,
      setShowPrivatePinDialog: (value: boolean) => {
        store.setState({ showPrivatePinDialog: value })
      },
      setInactivityTimeout: async (minutes: number) => {
        store.setState({ inactivityTimeout: minutes })
      },
      handlePrivatePinSubmit: async (_pin: string, onUnlocked?: () => void) => {
        store.setState({
          isPrivateUnlocked: true,
          showPrivatePinDialog: false,
        })
        onUnlocked?.()
      },
    }
  }

  state = createState()

  return store
})

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/context/AuthContext')>()
  const React = await import('react')

  return {
    ...actual,
    useAuth: () => {
      React.useSyncExternalStore(authStore.subscribe, authStore.getState, authStore.getState)
      return authStore.getState()
    },
  }
})

type RenderAppOptions = {
  initialKv?: Record<string, unknown>
}

export function renderApp(options: RenderAppOptions = {}) {
  resetTestKvStore()
  seedTestKvStore(options.initialKv ?? {})
  authStore.reset()

  const user = userEvent.setup()
  const result = render(
    createElement(TooltipProvider, {
      delayDuration: 200,
      children: createElement(App),
    })
  )
  return { ...result, user }
}

export async function authenticateWithPin(user: ReturnType<typeof userEvent.setup>, pin = '1234') {
  await act(async () => {
    authStore.setState({
      isAuthReady: true,
      isAuthenticated: true,
      needsOnboarding: false,
    })
  })

  await screen.findByText(/I Tuoi Conti/i)
}
