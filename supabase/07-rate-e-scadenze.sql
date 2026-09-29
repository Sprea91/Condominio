-- =====================================================================
-- CONDOMINIO - Modifica 07: rate condominiali, scadenze, impostazioni
-- Da eseguire UNA VOLTA, DOPO 06, in: SQL Editor > New query > Run
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. RATE
--    Una "emissione" (es. "Rata 1° trimestre 2026") crea una rata per ogni condòmino.
--    Ognuno vede solo le proprie rate; l'amministratore vede e gestisce tutto.
-- ---------------------------------------------------------------------
create table public.rate_emissioni (
  id           uuid primary key default gen_random_uuid(),
  titolo       text not null,
  scadenza     date not null,
  totale       numeric(12,2) not null check (totale >= 0),
  ripartizione text not null default 'millesimi'
               check (ripartizione in ('millesimi', 'uguale', 'manuale')),
  note         text,
  autore_id    uuid references public.profili (id) on delete set null default auth.uid(),
  creato_il    timestamptz not null default now()
);

create table public.rate (
  id            uuid primary key default gen_random_uuid(),
  emissione_id  uuid not null references public.rate_emissioni (id) on delete cascade,
  utente_id     uuid not null references public.profili (id) on delete cascade,
  importo       numeric(12,2) not null check (importo >= 0),
  pagata_il     date,              -- vuoto = non ancora pagata
  movimento_id  uuid references public.movimenti (id) on delete set null,  -- entrata registrata nel conto
  creato_il     timestamptz not null default now(),
  unique (emissione_id, utente_id)
);

alter table public.rate_emissioni enable row level security;
alter table public.rate           enable row level security;

create policy "emissioni: lettura" on public.rate_emissioni
  for select to authenticated using (public.is_approvato());
create policy "emissioni: admin gestisce" on public.rate_emissioni
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "rate: lettura propria o admin" on public.rate
  for select to authenticated using (utente_id = auth.uid() or public.is_admin());
create policy "rate: admin gestisce" on public.rate
  for all to authenticated using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 2. SCADENZE (revisione estintori, assicurazione, manutenzione ascensore...)
-- ---------------------------------------------------------------------
create table public.scadenze (
  id          uuid primary key default gen_random_uuid(),
  titolo      text not null,
  data        date not null,
  categoria   text not null default 'Altro',
  ripetizione text not null default 'nessuna'
              check (ripetizione in ('nessuna', 'mensile', 'trimestrale', 'semestrale', 'annuale', 'biennale')),
  note        text,
  creato_il   timestamptz not null default now()
);

alter table public.scadenze enable row level security;

create policy "scadenze: lettura" on public.scadenze
  for select to authenticated using (public.is_approvato());
create policy "scadenze: admin gestisce" on public.scadenze
  for all to authenticated using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 3. IMPOSTAZIONI DEL CONDOMINIO (per ora: IBAN e intestatario per pagare le rate)
-- ---------------------------------------------------------------------
create table public.impostazioni (
  chiave  text primary key,
  valore  text
);

alter table public.impostazioni enable row level security;

create policy "impostazioni: lettura" on public.impostazioni
  for select to authenticated using (public.is_approvato());
create policy "impostazioni: admin gestisce" on public.impostazioni
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.impostazioni (chiave, valore) values
  ('iban', null),
  ('intestatario', null)
on conflict (chiave) do nothing;
