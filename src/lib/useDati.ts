// Carica dati dal database ogni volta che la schermata torna visibile
// (così, ad esempio, dopo aver creato un avviso la lista è già aggiornata).
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

type Lettura<T> = () => PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>;

// Tabella o funzione non ancora creata in Supabase (manca un file supabase/*.sql)
function nonAncoraAttiva(e: { message: string; code?: string }) {
  return e.code === 'PGRST205' || e.code === 'PGRST202' || e.code === '42P01' || /schema cache/i.test(e.message);
}

export function useDati<T>(leggi: Lettura<T>) {
  const [dati, setDati] = useState<T | null>(null);
  const [errore, setErrore] = useState('');
  const [aggiornamento, setAggiornamento] = useState(false);

  const ricarica = useCallback(async () => {
    const { data, error } = await leggi();
    if (error)
      setErrore(
        nonAncoraAttiva(error)
          ? 'Questa sezione non è ancora attiva: l’amministratore deve eseguire in Supabase l’ultimo file della cartella supabase/.'
          : `Errore nel caricamento: ${error.message}`,
      );
    else {
      setErrore('');
      setDati(data);
    }
  }, [leggi]);

  useFocusEffect(
    useCallback(() => {
      ricarica();
    }, [ricarica]),
  );

  const aggiorna = useCallback(async () => {
    setAggiornamento(true);
    await ricarica();
    setAggiornamento(false);
  }, [ricarica]);

  return { dati, errore, ricarica, aggiorna, aggiornamento };
}
