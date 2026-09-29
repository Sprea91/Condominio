-- =====================================================================
-- CONDOMINIO - Modifica 10: il condòmino segnala "Ho pagato", l'amministratore conferma
-- Da eseguire UNA VOLTA, DOPO 09, in: SQL Editor > New query > Run
-- =====================================================================

-- 1. Dati della segnalazione sulla rata
alter table public.rate
  add column segnalata_il   timestamptz,   -- quando il condòmino ha detto "Ho pagato"
  add column segnalata_nota text,          -- es. "bonifico del 12/03, CRO 1234"
  add column ricevuta_path  text,          -- ricevuta nel bucket "ricevute"
  add column ricevuta_nome  text;

-- 2. Il condòmino segnala il pagamento di UNA SUA rata non ancora pagata
--    (funzione apposta: così non può toccare importo, data di pagamento ecc.)
create function public.segnala_pagamento(
  p_rata uuid,
  p_nota text default null,
  p_ricevuta_path text default null,
  p_ricevuta_nome text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rate
  set segnalata_il   = now(),
      segnalata_nota = nullif(trim(p_nota), ''),
      ricevuta_path  = p_ricevuta_path,
      ricevuta_nome  = p_ricevuta_nome
  where id = p_rata
    and utente_id = auth.uid()
    and pagata_il is null;
  if not found then
    raise exception 'Rata non trovata o già pagata';
  end if;
end;
$$;

-- Il condòmino ritira la propria segnalazione (se non è ancora stata confermata)
create function public.annulla_segnalazione(p_rata uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rate
  set segnalata_il = null, segnalata_nota = null, ricevuta_path = null, ricevuta_nome = null
  where id = p_rata
    and utente_id = auth.uid()
    and pagata_il is null;
end;
$$;

revoke execute on function public.segnala_pagamento(uuid, text, text, text) from public, anon;
grant  execute on function public.segnala_pagamento(uuid, text, text, text) to authenticated;
revoke execute on function public.annulla_segnalazione(uuid) from public, anon;
grant  execute on function public.annulla_segnalazione(uuid) to authenticated;


-- 3. Archivio delle ricevute: ognuno carica nella propria cartella (ricevute/<id utente>/...),
--    le vedono solo lui e l'amministratore
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ricevute', 'ricevute', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "ricevute: caricamento proprio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ricevute' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ricevute: lettura propria o admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'ricevute' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create policy "ricevute: eliminazione propria o admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ricevute' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
