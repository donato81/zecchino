import { screen } from '@testing-library/react'
import { renderApp, authenticateWithPin } from './test-utils'

describe('02 — Autenticazione PIN', () => {
  it('dovrebbe mostrare la Dashboard dopo l\'autenticazione', async () => {
    const { user } = renderApp()

    await authenticateWithPin(user)

    // Dopo autenticazione il contenuto principale è visibile
    await screen.findByText(/I Tuoi Conti/i)
  })
})
