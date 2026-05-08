import { supabase } from '../client'
import { RepositoryError, type DbTransaction } from '../types'
import type { Transaction, TransactionType, RecurrenceFrequency } from '../../types'

export interface TransactionFilters {
  contoId?: string
  categoriaId?: string
  dataInizio?: string
  dataFine?: string
  tipo?: TransactionType
}

function toClient(row: DbTransaction): Transaction {
  return {
    id: row.id,
    data: row.data,
    importo: row.importo,
    tipo: row.tipo as TransactionType,
    contoId: row.conto_id,
    contoDestinazioneId: row.conto_destinazione_id ?? undefined,
    categoriaId: row.categoria_id,
    descrizione: row.descrizione,
    ricorrente: row.ricorrente,
    frequenzaRicorrenza: (row.frequenza_ricorrenza as RecurrenceFrequency) ?? undefined,
    cifrato: row.cifrato,
  }
}

function toDb(data: Partial<Omit<Transaction, 'id' | 'cifrato'>>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data.data !== undefined) out.data = data.data
  if (data.importo !== undefined) out.importo = data.importo
  if (data.tipo !== undefined) out.tipo = data.tipo
  if (data.contoId !== undefined) out.conto_id = data.contoId
  if ('contoDestinazioneId' in data) out.conto_destinazione_id = data.contoDestinazioneId ?? null
  if (data.categoriaId !== undefined && data.categoriaId !== '') out.categoria_id = data.categoriaId || null
  if (data.descrizione !== undefined) out.descrizione = data.descrizione
  if (data.ricorrente !== undefined) out.ricorrente = data.ricorrente
  if ('frequenzaRicorrenza' in data) out.frequenza_ricorrenza = data.frequenzaRicorrenza ?? null
  return out
}

async function getUid(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new RepositoryError('Utente non autenticato')
  return user.id
}

export async function getAll(filtri?: TransactionFilters): Promise<Transaction[]> {
  let query = supabase
    .from('transazioni')
    .select('*')
    .order('data', { ascending: false })
  if (filtri?.contoId) query = query.eq('conto_id', filtri.contoId)
  if (filtri?.categoriaId) query = query.eq('categoria_id', filtri.categoriaId)
  if (filtri?.dataInizio) query = query.gte('data', filtri.dataInizio)
  if (filtri?.dataFine) query = query.lte('data', filtri.dataFine)
  if (filtri?.tipo) query = query.eq('tipo', filtri.tipo)
  const { data, error } = await query
  if (error) throw new RepositoryError(error)
  return (data as DbTransaction[]).map(toClient)
}

export async function getById(id: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transazioni')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbTransaction)
}

export async function create(input: Omit<Transaction, 'id' | 'cifrato'>): Promise<Transaction> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('transazioni')
    .insert({ ...toDb(input), user_id: uid })
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbTransaction)
}

export async function update(
  id: string,
  input: Partial<Omit<Transaction, 'id' | 'cifrato'>>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transazioni')
    .update(toDb(input))
    .eq('id', id)
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbTransaction)
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('transazioni')
    .delete()
    .eq('id', id)
  if (error) throw new RepositoryError(error)
}
