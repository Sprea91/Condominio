-- =====================================================================
-- CONDOMINIO - Modifica 16: ditta anche su guasti e movimenti
-- (serve alla rubrica delle ditte e al loro storico)
-- Da eseguire UNA VOLTA, DOPO 15, in: SQL Editor > New query > Run
-- =====================================================================

alter table public.guasti    add column ditta text;   -- ditta incaricata della riparazione
alter table public.movimenti add column ditta text;   -- fornitore / ditta pagata (o che ha pagato)
