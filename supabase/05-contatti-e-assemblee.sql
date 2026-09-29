-- =====================================================================
-- CONDOMINIO - Modifica 05: contatti riservati e assemblee
-- Da eseguire UNA VOLTA, DOPO 04, in: SQL Editor > New query > Run
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. CONTATTI RISERVATI (cellulare, contatto di emergenza, consenso privacy)
--    Tabella separata da "profili" perché i profili li vedono tutti,
--    questi dati invece solo l'interessato e l'amministratore.
-- ---------------------------------------------------------------------
create table public.profili_contatti (
  id                  uuid primary key references public.profili (id) on delete cascade,
  cellulare           text,
  emergenza_nome      text,
  emergenza_telefono  text,
  consenso_privacy_il timestamptz,
  aggiornato_il       timestamptz not null default now()
);

alter table public.profili_contatti enable row level security;

create policy "contatti: lettura propria o admin" on public.profili_contatti
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "contatti: inserimento proprio o admin" on public.profili_contatti
  for insert to authenticated with check (id = auth.uid() or public.is_admin());
create policy "contatti: modifica propria o admin" on public.profili_contatti
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create trigger contatti_aggiornato_il
  before update on public.profili_contatti
  for each row execute function public.aggiorna_data_modifica();

-- Alla registrazione salva anche i contatti indicati nell'app
create or replace function public.crea_profilo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profili (id, email, nome, appartamento_richiesto)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'appartamento'), '')
  );

  insert into public.profili_contatti (id, cellulare, emergenza_nome, emergenza_telefono, consenso_privacy_il)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'cellulare'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'emergenza_nome'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'emergenza_telefono'), ''),
    case when new.raw_user_meta_data ->> 'consenso_privacy' = 'true' then now() end
  );
  return new;
end;
$$;

-- Riga vuota di contatti per chi si era già registrato prima di questa modifica
insert into public.profili_contatti (id)
select id from public.profili
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 2. ASSEMBLEE
-- ---------------------------------------------------------------------
create table public.assemblee (
  id                uuid primary key default gen_random_uuid(),
  titolo            text not null,
  data_ora          timestamptz not null,
  luogo             text,
  link_online       text,          -- es. link Zoom/Meet se si fa anche a distanza
  ordine_del_giorno text,          -- un punto per riga
  testo             text,          -- testo della convocazione (si può incollare l'email)
  autore_id         uuid references public.profili (id) on delete set null default auth.uid(),
  creato_il         timestamptz not null default now()
);

create table public.assemblee_allegati (
  id            uuid primary key default gen_random_uuid(),
  assemblea_id  uuid not null references public.assemblee (id) on delete cascade,
  categoria     text not null default 'convocazione'
                check (categoria in ('convocazione', 'verbale', 'altro')),
  percorso      text not null,     -- percorso del file nel bucket "assemblee"
  nome_file     text not null,
  tipo_mime     text not null,
  creato_il     timestamptz not null default now()
);

-- Conferma di presenza: una risposta per condòmino per assemblea
create table public.presenze (
  assemblea_id  uuid not null references public.assemblee (id) on delete cascade,
  utente_id     uuid not null references public.profili (id) on delete cascade default auth.uid(),
  risposta      text not null check (risposta in ('presente', 'assente', 'delega')),
  delegato      text,              -- a chi delega (se risposta = delega)
  aggiornato_il timestamptz not null default now(),
  primary key (assemblea_id, utente_id)
);

create trigger presenze_aggiornato_il
  before update on public.presenze
  for each row execute function public.aggiorna_data_modifica();

alter table public.assemblee          enable row level security;
alter table public.assemblee_allegati enable row level security;
alter table public.presenze           enable row level security;

create policy "assemblee: lettura" on public.assemblee
  for select to authenticated using (public.is_approvato());
create policy "assemblee: admin gestisce" on public.assemblee
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "assemblee_allegati: lettura" on public.assemblee_allegati
  for select to authenticated using (public.is_approvato());
create policy "assemblee_allegati: admin gestisce" on public.assemblee_allegati
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Tutti i condòmini approvati vedono chi partecipa (utile per il numero legale);
-- ognuno risponde solo per sé e solo prima dell'inizio dell'assemblea
create policy "presenze: lettura" on public.presenze
  for select to authenticated using (public.is_approvato());
create policy "presenze: risposta" on public.presenze
  for insert to authenticated with check (
    utente_id = auth.uid() and public.is_approvato() and exists (
      select 1 from public.assemblee a where a.id = assemblea_id and a.data_ora > now()
    )
  );
create policy "presenze: cambio risposta" on public.presenze
  for update to authenticated
  using (utente_id = auth.uid())
  with check (
    utente_id = auth.uid() and exists (
      select 1 from public.assemblee a where a.id = assemblea_id and a.data_ora > now()
    )
  );


-- ---------------------------------------------------------------------
-- 3. ARCHIVIO FILE DELLE ASSEMBLEE (convocazioni, email, verbali)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assemblee', 'assemblee', false, 10485760,
  array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'message/rfc822',                                                          -- email .eml
    'application/vnd.ms-outlook',                                              -- email .msg (Outlook)
    'application/msword',                                                      -- .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy "file assemblee: lettura" on storage.objects
  for select to authenticated
  using (bucket_id = 'assemblee' and public.is_approvato());

create policy "file assemblee: admin carica" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'assemblee' and public.is_admin());

create policy "file assemblee: admin elimina" on storage.objects
  for delete to authenticated
  using (bucket_id = 'assemblee' and public.is_admin());
