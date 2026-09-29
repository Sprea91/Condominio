-- =====================================================================
-- CONDOMINIO - Modifica 04: migliorie
-- Da eseguire UNA VOLTA, DOPO 03, in: SQL Editor > New query > Run
-- =====================================================================

-- 1. Avvisi "in evidenza" (fissati in cima alla bacheca)
alter table public.avvisi
  add column in_evidenza boolean not null default false;

-- 2. Ogni utente può cambiare il PROPRIO nome (non ruolo, millesimi o appartamento)
create function public.aggiorna_mio_nome(p_nome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Utente non collegato';
  end if;
  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Il nome non può essere vuoto';
  end if;
  update public.profili set nome = trim(p_nome) where id = auth.uid();
end;
$$;

revoke execute on function public.aggiorna_mio_nome(text) from public, anon;
grant  execute on function public.aggiorna_mio_nome(text) to authenticated;
