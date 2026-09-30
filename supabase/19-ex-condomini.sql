-- =====================================================================
-- CONDOMINIO - Modifica 19: ex condòmini (disattivazione) ed eliminazione account
-- Disattivare: la persona non entra più ma voti, rate, presenze e guasti restano.
-- Eliminare: cancella l'account e con lui voti, rate e presenze (solo per account di prova/errore).
-- Da eseguire UNA VOLTA, DOPO 18, in: SQL Editor > New query > Run
-- =====================================================================

alter table public.profili add column disattivato_il timestamptz;  -- valorizzato = ex condòmino

-- Eliminazione definitiva di un account (solo amministratore, mai se stesso)
create function public.elimina_account(p_utente uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può eliminare un account';
  end if;
  if p_utente = auth.uid() then
    raise exception 'Non puoi eliminare il tuo stesso account';
  end if;
  delete from auth.users where id = p_utente;
end;
$$;

revoke execute on function public.elimina_account(uuid) from public, anon;
grant  execute on function public.elimina_account(uuid) to authenticated;
