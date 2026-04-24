import { screen } from '@testing-library/react'
import { authenticateWithPin, renderApp } from './test-utils'

describe('03 — Dashboard tab', () => {
  it('dovrebbe mostrare le sezioni principali della Dashboard', async () => {
    const { user } = renderApp()

    await authenticateWithPin(user)

    screen.getByRole('heading', { level: 2, name: /I Tuoi Conti/i })
    screen.getByText(/Nessun conto disponibile/i)
    screen.getByRole('heading', { level: 3, name: /Movimenti Recenti/i })
    screen.getByText(/Nessun movimento registrato/i)
  })
})