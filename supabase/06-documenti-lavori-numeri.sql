-- =====================================================================
-- CONDOMINIO - Modifica 06: archivio documenti, storico lavori, numeri utili,
-- commenti sui guasti, preventivi nei sondaggi
-- Da eseguire UNA VOLTA, DOPO 05, in: SQL Editor > New query > Run
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. ARCHIVIO DOCUMENTI (regolamento, polizze, contratti, libretti...)
-- ---------------------------------------------------------------------
create table public.documenti (
  id         uuid primary key default gen_random_uuid(),
  titolo     text not null,
  cartella   text not null default 'Altro',
  percorso   text not null,        -- percorso del file nel bucket "documenti"
  nome_file  text not null,
  tipo_mime  text not null,
  autore_id  uuid references public.profili (id) on delete set null default auth.uid(),
  creato_il  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. STORICO LAVORI (cosa è stato fatto, quando, da chi, garanzia)
-- ---------------------------------------------------------------------
create table public.lavori (
  id            uuid primary key default gen_random_uuid(),
  titolo        text not null,
  descrizione   text,
  data_lavoro   date not null,
  ditta         text,
  importo       numeric(12,2) check (importo is null or importo >= 0),
  garanzia_fino date,              -- fino a quando vale la garanzia (facoltativo)
  autore_id     uuid references public.profili (id) on delete set null default auth.uid(),
  creato_il     timestamptz not null default now()
);

create table public.lavori_allegati (
  id         uuid primary key default gen_random_uuid(),
  lavoro_id  uuid not null references public.lavori (id) on delete cascade,
  categoria  text not null default 'fattura'
             check (categoria in ('fattura', 'garanzia', 'foto', 'altro')),
  percorso   text not null,        -- percorso del file nel bucket "documenti"
  nome_file  text not null,
  tipo_mime  text not null,
  creato_il  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 3. NUMERI UTILI (idraulico, elettricista, ascensore, emergenze...)
-- ---------------------------------------------------------------------
create table public.numeri_utili (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,        -- es. "Idraulica Bianchi"
  categoria  text not null default 'Altro',
  telefono   text,
  email      text,
  note       text,                 -- es. "reperibile anche il sabato"
  creato_il  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. COMMENTI SUI GUASTI
-- ---------------------------------------------------------------------
create table public.guasti_commenti (
  id         uuid primary key default gen_random_uuid(),
  guasto_id  uuid not null references public.guasti (id) on delete cascade,
  autore_id  uuid references public.profili (id) on delete set null default auth.uid(),
  testo      text not null check (length(trim(testo)) > 0),
  creato_il  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 5. PREVENTIVI A CONFRONTO: ogni opzione di un sondaggio può essere un preventivo
-- ---------------------------------------------------------------------
alter table public.sondaggi_opzioni
  add column ditta              text,
  add column importo            numeric(12,2) check (importo is null or importo >= 0),
  add column preventivo_path    text,   -- file nel bucket "documenti"
  add column preventivo_nome    text;


-- =====================================================================
-- SICUREZZA: tutti gli approvati leggono, l'amministratore gestisce.
-- Commenti: ognuno scrive i propri e può cancellarli; l'admin cancella tutto.
-- =====================================================================
alter table public.documenti        enable row level security;
alter table public.lavori           enable row level security;
alter table public.lavori_allegati  enable row level security;
alter table public.numeri_utili     enable row level security;
alter table public.guasti_commenti  enable row level security;

create policy "documenti: lettura" on public.documenti
  for select to authenticated using (public.is_approvato());
create policy "documenti: admin gestisce" on public.documenti
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "lavori: lettura" on public.lavori
  for select to authenticated using (public.is_approvato());
create policy "lavori: admin gestisce" on public.lavori
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "lavori_allegati: lettura" on public.lavori_allegati
  for select to authenticated using (public.is_approvato());
create policy "lavori_allegati: admin gestisce" on public.lavori_allegati
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "numeri_utili: lettura" on public.numeri_utili
  for select to authenticated using (public.is_approvato());
create policy "numeri_utili: admin gestisce" on public.numeri_utili
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "commenti: lettura" on public.guasti_commenti
  for select to authenticated using (public.is_approvato());
create policy "commenti: scrittura" on public.guasti_commenti
  for insert to authenticated with check (autore_id = auth.uid() and public.is_approvato());
create policy "commenti: cancellazione" on public.guasti_commenti
  for delete to authenticated using (autore_id = auth.uid() or public.is_admin());


-- ---------------------------------------------------------------------
-- ARCHIVIO FILE "documenti" (documenti, fatture dei lavori, preventivi)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documenti', 'documenti', false, 10485760,
  array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'message/rfc822', 'application/vnd.ms-outlook',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy "file documenti: lettura" on storage.objects
  for select to authenticated
  using (bucket_id = 'documenti' and public.is_approvato());

create policy "file documenti: admin carica" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documenti' and public.is_admin());

create policy "file documenti: admin elimina" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documenti' and public.is_admin());
