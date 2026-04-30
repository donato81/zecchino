-- P25 — Trigger cifrato su transazioni e conti
-- Branch: refactoring-architettura
-- Data: 2026-04-30
-- Riferimento: docs/1 - projects/P25-schema-impostazioni-utente-cifrato.md §4.4
--
-- ISTRUZIONI DI ESECUZIONE:
-- Eseguire dopo che lo schema di impostazioni_utente (Passo A) è stato applicato.
-- Le tabelle 'transazioni' e 'conti' devono esistere su Supabase.
-- Verificare che 'transazioni.conto_id' sia FK → 'conti.id'.
-- Verificare che 'conti.is_privato' sia di tipo BOOLEAN.
-- Verificare che 'transazioni.cifrato' sia di tipo BOOLEAN.
--
-- NOTA SICUREZZA: SECURITY DEFINER garantisce che il trigger venga eseguito
-- con i permessi del proprietario della funzione (service role), necessario
-- perché RLS su 'conti' potrebbe altrimenti bloccare la lettura nel
-- contesto del trigger chiamato dall'utente autenticato.

-- ============================================================
-- FUNZIONE 1 — sync_cifrato
-- Sincronizza transazioni.cifrato con conti.is_privato al momento
-- di INSERT o UPDATE sulla tabella transazioni.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_cifrato()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SELECT is_privato
  INTO NEW.cifrato
  FROM conti
  WHERE id = NEW.conto_id;

  -- Se il conto non esiste (edge case: FK violata o conto eliminato), default a FALSE
  IF NOT FOUND THEN
    NEW.cifrato := FALSE;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGER 1 — trg_sync_cifrato
-- Si attiva BEFORE INSERT OR UPDATE su transazioni.
-- Il client non deve includere 'cifrato' nel payload: viene sempre
-- sovrascritto da questa funzione.
-- ============================================================

DROP TRIGGER IF EXISTS trg_sync_cifrato ON transazioni;

CREATE TRIGGER trg_sync_cifrato
BEFORE INSERT OR UPDATE ON transazioni
FOR EACH ROW EXECUTE FUNCTION sync_cifrato();

-- ============================================================
-- FUNZIONE 2 — propagate_cifrato_on_conto_update
-- Propaga il cambiamento di conti.is_privato a tutte le transazioni
-- collegate. Usa IS DISTINCT FROM per evitare UPDATE superflui.
-- ============================================================

CREATE OR REPLACE FUNCTION propagate_cifrato_on_conto_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_privato IS DISTINCT FROM OLD.is_privato THEN
    UPDATE transazioni
    SET cifrato = NEW.is_privato
    WHERE conto_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGER 2 — trg_propagate_cifrato
-- Si attiva AFTER UPDATE OF is_privato su conti.
-- Aggiorna cifrato su tutte le transazioni collegate al conto
-- quando is_privato cambia (es. utente rende privato un conto esistente).
-- ============================================================

DROP TRIGGER IF EXISTS trg_propagate_cifrato ON conti;

CREATE TRIGGER trg_propagate_cifrato
AFTER UPDATE OF is_privato ON conti
FOR EACH ROW EXECUTE FUNCTION propagate_cifrato_on_conto_update();

-- ============================================================
-- VERIFICA POST-ESECUZIONE
-- ============================================================

-- Verifica trigger su transazioni:
-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 'transazioni' AND trigger_name = 'trg_sync_cifrato';

-- Verifica trigger su conti:
-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 'conti' AND trigger_name = 'trg_propagate_cifrato';

-- Test funzionale (sostituire <uuid_conto_privato> e <uuid_utente>):
-- INSERT INTO transazioni (conto_id, user_id, importo, descrizione, data, tipo, categoria_id, cifrato)
-- VALUES ('<uuid_conto_privato>', '<uuid_utente>', 10.00, 'Test P25', now(), 'uscita', NULL, FALSE);
-- SELECT cifrato FROM transazioni WHERE descrizione = 'Test P25';
-- → Atteso: cifrato = TRUE (il trigger ha sovrascritto FALSE con TRUE)

-- Test propagazione (sostituire <uuid_conto>):
-- UPDATE conti SET is_privato = TRUE WHERE id = '<uuid_conto>';
-- SELECT cifrato FROM transazioni WHERE conto_id = '<uuid_conto>';
-- → Atteso: tutte le transazioni del conto hanno cifrato = TRUE
