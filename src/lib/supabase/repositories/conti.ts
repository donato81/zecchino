import { supabase } from '../client'
import { RepositoryError, type DbAccount } from '../types'
import type { Account } from '../../types'

function toClient(row: DbAccount): Account {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo as Account['tipo'],
    saldoIniziale: row.saldo_iniziale,
    valuta: row.valuta,
    isPrivato: row.is_privato,
    dataCreazione: row.data_creazione,
    archiviato: row.archiviato,
  }
}

function toDb(data: Partial<Omit<Account, 'id'>>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data.nome !== undefined) out.nome = data.nome
  if (data.tipo !== undefined) out.tipo = data.tipo
  if (data.saldoIniziale !== undefined) out.saldo_iniziale = data.saldoIniziale
  if (data.valuta !== undefined) out.valuta = data.valuta
  if (data.isPrivato !== undefined) out.is_privato = data.isPrivato
  if (data.dataCreazione !== undefined) out.data_creazione = data.dataCreazione
  return out
}

async function getUid(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new RepositoryError('Utente non autenticato')
  return user.id
}

export async function getAll(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('conti')
    .select('*')
    .order('data_creazione', { ascending: true })
  if (error) throw new RepositoryError(error)
  return (data as DbAccount[]).map(toClient)
}

export async function getById(id: string): Promise<Account> {
  const { data, error } = await supabase
    .from('conti')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbAccount)
}

export async function create(input: Omit<Account, 'id'>): Promise<Account> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('conti')
    .insert({ ...toDb(input), user_id: uid })
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbAccount)
}

export async function update(id: string, input: Partial<Omit<Account, 'id'>>): Promise<Account> {
  const { data, error } = await supabase
    .from('conti')
    .update(toDb(input))
    .eq('id', id)
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbAccount)
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('conti')
    .delete()
    .eq('id', id)
  if (error) throw new RepositoryError(error)
}
