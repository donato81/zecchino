import { supabase } from '../client'
import { RepositoryError, type DbBudget } from '../types'
import type { Budget, BudgetPeriod } from '../../types'

function toClient(row: DbBudget): Budget {
  return {
    id: row.id,
    nome: row.nome,
    importoTarget: row.importo_target,
    periodo: row.periodo as BudgetPeriod,
    categoriaId: row.categoria_id ?? undefined,
    contoId: row.conto_id ?? undefined,
    dataInizio: row.data_inizio,
    dataFine: row.data_fine,
    attivo: row.attivo,
  }
}

function toDb(data: Partial<Omit<Budget, 'id'>>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data.nome !== undefined) out.nome = data.nome
  if (data.importoTarget !== undefined) out.importo_target = data.importoTarget
  if (data.periodo !== undefined) out.periodo = data.periodo
  if ('categoriaId' in data) out.categoria_id = data.categoriaId ?? null
  if ('contoId' in data) out.conto_id = data.contoId ?? null
  if (data.dataInizio !== undefined) out.data_inizio = data.dataInizio
  if (data.dataFine !== undefined) out.data_fine = data.dataFine
  if (data.attivo !== undefined) out.attivo = data.attivo
  return out
}

async function getUid(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new RepositoryError('Utente non autenticato')
  return user.id
}

export async function getAll(): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budget')
    .select('*')
    .order('data_inizio', { ascending: false })
  if (error) throw new RepositoryError(error)
  return (data as DbBudget[]).map(toClient)
}

export async function getById(id: string): Promise<Budget> {
  const { data, error } = await supabase
    .from('budget')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbBudget)
}

export async function create(input: Omit<Budget, 'id'>): Promise<Budget> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('budget')
    .insert({ ...toDb(input), user_id: uid })
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbBudget)
}

export async function update(id: string, input: Partial<Omit<Budget, 'id'>>): Promise<Budget> {
  const { data, error } = await supabase
    .from('budget')
    .update(toDb(input))
    .eq('id', id)
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbBudget)
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('budget')
    .delete()
    .eq('id', id)
  if (error) throw new RepositoryError(error)
}
