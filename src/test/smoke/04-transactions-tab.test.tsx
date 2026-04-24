import { screen } from '@testing-library/react'
import { authenticateWithPin, renderApp } from './test-utils'

describe('04 — Transactions tab', () => {
  it('dovrebbe aprire la tab Movimenti e mostrare lo stato vuoto', async () => {
    const { user } = renderApp()

    await authenticateWithPin(user)

    await user.click(screen.getByRole('tab', { name: /^Movimenti\./i }))

    screen.getByRole('heading', { level: 2, name: /Tutti i Movimenti/i })
    screen.getByRole('button', { name: /Aggiungi nuovo movimento/i })
    screen.getByText(/Nessun movimento da visualizzare/i)
  })
})