-- =====================================================================
-- CONDOMINIO - Modifica 17: data e ora dell'appuntamento negli avvisi
-- (es. "Sopralluogo idraulico": giorno e ora in cui passa la ditta)
-- Da eseguire UNA VOLTA, DOPO 16, in: SQL Editor > New query > Run
-- =====================================================================

alter table public.avvisi
  add column appuntamento       timestamptz,   -- vuoto = avviso senza appuntamento
  add column appuntamento_luogo text;          -- es. "Cantina scala B"
