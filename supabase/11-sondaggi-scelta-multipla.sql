-- =====================================================================
-- CONDOMINIO - Modifica 11: sondaggi a scelta multipla
-- Il condòmino può scegliere più opzioni (fino a un massimo, se indicato).
-- Da eseguire UNA VOLTA, DOPO 10, in: SQL Editor > New query > Run
-- =====================================================================

-- 1. Impostazioni del sondaggio
alter table public.sondaggi
  add column multipla  boolean not null default false,
  add column max_scelte int check (max_scelte is null or max_scelte >= 1);  -- vuoto = nessun limite

-- 2. Un voto per OPZIONE (prima era uno per sondaggio)
alter table public.voti drop constraint voti_pkey;
alter table public.voti add primary key (sondaggio_id, utente_id, opzione_id);

-- Controllo: nei sondaggi a scelta singola una sola opzione, in quelli multipli al massimo max_scelte
create function public.controlla_numero_voti()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  gia int;
begin
  select multipla, max_scelte into s from public.sondaggi where id = new.sondaggio_id;
  select count(*) into gia from public.voti where sondaggio_id = new.sondaggio_id and utente_id = new.utente_id;
  if not s.multipla and gia >= 1 then
    raise exception 'In questo sondaggio si può scegliere una sola opzione';
  end if;
  if s.multipla and s.max_scelte is not null and gia >= s.max_scelte then
    raise exception 'Puoi scegliere al massimo % opzioni', s.max_scelte;
  end if;
  return new;
end;
$$;

create trigger voti_numero_massimo
  before insert on public.voti
  for each row execute function public.controlla_numero_voti();

-- 3. Quante persone (e quanti millesimi) hanno votato: serve per le percentuali
--    dei sondaggi multipli, dove i voti totali superano i votanti
create function public.votanti_sondaggio(p_sondaggio uuid)
returns table (persone bigint, millesimi numeric)
language sql
stable
security definer
set search_path = public
as $$
  select count(*), coalesce(sum(p.millesimi), 0)
  from (select distinct utente_id from public.voti where sondaggio_id = p_sondaggio) v
  join public.profili p on p.id = v.utente_id
  where public.is_approvato();
$$;

revoke execute on function public.votanti_sondaggio(uuid) from public, anon;
grant  execute on function public.votanti_sondaggio(uuid) to authenticated;
