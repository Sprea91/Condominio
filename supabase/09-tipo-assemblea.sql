-- =====================================================================
-- CONDOMINIO - Modifica 09: assemblea ordinaria o straordinaria
-- Da eseguire UNA VOLTA, DOPO 08, in: SQL Editor > New query > Run
-- =====================================================================

alter table public.assemblee
  add column tipo text not null default 'ordinaria'
  check (tipo in ('ordinaria', 'straordinaria'));
