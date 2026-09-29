-- =====================================================================
-- CONDOMINIO - Modifica 03: l'amministratore può rifiutare una registrazione
-- Da eseguire UNA VOLTA, DOPO 02, in: SQL Editor > New query > Run
--
-- Cancella l'account (e di conseguenza il profilo) di chi si è registrato
-- ma NON è ancora stato approvato. Gli utenti approvati non si toccano.
-- =====================================================================

create function public.rifiuta_registrazione(p_utente uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo l''amministratore può rifiutare una registrazione';
  end if;

  delete from auth.users u
  using public.profili p
  where u.id = p.id
    and p.id = p_utente
    and not p.approvato;
end;
$$;

revoke execute on function public.rifiuta_registrazione(uuid) from public, anon;
grant  execute on function public.rifiuta_registrazione(uuid) to authenticated;
