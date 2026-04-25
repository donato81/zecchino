import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import App from '@/App'
import { TooltipProvider } from '@/components/ui/tooltip'
import { resetTestKvStore, seedTestKvStore } from '../setup'

type RenderAppOptions = {
  initialKv?: Record<string, unknown>
}

export function renderApp(options: RenderAppOptions = {}) {
  resetTestKvStore()
  seedTestKvStore(options.initialKv ?? {})

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
  const pinField = screen.getByLabelText(/Nuovo PIN/i)
  await user.type(pinField, pin)

  const confirmField = screen.getByLabelText(/Conferma PIN/i)
  await user.type(confirmField, pin)

  const confirmButton = screen.getByRole('button', { name: /Conferma/i })
  await user.click(confirmButton)

  await screen.findByText(/I Tuoi Conti/i)
}
