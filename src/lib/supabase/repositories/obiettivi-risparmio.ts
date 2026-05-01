import { supabase } from '../client'
import { RepositoryError, type DbSavingsGoal } from '../types'
import type { SavingsGoal } from '../../types'

function toClient(row: DbSavingsGoal): SavingsGoal {
  return {
    id: row.id,
    nome: row.nome,
    descrizione: row.descrizione,
    importoTarget: row.importo_target,
    importoCorrente: row.importo_corrente,
    dataInizio: row.data_inizio,
    dataScadenza: row.data_scadenza ?? undefined,
    contoAssociato: row.conto_associato ?? undefined,
    colore: row.colore,
    icona: row.icona,
    completato: row.completato,
    dataCompletamento: row.data_completamento ?? undefined,
  }
}

function toDb(data: Partial<Omit<SavingsGoal, 'id'>>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data.nome !== undefined) out.nome = data.nome
  if (data.descrizione !== undefined) out.descrizione = data.descrizione
  if (data.importoTarget !== undefined) out.importo_target = data.importoTarget
  if (data.importoCorrente !== undefined) out.importo_corrente = data.importoCorrente
  if (data.dataInizio !== undefined) out.data_inizio = data.dataInizio
  if ('dataScadenza' in data) out.data_scadenza = data.dataScadenza ?? null
  if ('contoAssociato' in data) out.conto_associato = data.contoAssociato ?? null
  if (data.colore !== undefined) out.colore = data.colore
  if (data.icona !== undefined) out.icona = data.icona
  if (data.completato !== undefined) out.completato = data.completato
  if ('dataCompletamento' in data) out.data_completamento = data.dataCompletamento ?? null
  return out
}

async function getUid(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new RepositoryError('Utente non autenticato')
  return user.id
}

export async function getAll(): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('obiettivi_risparmio')
    .select('*')
  if (error) throw new RepositoryError(error)
  return (data as DbSavingsGoal[]).map(toClient)
}

export async function getById(id: string): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from('obiettivi_risparmio')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbSavingsGoal)
}

export async function create(input: Omit<SavingsGoal, 'id'>): Promise<SavingsGoal> {
  const uid = await getUid()
  const { data, error } = await supabase
    .from('obiettivi_risparmio')
    .insert({ ...toDb(input), user_id: uid })
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbSavingsGoal)
}

export async function update(
  id: string,
  input: Partial<Omit<SavingsGoal, 'id'>>
): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from('obiettivi_risparmio')
    .update(toDb(input))
    .eq('id', id)
    .select()
    .single()
  if (error) throw new RepositoryError(error)
  return toClient(data as DbSavingsGoal)
}

// Aggiornamento atomico: singola UPDATE che calcola completato e data_completamento
// server-side tramite RPC per evitare race condition su importo_target.
// Richiede funzione PostgreSQL: update_obiettivo_progress(p_id uuid, p_importo numeric)
// che esegue:
//   UPDATE obiettivi_risparmio
//   SET importo_corrente = p_importo,
//       completato = (p_importo >= importo_target),
//       data_completamento = CASE WHEN p_importo >= importo_target THEN now()
//                                 ELSE data_completamento END
//   WHERE id = p_id AND user_id = auth.uid()
//   RETURNING *
export async function updateProgress(id: string, importoCorrente: number): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .rpc('update_obiettivo_progress', {
      p_id: id,
      p_importo: importoCorrente,
    })
  if (error) throw new RepositoryError(error)
  const rows = data as DbSavingsGoal[]
  if (!rows?.length) throw new RepositoryError('Obiettivo non trovato')
  return toClient(rows[0])
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('obiettivi_risparmio')
    .delete()
    .eq('id', id)
  if (error) throw new RepositoryError(error)
}
