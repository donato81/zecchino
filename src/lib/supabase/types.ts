// Interfaccia strutturale compatibile con l'errore PostgREST restituito dal client Supabase.
// Il tipo resta locale a questo layer: la compatibilità è garantita dal duck typing.
interface DbError {
  message: string
  code: string
  details: string
  hint: string
}

export class RepositoryError extends Error {
  readonly code: string | null
  readonly details: string | null
  readonly hint: string | null
  readonly pgError?: DbError

  constructor(cause: DbError | string) {
    super(typeof cause === 'string' ? cause : cause.message)
    this.name = 'RepositoryError'
    if (typeof cause === 'string') {
      this.code = null
      this.details = null
      this.hint = null
    } else {
      this.code = cause.code
      this.details = cause.details
      this.hint = cause.hint
      this.pgError = cause
    }
  }
}

export interface TalkBackAdaptations {
  enhancedTouchTargets: boolean
  simplifiedNavigation: boolean
  extendedTimeouts: boolean
  verboseDescriptions: boolean
  highContrastMode: boolean
  reducedMotion: boolean
  autoFocusManagement: boolean
  spatialAudio: boolean
}

// 32 chiavi tipizzate lato client — base P25 + onboarding/on-session + preferenze UI persistite.
export interface UserPreferences {
  session_timeout_minutes?: number
  visible_category_ids?: string[]
  dismissed_budget_alert_ids?: string[]
  display_show_balances: boolean
  display_show_account_icons: boolean
  display_compact_mode: boolean
  display_show_categories: boolean
  display_animations_enabled: boolean
  display_font_size: number
  display_currency_display: string
  display_number_format: string
  display_high_contrast: boolean
  display_show_percentages: boolean
  display_show_transaction_icons: boolean
  display_reduce_motion: boolean
  sr_verbosity: string
  sr_announce_navigation: boolean
  sr_announce_filters: boolean
  sr_announce_form_changes: boolean
  sr_announce_shortcuts: boolean
  sr_announce_balance_changes: boolean
  sr_announce_budget_alerts: boolean
  sr_announce_progress: boolean
  sr_announce_focus_changes: boolean
  sr_announce_list_position: boolean
  sr_announce_delay: number
  sr_reduced_announcements: boolean
  audio_enabled: boolean
  audio_volume: number
  talkback_adaptations: TalkBackAdaptations
  talkback_manual_override: boolean | null
  onboarding_completed?: boolean
}

export interface UserSettings {
  nomeVisualizzato: string | null
  valutaDefault: string
  pinPrivatoHash: string | null
  preferences: UserPreferences
}

// Tipi DB row-level — interni al layer src/lib/supabase/; non importare fuori da questa directory.

export interface DbAccount {
  id: string
  user_id: string
  nome: string
  tipo: string
  saldo_iniziale: number
  valuta: string
  is_privato: boolean
  data_creazione: string
  colore: string | null
  icona: string | null
  archiviato: boolean
  ordine: number | null
  created_at: string
  updated_at: string
}

export interface DbTransaction {
  id: string
  user_id: string
  conto_id: string
  conto_destinazione_id: string | null
  categoria_id: string
  tipo: string
  importo: number
  data: string
  descrizione: string
  note: string | null
  cifrato: boolean
  ricorrente: boolean
  frequenza_ricorrenza: string | null
  ricorrenza_fine: string | null
  created_at: string
  updated_at: string
}

export interface DbCategory {
  id: string
  user_id: string | null
  nome: string
  tipo: string
  predefinita: boolean
  icona: string | null
  colore: string | null
  archiviata: boolean
  created_at: string
  updated_at: string
}

export interface DbBudget {
  id: string
  user_id: string
  nome: string
  importo_target: number
  periodo: string
  categoria_id: string | null
  conto_id: string | null
  data_inizio: string
  data_fine: string
  attivo: boolean
  notifica_soglia: number | null
  created_at: string
  updated_at: string
}

export interface DbSavingsGoal {
  id: string
  user_id: string
  conto_associato: string | null
  nome: string
  descrizione: string
  importo_target: number
  importo_corrente: number
  data_inizio: string
  data_scadenza: string | null
  colore: string
  icona: string
  completato: boolean
  data_completamento: string | null
  created_at: string
  updated_at: string
}

export interface DbUserSettings {
  id: string
  user_id: string
  nome_visualizzato: string | null
  valuta_default: string
  pin_privato_hash: string | null
  preferences: UserPreferences
  created_at: string
  updated_at: string
}
