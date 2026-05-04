import { beforeEach, describe, expect, it } from 'vitest'
import { CACHE_TTL_MS, invalidateCache, isCacheStale, readCache, writeCache } from '@/lib/supabase/cache'

describe('supabase cache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('scrive e rilegge una entry di cache', () => {
    writeCache('user-1', 'conti', [{ id: 'a1', nome: 'Conto base' }])

    expect(readCache<{ id: string; nome: string }[]>('user-1', 'conti')).toMatchObject({
      version: 1,
      data: [{ id: 'a1', nome: 'Conto base' }],
    })
  })

  it('marca stale una entry oltre il TTL', () => {
    writeCache('user-1', 'transazioni', [{ id: 't1' }])
    localStorage.setItem(
      'zecchino_cache_user-1_transazioni',
      JSON.stringify({
        version: 1,
        cachedAt: new Date(Date.now() - CACHE_TTL_MS - 1).toISOString(),
        data: [{ id: 't1' }],
      })
    )

    expect(isCacheStale('user-1', 'transazioni', CACHE_TTL_MS)).toBe(true)
  })

  it('invalida tutte le tabelle per utente al logout', () => {
    writeCache('user-1', 'conti', [{ id: 'a1' }])
    writeCache('user-1', 'budget', [{ id: 'b1' }])

    invalidateCache('user-1')

    expect(readCache('user-1', 'conti')).toBeNull()
    expect(readCache('user-1', 'budget')).toBeNull()
  })
})