-- =====================================================================
-- CONDOMINIO - Schema database Supabase
-- Da incollare UNA VOLTA in: Supabase > SQL Editor > New query > Run
-- (su un progetto nuovo e vuoto)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PROFILI (le 10 utenze)
--    Ogni utente creato in Authentication riceve in automatico un profilo.
--    Appartamento, millesimi e ruolo li imposta l'amministratore.
-- ---------------------------------------------------------------------
create table public.profili (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  nome          text,
  appartamento  text unique,
  millesimi     numeric(7,3) not null default 0 check (millesimi >= 0),
  ruolo         text not null default 'condomino'
                check (ruolo in ('amministratore', 'condomino')),
  creato_il     timestamptz not null default now()
);

-- Crea il profilo quando nasce un nuovo utente
create function public.crea_profilo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profili (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger crea_profilo_dopo_registrazione
  after insert on auth.users
  for each row execute function public.crea_profilo();

-- Funzione di comodo: l'utente collegato è amministratore?
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profili
    where id = auth.uid() and ruolo = 'amministratore'
  );
$$;


-- ---------------------------------------------------------------------
-- 2. BACHECA AVVISI (+ allegati PDF/immagini)
-- ---------------------------------------------------------------------
create table public.avvisi (
  id         uuid primary key default gen_random_uuid(),
  titolo     text not null,
  testo      text not null,
  autore_id  uuid references public.profili (id) on delete set null default auth.uid(),
  creato_il  timestamptz not null default now()
);

