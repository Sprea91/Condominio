-- =====================================================================
-- CONDOMINIO - Modifica 14: sezione Preventivi
-- Una "richiesta" (es. "Rifacimento tetto") raccoglie i preventivi di più ditte.
-- Tutti i condòmini approvati vedono tutto; aggiungere/modificare segue il permesso "preventivi".
-- Da eseguire UNA VOLTA, DOPO 13, in: SQL Editor > New query > Run
-- =====================================================================

create table public.preventivi_richieste (
  id           uuid primary key default gen_random_uuid(),
  titolo       text not null,
  descrizione  text,
  chiusa       boolean not null default false,
  sondaggio_id uuid references public.sondaggi (id) on delete set null,  -- se è stata messa ai voti
  autore_id    uuid references public.profili (id) on delete set null default auth.uid(),
  creato_il    timestamptz not null default now()
);

create table public.preventivi (
  id              uuid primary key default gen_random_uuid(),
  richiesta_id    uuid not null references public.preventivi_richieste (id) on delete cascade,
  ditta           text not null,
  importo         numeric(12,2) check (importo is null or importo >= 0),
  data_preventivo date,
  valido_fino     date,
  descrizione     text,
  stato           text not null default 'in_valutazione'
                  check (stato in ('in_valutazione', 'accettato', 'scartato')),
  file_path       text,           -- PDF nel bucket "documenti" (cartella offerte/)
  file_nome       text,
  autore_id       uuid references public.profili (id) on delete set null default auth.uid(),
  creato_il       timestamptz not null default now()
);

-- Permesso (aperto a tutti, come deciso)
insert into public.impostazioni (chiave, valore) values ('permesso_preventivi', 'tutti')
on conflict (chiave) do nothing;

alter table public.preventivi_richieste enable row level security;
alter table public.preventivi           enable row level security;

create policy "richieste: lettura" on public.preventivi_richieste
  for select to authenticated using (public.is_approvato());
create policy "richieste: aggiunta" on public.preventivi_richieste
  for insert to authenticated with check (public.permesso('preventivi'));
create policy "richieste: modifica" on public.preventivi_richieste
  for update to authenticated using (public.permesso('preventivi')) with check (public.permesso('preventivi'));
create policy "richieste: eliminazione" on public.preventivi_richieste
  for delete to authenticated using (public.is_admin() or autore_id = auth.uid());

create policy "preventivi: lettura" on public.preventivi
  for select to authenticated using (public.is_approvato());
create policy "preventivi: aggiunta" on public.preventivi
  for insert to authenticated with check (public.permesso('preventivi'));
create policy "preventivi: modifica" on public.preventivi
  for update to authenticated using (public.permesso('preventivi')) with check (public.permesso('preventivi'));
create policy "preventivi: eliminazione" on public.preventivi
  for delete to authenticated using (public.is_admin() or autore_id = auth.uid());

-- File dei preventivi nella cartella "offerte/" del bucket documenti
drop policy "file documenti: caricamento" on storage.objects;
create policy "file documenti: caricamento" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documenti' and (
      public.is_admin()
      or ((storage.foldername(name))[1] = 'archivio' and public.permesso('documenti'))
      or ((storage.foldername(name))[1] = 'lavori'   and public.permesso('lavori'))
      or ((storage.foldername(name))[1] = 'offerte'  and public.permesso('preventivi'))
    )
  );
