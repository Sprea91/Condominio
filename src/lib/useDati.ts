// Carica dati dal database ogni volta che la schermata torna visibile
// (così, ad esempio, dopo aver creato un avviso la lista è già aggiornata).
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

type Lettura<T> = () => PromiseLike<{ data: T | null; error: { message: string } | null }>;

export function useDati<T>(leggi: Lettura<T>) {
  const [dati, setDati] = useState<T | null>(null);
  const [errore, setErrore] = useState('');
  const [aggiornamento, setAggiornamento] = useState(false);

  const ricarica = useCallback(async () => {
    const { data, error } = await leggi();
    if (error) setErrore(`Errore nel caricamento: ${error.message}`);
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
