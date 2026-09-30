-- =====================================================================
-- CONDOMINIO - Modifica 18: chi ha segnalato un guasto può modificarlo ed eliminarlo
-- (l'amministratore può sempre; lo stato resta a chi ha il permesso "Stato dei guasti")
-- Da eseguire UNA VOLTA, DOPO 17, in: SQL Editor > New query > Run
-- =====================================================================

drop policy "guasti: modifica stato" on public.guasti;
create policy "guasti: modifica" on public.guasti
  for update to authenticated
  using (public.permesso('guasti_stato') or autore_id = auth.uid())
  with check (public.permesso('guasti_stato') or autore_id = auth.uid());

drop policy "guasti: admin elimina" on public.guasti;
create policy "guasti: eliminazione" on public.guasti
  for delete to authenticated
  using (public.is_admin() or autore_id = auth.uid());

-- Foto: chi ha segnalato il guasto può togliere le foto del proprio guasto
drop policy "guasti_foto: admin elimina" on public.guasti_foto;
create policy "guasti_foto: eliminazione" on public.guasti_foto
  for delete to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.guasti g where g.id = guasto_id and g.autore_id = auth.uid()
    )
  );

-- File delle foto nello Storage: anche chi le ha caricate (cartella con il proprio id)
drop policy "file: admin elimina" on storage.objects;
create policy "file: eliminazione" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avvisi', 'guasti', 'giustificativi') and (
      public.is_admin()
      or (bucket_id = 'guasti' and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );
