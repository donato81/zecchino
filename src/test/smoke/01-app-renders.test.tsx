import { renderApp } from './test-utils'

describe('01 — App renders', () => {
  it('dovrebbe montarsi senza crash', () => {
    // Test intenzionalmente neutro: verifica solo che l'app si monti.
    // I dettagli del flusso di autenticazione hanno test dedicati e cambieranno in P27.
    const { container } = renderApp()

    expect(document.body).not.toBeEmptyDOMElement()
    expect(container.parentElement).toBe(document.body)
  })
})
