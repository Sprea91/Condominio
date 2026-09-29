-- =====================================================================
-- CONDOMINIO - Modifica 08: permessi condivisi
-- L'amministratore sceglie quali azioni possono fare TUTTI i condòmini approvati
-- (pannello "Permessi" nella Gestione condòmini). Eliminare resta all'amministratore
-- o a chi ha inserito la cosa. Ogni cambio di stato dei guasti viene registrato.
-- Da eseguire UNA VOLTA, DOPO 07, in: SQL Editor > New query > Run
-- =====================================================================

-- 1. Interruttori dei permessi ('tutti' = tutti i condòmini, 'admin' = solo amministratore)
insert into public.impostazioni (chiave, valore) values
  ('permesso_guasti_stato', 'tutti'),
  ('permesso_numeri',       'tutti'),
  ('permesso_documenti',    'tutti'),
  ('permesso_lavori',       'tutti'),
  ('permesso_scadenze',     'tutti')
on conflict (chiave) do nothing;

-- L'utente collegato può fare questa azione? (sempre sì per l'amministratore)
create function public.permesso(p_azione text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or (
    public.is_approvato() and exists (
      select 1 from public.impostazioni
      where chiave = 'permesso_' || p_azione and valore = 'tutti'
    )
  );
$$;


-- 2. GUASTI: cambio di stato secondo il permesso + storico dei cambiamenti
alter table public.guasti add column aggiornato_da uuid references public.profili (id) on delete set null;

create table public.guasti_storia (
  id         uuid primary key default gen_random_uuid(),
  guasto_id  uuid not null references public.guasti (id) on delete cascade,
  stato      text not null,
  nota       text,
  autore_id  uuid references public.profili (id) on delete set null,
  creato_il  timestamptz not null default now()
);

alter table public.guasti_storia enable row level security;
create policy "storia guasti: lettura" on public.guasti_storia
  for select to authenticated using (public.is_approvato());

-- Registra chi ha cambiato lo stato o la nota (scrive il database, non l'app)
create function public.registra_storia_guasto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.aggiornato_da = auth.uid();
  if new.stato is distinct from old.stato or new.nota_admin is distinct from old.nota_admin then
    insert into public.guasti_storia (guasto_id, stato, nota, autore_id)
    values (new.id, new.stato, new.nota_admin, auth.uid());
  end if;
  return new;
end;
$$;

create trigger guasti_storia_modifiche
  before update on public.guasti
  for each row execute function public.registra_storia_guasto();

drop policy "guasti: admin modifica" on public.guasti;
create policy "guasti: modifica stato" on public.guasti
  for update to authenticated
  using (public.permesso('guasti_stato'))
  with check (public.permesso('guasti_stato'));


-- 3. NUMERI UTILI
alter table public.numeri_utili add column autore_id uuid references public.profili (id) on delete set null default auth.uid();

drop policy "numeri_utili: admin gestisce" on public.numeri_utili;
create policy "numeri_utili: aggiunta" on public.numeri_utili
  for insert to authenticated with check (public.permesso('numeri'));
create policy "numeri_utili: modifica" on public.numeri_utili
  for update to authenticated using (public.permesso('numeri')) with check (public.permesso('numeri'));
create policy "numeri_utili: eliminazione" on public.numeri_utili
  for delete to authenticated using (public.is_admin() or autore_id = auth.uid());


-- 4. DOCUMENTI
drop policy "documenti: admin gestisce" on public.documenti;
create policy "documenti: caricamento" on public.documenti
  for insert to authenticated with check (public.permesso('documenti'));
create policy "documenti: modifica" on public.documenti
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "documenti: eliminazione" on public.documenti
  for delete to authenticated using (public.is_admin() or autore_id = auth.uid());


-- 5. STORICO LAVORI (+ stato: in programma / in corso / finito)
alter table public.lavori
  add column stato text not null default 'finito'
  check (stato in ('programmato', 'in_corso', 'finito'));
alter table public.lavori_allegati add column autore_id uuid references public.profili (id) on delete set null default auth.uid();

drop policy "lavori: admin gestisce" on public.lavori;
create policy "lavori: aggiunta" on public.lavori
  for insert to authenticated with check (public.permesso('lavori'));
create policy "lavori: modifica" on public.lavori
  for update to authenticated using (public.permesso('lavori')) with check (public.permesso('lavori'));
create policy "lavori: eliminazione" on public.lavori
  for delete to authenticated using (public.is_admin() or autore_id = auth.uid());

drop policy "lavori_allegati: admin gestisce" on public.lavori_allegati;
create policy "lavori_allegati: aggiunta" on public.lavori_allegati
  for insert to authenticated with check (public.permesso('lavori'));
create policy "lavori_allegati: eliminazione" on public.lavori_allegati
  for delete to authenticated using (public.is_admin() or autore_id = auth.uid());


-- 6. SCADENZE
alter table public.scadenze add column autore_id uuid references public.profili (id) on delete set null default auth.uid();

drop policy "scadenze: admin gestisce" on public.scadenze;
create policy "scadenze: aggiunta" on public.scadenze
  for insert to authenticated with check (public.permesso('scadenze'));
create policy "scadenze: modifica" on public.scadenze
  for update to authenticated using (public.permesso('scadenze')) with check (public.permesso('scadenze'));
create policy "scadenze: eliminazione" on public.scadenze
  for delete to authenticated using (public.is_admin() or autore_id = auth.uid());


-- 7. FILE nel bucket "documenti": la prima cartella del percorso dice di che cosa si tratta
--    archivio/...   -> documenti     lavori/...  -> storico lavori     preventivi/... -> solo admin
drop policy "file documenti: admin carica" on storage.objects;
create policy "file documenti: caricamento" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documenti' and (
      public.is_admin()
      or ((storage.foldername(name))[1] = 'archivio' and public.permesso('documenti'))
      or ((storage.foldername(name))[1] = 'lavori' and public.permesso('lavori'))
    )
  );

-- Chi ha caricato un file può anche eliminarlo (oltre all'amministratore)
drop policy "file documenti: admin elimina" on storage.objects;
create policy "file documenti: eliminazione" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documenti' and (public.is_admin() or owner = auth.uid()));
