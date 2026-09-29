-- =====================================================================
-- CONDOMINIO - Modifica 12: causale del bonifico per le rate
-- Nel testo si possono usare {appartamento} e {nome}: ogni condòmino vede i propri.
-- Da eseguire UNA VOLTA, DOPO 11, in: SQL Editor > New query > Run
-- =====================================================================

alter table public.rate_emissioni add column causale text;
