import { screen } from '@testing-library/react'
import type { Account } from '@/lib/types'
import { authenticateWithPin, renderApp } from './test-utils'

const privateAccount: Account = {
  id: 'private-account-1',
  nome: 'Cassetta Segreta',
  tipo: 'privato',
  saldoIniziale: 250,
  valuta: 'EUR',
  isPrivato: true,
  dataCreazione: '2026-04-24T00:00:00.000Z',
}

describe('05 — Private account', () => {
  it('dovrebbe mostrare il conto privato solo dopo lo sblocco con PIN dedicato', async () => {
    const { user } = renderApp({
      initialKv: {
        accounts: [privateAccount],
      },
    })

    await authenticateWithPin(user)

    expect(screen.queryByText(/Cassetta Segreta/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Sblocca conto privato/i }))

    screen.getByText(/PIN Conto Privato/i)

    await user.type(screen.getByLabelText(/^PIN$/i), '5678')
    await user.click(screen.getByRole('button', { name: /Conferma/i }))

    await screen.findByText(/Cassetta Segreta/i)
  })
})