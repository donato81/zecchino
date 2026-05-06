import { supabase } from '../client'
import { RepositoryError, type DbCategory } from '../types'
import type { Category, CategoryType } from '../../types'

function toClient(row: DbCategory): Category {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo as CategoryType,
    predefinita: row.predefinita,
  }
}

function toDb(data: Partial<Omit<Category, 'id'>>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data.nome !== undefined) out.nome = data.nome
  if (data.tipo !== undefined) out.tipo = data.tipo
  if (data.predefinita !== undefined) out.predefinita = data.predefinita
  return out
}

async function getUid(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new RepositoryError('Utente non autenticato')
  return user.id
}

// Restituisce categorie dell'utente + categorie template (user_id IS NULL).
// La policy RLS deve consentire SELECT su user_id IS NULL OR auth.uid() = user_id.
// Le righe template sono distinguibili da predefinita: true.
export async function getAll(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categorie')
    .select('*')
  if (error) throw new RepositoryError(error)
  return (data as DbCategory[]).map(toClient)
}

export async function create(input: Omit<Category, 'id'>): Promise<Category> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('categorie')
    .insert({ ...toDb(input), user_id: uid })
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbCategory)
}

// Tentativo su riga template (user_id IS NULL) restituisce RepositoryError
// perché RLS blocca l'UPDATE e .single() fallisce con PGRST116 (no rows).
export async function update(id: string, input: Partial<Omit<Category, 'id'>>): Promise<Category> {
  const { data, error } = await supabase
    .from('categorie')
    .update(toDb(input))
    .eq('id', id)
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbCategory)
}

export async function remove(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('categorie')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw new RepositoryError(error)
  if (!data?.length) throw new RepositoryError('Categoria non trovata o non eliminabile')
}

export async function seedDefaultCategories(): Promise<void> {
  const { error } = await supabase.rpc('seed_default_categories')
  if (error) throw new RepositoryError(error)
}