create table public.avvisi_allegati (
  id         uuid primary key default gen_random_uuid(),
  avviso_id  uuid not null references public.avvisi (id) on delete cascade,
  percorso   text not null,          -- percorso del file nel bucket "avvisi"
  nome_file  text not null,
  tipo_mime  text not null,
  creato_il  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 3. SEGNALAZIONE GUASTI (+ foto)
-- ---------------------------------------------------------------------
create table public.guasti (
  id             uuid primary key default gen_random_uuid(),
  titolo         text not null,
  descrizione    text not null,
  stato          text not null default 'aperto'
                 check (stato in ('aperto', 'in_lavorazione', 'chiuso')),
  nota_admin     text,
  autore_id      uuid references public.profili (id) on delete set null default auth.uid(),
  creato_il      timestamptz not null default now(),
  aggiornato_il  timestamptz not null default now()
);

create function public.aggiorna_data_modifica()
returns trigger
language plpgsql
as $$
begin
  new.aggiornato_il = now();
  return new;
end;
$$;

create trigger guasti_aggiornato_il
  before update on public.guasti
  for each row execute function public.aggiorna_data_modifica();

create table public.guasti_foto (
  id         uuid primary key default gen_random_uuid(),
  guasto_id  uuid not null references public.guasti (id) on delete cascade,
  percorso   text not null,          -- percorso del file nel bucket "guasti"
  creato_il  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. SONDAGGI (voto per testa o per millesimi)
-- ---------------------------------------------------------------------
create table public.sondaggi (
  id           uuid primary key default gen_random_uuid(),
  domanda      text not null,
  descrizione  text,
  modalita     text not null default 'testa'
               check (modalita in ('testa', 'millesimi')),
  scadenza     timestamptz,          -- vuoto = nessuna scadenza
  chiuso       boolean not null default false,
  autore_id    uuid references public.profili (id) on delete set null default auth.uid(),
  creato_il    timestamptz not null default now()
);

create table public.sondaggi_opzioni (
  id            uuid primary key default gen_random_uuid(),
  sondaggio_id  uuid not null references public.sondaggi (id) on delete cascade,
  testo         text not null,
  ordine        int not null default 0,
  unique (id, sondaggio_id)
);

-- Un voto per utente per sondaggio; l'opzione deve appartenere al sondaggio
create table public.voti (
  sondaggio_id  uuid not null references public.sondaggi (id) on delete cascade,
  opzione_id    uuid not null,
  utente_id     uuid not null references public.profili (id) on delete cascade default auth.uid(),
  creato_il     timestamptz not null default now(),
  primary key (sondaggio_id, utente_id),
  foreign key (opzione_id, sondaggio_id)
    references public.sondaggi_opzioni (id, sondaggio_id) on delete cascade
);

-- Risultati: tutti vedono i totali, ma non chi ha votato cosa
create function public.risultati_sondaggio(p_sondaggio uuid)
returns table (opzione_id uuid, testo text, voti_testa bigint, voti_millesimi numeric)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.testo, count(v.utente_id), coalesce(sum(p.millesimi), 0)
  from public.sondaggi_opzioni o
  left join public.voti v    on v.opzione_id = o.id
  left join public.profili p on p.id = v.utente_id
  where o.sondaggio_id = p_sondaggio
    and auth.uid() is not null
  group by o.id, o.testo, o.ordine
  order by o.ordine;
$$;

revoke execute on function public.risultati_sondaggio(uuid) from public, anon;
grant  execute on function public.risultati_sondaggio(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 5. CONTO SPESE (entrate/uscite + giustificativo)
-- ---------------------------------------------------------------------
create table public.movimenti (
  id                   uuid primary key default gen_random_uuid(),
  data                 date not null default current_date,
  descrizione          text not null,
  categoria            text,
  tipo                 text not null check (tipo in ('entrata', 'uscita')),
  importo              numeric(12,2) not null check (importo > 0),
  giustificativo_path  text,         -- percorso del file nel bucket "giustificativi"
  creato_da            uuid references public.profili (id) on delete set null default auth.uid(),
  creato_il            timestamptz not null default now()
);

create view public.saldo
with (security_invoker = true) as
  select coalesce(sum(case when tipo = 'entrata' then importo else -importo end), 0)::numeric(12,2) as saldo
  from public.movimenti;


-- =====================================================================
-- SICUREZZA (Row Level Security)
-- Regola generale: tutti gli utenti collegati LEGGONO,
-- solo l'amministratore SCRIVE. Eccezioni: guasti e voti.
-- =====================================================================
alter table public.profili          enable row level security;
alter table public.avvisi           enable row level security;
alter table public.avvisi_allegati  enable row level security;
alter table public.guasti           enable row level security;
alter table public.guasti_foto      enable row level security;
alter table public.sondaggi         enable row level security;
alter table public.sondaggi_opzioni enable row level security;
alter table public.voti             enable row level security;
alter table public.movimenti        enable row level security;

-- Profili
create policy "profili: lettura" on public.profili
  for select to authenticated using (true);
create policy "profili: admin gestisce" on public.profili
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Avvisi e allegati
create policy "avvisi: lettura" on public.avvisi
  for select to authenticated using (true);
create policy "avvisi: admin gestisce" on public.avvisi
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "avvisi_allegati: lettura" on public.avvisi_allegati
  for select to authenticated using (true);
create policy "avvisi_allegati: admin gestisce" on public.avvisi_allegati
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Guasti: tutti vedono tutto (evita doppie segnalazioni),
-- ognuno apre i propri, solo l'admin cambia stato o elimina
create policy "guasti: lettura" on public.guasti
  for select to authenticated using (true);
create policy "guasti: apertura" on public.guasti
  for insert to authenticated with check (autore_id = auth.uid());
create policy "guasti: admin modifica" on public.guasti
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "guasti: admin elimina" on public.guasti
  for delete to authenticated using (public.is_admin());

create policy "guasti_foto: lettura" on public.guasti_foto
  for select to authenticated using (true);
create policy "guasti_foto: aggiunta" on public.guasti_foto
  for insert to authenticated with check (
    public.is_admin() or exists (
      select 1 from public.guasti g
      where g.id = guasto_id and g.autore_id = auth.uid()
    )
  );
create policy "guasti_foto: admin elimina" on public.guasti_foto
  for delete to authenticated using (public.is_admin());

-- Sondaggi e opzioni
create policy "sondaggi: lettura" on public.sondaggi
  for select to authenticated using (true);
create policy "sondaggi: admin gestisce" on public.sondaggi
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "sondaggi_opzioni: lettura" on public.sondaggi_opzioni
  for select to authenticated using (true);
create policy "sondaggi_opzioni: admin gestisce" on public.sondaggi_opzioni
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Voti: ognuno vede solo il proprio; si vota (o si ritira il voto)
-- solo se il sondaggio è aperto e non scaduto
create policy "voti: lettura propria" on public.voti
  for select to authenticated using (utente_id = auth.uid() or public.is_admin());
create policy "voti: voto" on public.voti
  for insert to authenticated with check (
    utente_id = auth.uid() and exists (
      select 1 from public.sondaggi s
      where s.id = sondaggio_id
        and not s.chiuso
        and (s.scadenza is null or s.scadenza > now())
    )
  );
create policy "voti: ritiro" on public.voti
  for delete to authenticated using (
    utente_id = auth.uid() and exists (
      select 1 from public.sondaggi s
      where s.id = sondaggio_id
        and not s.chiuso
        and (s.scadenza is null or s.scadenza > now())
    )
  );

-- Movimenti
create policy "movimenti: lettura" on public.movimenti
  for select to authenticated using (true);
create policy "movimenti: admin gestisce" on public.movimenti
  for all to authenticated using (public.is_admin()) with check (public.is_admin());


-- =====================================================================
-- ARCHIVIO FILE (Storage): 3 cartelle private, max 10 MB,
-- solo immagini e PDF
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avvisi',         'avvisi',         false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('guasti',         'guasti',         false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('giustificativi', 'giustificativi', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy "file: lettura" on storage.objects
  for select to authenticated
  using (bucket_id in ('avvisi', 'guasti', 'giustificativi'));

create policy "file: admin carica avvisi e giustificativi" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avvisi', 'giustificativi') and public.is_admin());

-- Le foto dei guasti vanno nella cartella con l'id di chi le carica
create policy "file: foto guasti" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'guasti'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "file: admin elimina" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avvisi', 'guasti', 'giustificativi') and public.is_admin());
