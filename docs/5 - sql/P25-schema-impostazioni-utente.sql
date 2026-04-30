-- P25 — Schema tabella impostazioni_utente
-- Branch: refactoring-architettura
-- Data: 2026-04-30
-- Riferimento: docs/1 - projects/P25-schema-impostazioni-utente-cifrato.md §3.4
--
-- ISTRUZIONI DI ESECUZIONE:
-- 1. Verificare PRIMA lo schema reale (vedi coding plan P25, §A1).
-- 2. Se la tabella NON esiste: eseguire il blocco CREATE TABLE sotto.
-- 3. Se la tabella ESISTE GIÀ: eseguire solo i blocchi ALTER TABLE necessari
--    per le colonne mancanti o con tipo/default diverso.
-- 4. RLS e trigger vanno sempre eseguiti (sono idempotenti).

-- ============================================================
-- BLOCCO 1 — Creazione tabella (eseguire se la tabella non esiste)
-- ============================================================

CREATE TABLE IF NOT EXISTS impostazioni_utente (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_visualizzato TEXT     NULL,
  valuta_default TEXT        NOT NULL DEFAULT 'EUR',
  pin_privato_hash TEXT      NULL,
  preferences    JSONB       NOT NULL DEFAULT '{
    "display_show_balances": true,
    "display_show_account_icons": true,
    "display_compact_mode": false,
    "display_show_categories": true,
    "display_animations_enabled": true,
    "display_font_size": 100,
    "display_currency_display": "symbol",
    "display_number_format": "standard",
    "display_high_contrast": false,
    "display_show_percentages": true,
    "display_show_transaction_icons": true,
    "display_reduce_motion": false,
    "sr_verbosity": "normale",
    "sr_announce_navigation": true,
    "sr_announce_filters": true,
    "sr_announce_form_changes": false,
    "sr_announce_shortcuts": true,
    "sr_announce_balance_changes": true,
    "sr_announce_budget_alerts": true,
    "sr_announce_progress": true,
    "sr_announce_focus_changes": false,
    "sr_announce_list_position": true,
    "sr_announce_delay": 100,
    "sr_reduced_announcements": false,
    "audio_enabled": true,
    "audio_volume": 0.3,
    "talkback_adaptations": {
      "enhancedTouchTargets": true,
      "simplifiedNavigation": true,
      "extendedTimeouts": true,
      "verboseDescriptions": true,
      "highContrastMode": false,
      "reducedMotion": true,
      "autoFocusManagement": true,
      "spatialAudio": true
    },
    "talkback_manual_override": null
  }'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BLOCCO 2 — ALTER TABLE (eseguire se la tabella esiste già)
-- Adattare in base al confronto colonna per colonna (§A1).
-- Esempi:
-- ALTER TABLE impostazioni_utente ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
-- ALTER TABLE impostazioni_utente ADD COLUMN IF NOT EXISTS pin_privato_hash TEXT NULL;
-- ============================================================

-- ============================================================
-- BLOCCO 3 — Row Level Security
-- ============================================================

ALTER TABLE impostazioni_utente ENABLE ROW LEVEL SECURITY;

-- Rimuove policy esistenti (idempotente)
DROP POLICY IF EXISTS "utente_select_proprie_impostazioni" ON impostazioni_utente;
DROP POLICY IF EXISTS "utente_insert_proprie_impostazioni" ON impostazioni_utente;
DROP POLICY IF EXISTS "utente_update_proprie_impostazioni" ON impostazioni_utente;
DROP POLICY IF EXISTS "utente_delete_proprie_impostazioni" ON impostazioni_utente;

CREATE POLICY "utente_select_proprie_impostazioni"
  ON impostazioni_utente
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "utente_insert_proprie_impostazioni"
  ON impostazioni_utente
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "utente_update_proprie_impostazioni"
  ON impostazioni_utente
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "utente_delete_proprie_impostazioni"
  ON impostazioni_utente
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- BLOCCO 4 — Indice UNIQUE su user_id
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_impostazioni_utente_user_id
  ON impostazioni_utente (user_id);

-- ============================================================
-- BLOCCO 5 — Trigger updated_at
-- Soluzione A (prioritaria): estensione moddatetime — verificare
-- disponibilità con: SELECT * FROM pg_extension WHERE extname = 'moddatetime';
-- Se disponibile, decommentare il blocco A e commentare il blocco B.
-- ============================================================

-- BLOCCO 5A — Trigger via estensione moddatetime (preferito se disponibile)
-- CREATE EXTENSION IF NOT EXISTS moddatetime;
-- DROP TRIGGER IF EXISTS handle_updated_at ON impostazioni_utente;
-- CREATE TRIGGER handle_updated_at
--   BEFORE UPDATE ON impostazioni_utente
--   FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- BLOCCO 5B — Funzione manuale (fallback se moddatetime non disponibile)
CREATE OR REPLACE FUNCTION set_updated_at_impostazioni_utente()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_updated_at ON impostazioni_utente;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON impostazioni_utente
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_impostazioni_utente();

-- ============================================================
-- VERIFICA FINALE — eseguire dopo lo script per confermare
-- ============================================================
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'impostazioni_utente'
-- ORDER BY ordinal_position;
--
-- SELECT * FROM impostazioni_utente LIMIT 1;
