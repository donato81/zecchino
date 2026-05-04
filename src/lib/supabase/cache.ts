export type CacheTable = 'conti' | 'transazioni' | 'categorie' | 'budget' | 'obiettivi_risparmio'

export type CacheEntry<T> = {
  data: T
  cachedAt: string
  version: number
}

const CACHE_PREFIX = 'zecchino_cache'
const CACHE_VERSION = 1

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const CACHE_TABLES: CacheTable[] = ['conti', 'transazioni', 'categorie', 'budget', 'obiettivi_risparmio']

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function getCacheKey(userId: string, table: CacheTable): string {
  return `${CACHE_PREFIX}_${userId}_${table}`
}

export function writeCache<T>(userId: string, table: CacheTable, data: T): void {
  const storage = getStorage()
  if (!storage) return

  const entry: CacheEntry<T> = {
    data,
    cachedAt: new Date().toISOString(),
    version: CACHE_VERSION,
  }

  storage.setItem(getCacheKey(userId, table), JSON.stringify(entry))
}

export function readCache<T>(userId: string, table: CacheTable): CacheEntry<T> | null {
  const storage = getStorage()
  if (!storage) return null

  const raw = storage.getItem(getCacheKey(userId, table))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<CacheEntry<T>>
    if (
      parsed.version !== CACHE_VERSION ||
      typeof parsed.cachedAt !== 'string' ||
      !('data' in parsed)
    ) {
      storage.removeItem(getCacheKey(userId, table))
      return null
    }

    return parsed as CacheEntry<T>
  } catch {
    storage.removeItem(getCacheKey(userId, table))
    return null
  }
}

export function isCacheStale(userId: string, table: CacheTable, ttlMs = CACHE_TTL_MS): boolean {
  const entry = readCache(userId, table)
  if (!entry) return true
  return Date.now() - Date.parse(entry.cachedAt) > ttlMs
}

export function invalidateCache(userId: string): void {
  const storage = getStorage()
  if (!storage) return

  CACHE_TABLES.forEach((table) => {
    storage.removeItem(getCacheKey(userId, table))
  })
}