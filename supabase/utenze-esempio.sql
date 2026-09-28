-- Da eseguire DOPO aver creato gli utenti in Authentication > Users > Add user.
-- Modifica email, nomi, appartamenti e millesimi con quelli veri.

update public.profili set nome = 'Mario Rossi', appartamento = '1', millesimi = 100.000, ruolo = 'amministratore'
where email = 'mario.rossi@example.com';

update public.profili set nome = 'Laura Bianchi', appartamento = '2', millesimi = 95.500
where email = 'laura.bianchi@example.com';

-- ... una riga per ogni appartamento ...

-- Controllo: la somma dei millesimi deve fare 1000
select count(*) as utenze, sum(millesimi) as totale_millesimi from public.profili;
