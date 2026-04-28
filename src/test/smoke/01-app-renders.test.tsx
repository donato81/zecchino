import { screen } from '@testing-library/react'
import { renderApp } from './test-utils'

describe('01 — App renders', () => {
  it('dovrebbe mostrare la schermata di autenticazione al mount', async () => {
    renderApp()

    // Radix Dialog nasconde il background con aria-hidden; verifichiamo
    // l'esistenza del contenitore tramite querySelector diretto
    const authMain = document.querySelector('[role="main"][aria-label*="Schermata di autenticazione"]')
    expect(authMain).not.toBeNull()

    await screen.findByRole('dialog')
    await screen.findByText(/Imposta PIN Globale/i)
    screen.getByText(/Crea un PIN per proteggere l'applicazione/i)
  })
})
