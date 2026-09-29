-- =====================================================================
-- CONDOMINIO - Modifica 13: storico delle rate
-- Ogni cambiamento di una quota (segnalazione "Ho pagato", conferma, rifiuto, annullamento,
-- modifica dell'importo) viene registrato in automatico dal database.
-- Da eseguire UNA VOLTA, DOPO 12, in: SQL Editor > New query > Run
-- =====================================================================

create table public.rate_storia (
  id         uuid primary key default gen_random_uuid(),
  rata_id    uuid not null references public.rate (id) on delete cascade,
  evento     text not null check (evento in (
               'segnalata', 'segnalazione_ritirata', 'pagata', 'pagamento_annullato', 'importo_modificato')),
  dettaglio  text,               -- es. nota del condòmino o "da 100,00 a 120,00"
  autore_id  uuid references public.profili (id) on delete set null,
  creato_il  timestamptz not null default now()
);

alter table public.rate_storia enable row level security;

-- Il condòmino vede lo storico delle proprie quote, l'amministratore tutto
create policy "storia rate: lettura" on public.rate_storia
  for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.rate r where r.id = rata_id and r.utente_id = auth.uid()
    )
  );

create function public.registra_storia_rata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.segnalata_il is null and new.segnalata_il is not null then
    insert into public.rate_storia (rata_id, evento, dettaglio, autore_id)
    values (new.id, 'segnalata', new.segnalata_nota, auth.uid());
  elsif old.segnalata_il is not null and new.segnalata_il is null and new.pagata_il is null then
    -- ritirata dal condòmino o rifiutata dall'amministratore: "autore" dice chi è stato
    insert into public.rate_storia (rata_id, evento, autore_id)
    values (new.id, 'segnalazione_ritirata', auth.uid());
  end if;

  if old.pagata_il is null and new.pagata_il is not null then
    insert into public.rate_storia (rata_id, evento, dettaglio, autore_id)
    values (new.id, 'pagata', to_char(new.pagata_il, 'DD/MM/YYYY'), auth.uid());
  elsif old.pagata_il is not null and new.pagata_il is null then
    insert into public.rate_storia (rata_id, evento, autore_id)
    values (new.id, 'pagamento_annullato', auth.uid());
  end if;

  if new.importo is distinct from old.importo then
    insert into public.rate_storia (rata_id, evento, dettaglio, autore_id)
    values (
      new.id, 'importo_modificato',
      'da ' || replace(old.importo::text, '.', ',') || ' € a ' || replace(new.importo::text, '.', ',') || ' €',
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger rate_storia_modifiche
  after update on public.rate
  for each row execute function public.registra_storia_rata();
