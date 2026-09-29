-- =====================================================================
-- CONDOMINIO - Modifica 15: documenti allegati ai sondaggi (PDF, foto...)
-- Si consultano prima di votare. Li carica l'amministratore.
-- Da eseguire UNA VOLTA, DOPO 14, in: SQL Editor > New query > Run
-- =====================================================================

create table public.sondaggi_allegati (
  id           uuid primary key default gen_random_uuid(),
  sondaggio_id uuid not null references public.sondaggi (id) on delete cascade,
  percorso     text not null,       -- file nel bucket "documenti" (cartella sondaggi/)
  nome_file    text not null,
  tipo_mime    text not null,
  creato_il    timestamptz not null default now()
);

alter table public.sondaggi_allegati enable row level security;

create policy "allegati sondaggi: lettura" on public.sondaggi_allegati
  for select to authenticated using (public.is_approvato());
create policy "allegati sondaggi: admin gestisce" on public.sondaggi_allegati
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
