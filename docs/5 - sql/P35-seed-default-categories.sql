-- P35 — Seed categorie predefinite
-- Funzione idempotente: può essere rieseguita senza duplicare dati.
-- Va applicata manualmente dalla Supabase Dashboard prima del Passo D.

CREATE OR REPLACE FUNCTION seed_default_categories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cat RECORD;
  categorie_template JSONB := '[
    {"nome": "Stipendio",               "tipo": "entrata"},
    {"nome": "Freelance",               "tipo": "entrata"},
    {"nome": "Rimborso",                "tipo": "entrata"},
    {"nome": "Regalo",                  "tipo": "entrata"},
    {"nome": "Rendita",                 "tipo": "entrata"},
    {"nome": "Altro (entrata)",         "tipo": "entrata"},
    {"nome": "Spesa alimentare",        "tipo": "uscita"},
    {"nome": "Ristorante/Bar",          "tipo": "uscita"},
    {"nome": "Bollette",                "tipo": "uscita"},
    {"nome": "Affitto/Mutuo",           "tipo": "uscita"},
    {"nome": "Trasporti",               "tipo": "uscita"},
    {"nome": "Salute/Farmacia",         "tipo": "uscita"},
    {"nome": "Abbigliamento",           "tipo": "uscita"},
    {"nome": "Svago/Intrattenimento",   "tipo": "uscita"},
    {"nome": "Abbonamenti",             "tipo": "uscita"},
    {"nome": "Istruzione",              "tipo": "uscita"},
    {"nome": "Animali",                 "tipo": "uscita"},
    {"nome": "Altro (uscita)",          "tipo": "uscita"}
  ]';
BEGIN
  -- Verifica che ci sia un utente autenticato
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;

  FOR cat IN SELECT * FROM jsonb_to_recordset(categorie_template) AS x(nome TEXT, tipo TEXT)
  LOOP
    -- Inserisce solo se non esiste già una categoria template con stesso nome e tipo
    IF NOT EXISTS (
      SELECT 1 FROM categorie
      WHERE nome = cat.nome
        AND tipo = cat.tipo
        AND predefinita = TRUE
        AND user_id IS NULL
    ) THEN
      INSERT INTO categorie (nome, tipo, predefinita, user_id, icona, colore)
      VALUES (cat.nome, cat.tipo, TRUE, NULL, NULL, NULL);
    END IF;
  END LOOP;
END;
$$;

-- Permette agli utenti autenticati di chiamare la funzione
GRANT EXECUTE ON FUNCTION seed_default_categories() TO authenticated;