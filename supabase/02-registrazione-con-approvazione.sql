-- =====================================================================
-- CONDOMINIO - Modifica 02: registrazione libera con approvazione
-- Da eseguire UNA VOLTA, DOPO schema.sql, in: SQL Editor > New query > Run
--
-- Chi si registra dall'app resta "in attesa": vede solo il proprio profilo
-- finché l'amministratore non lo approva e gli assegna appartamento e millesimi.
-- =====================================================================

-- 1. Nuove colonne del profilo
alter table public.profili
  add column approvato              boolean not null default false,
  add column appartamento_richiesto text;   -- quello che dichiara l'utente alla registrazione

-- 2. Alla registrazione salva anche nome e appartamento indicati nell'app
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
  return new;
end;
$$;

-- 3. Funzione di comodo: l'utente collegato è stato approvato?
create function public.is_approvato()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profili
    where id = auth.uid() and approvato
  );
$$;

-- 4. Tutte le letture e le azioni dei condòmini richiedono l'approvazione
alter policy "profili: lettura" on public.profili
  using (id = auth.uid() or public.is_approvato());

alter policy "avvisi: lettura"           on public.avvisi           using (public.is_approvato());
alter policy "avvisi_allegati: lettura"  on public.avvisi_allegati  using (public.is_approvato());
alter policy "guasti: lettura"           on public.guasti           using (public.is_approvato());
alter policy "guasti_foto: lettura"      on public.guasti_foto      using (public.is_approvato());
alter policy "sondaggi: lettura"         on public.sondaggi         using (public.is_approvato());
alter policy "sondaggi_opzioni: lettura" on public.sondaggi_opzioni using (public.is_approvato());
alter policy "movimenti: lettura"        on public.movimenti        using (public.is_approvato());

alter policy "guasti: apertura" on public.guasti
  with check (autore_id = auth.uid() and public.is_approvato());

alter policy "voti: voto" on public.voti
  with check (
    utente_id = auth.uid() and public.is_approvato() and exists (
      select 1 from public.sondaggi s
      where s.id = sondaggio_id
        and not s.chiuso
        and (s.scadenza is null or s.scadenza > now())
    )
  );

alter policy "file: lettura" on storage.objects
  using (bucket_id in ('avvisi', 'guasti', 'giustificativi') and public.is_approvato());

alter policy "file: foto guasti" on storage.objects
  with check (
    bucket_id = 'guasti'
    and public.is_approvato()
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- 5. Risultati dei sondaggi: solo per utenti approvati
create or replace function public.risultati_sondaggio(p_sondaggio uuid)
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
    and public.is_approvato()
  group by o.id, o.testo, o.ordine
  order by o.ordine;
$$;


-- =====================================================================
-- PRIMO AMMINISTRATORE (da fare una volta sola)
-- 1) Registrati dall'app con la tua email
-- 2) Poi esegui qui sotto, con la tua email al posto di quella d'esempio:
--
-- update public.profili
-- set ruolo = 'amministratore', approvato = true
-- where email = 'tua.email@example.com';
--
-- Gli altri condòmini li approvi poi dall'app (o, finché la schermata non
-- esiste, da Table Editor > profili: approvato, appartamento, millesimi).
-- =====================================================================
