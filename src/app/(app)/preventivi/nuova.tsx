// Nuova richiesta di preventivi: per quale lavoro e una breve descrizione.
// I preventivi delle ditte si aggiungono poi dalla pagina della richiesta.
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { Errore, Nota, Riquadro } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function NuovaRichiesta() {
  const [titolo, setTitolo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    if (!titolo.trim()) {
      setErrore('Scrivi per quale lavoro servono i preventivi.');
      return;
    }
    setInCorso(true);
    const { data: richiesta, error } = await supabase
      .from('preventivi_richieste')
      .insert({ titolo: titolo.trim(), descrizione: descrizione.trim() || null })
      .select('id')
      .single();
    setInCorso(false);
    if (error) setErrore(`Errore: ${error.message}`);
    else router.replace(`/preventivi/${richiesta.id}`);
  }

  return (
    <Pagina titolo="Nuova richiesta" sottotitolo="Poi aggiungerai i preventivi delle ditte">
      <Riquadro>
        <TextInput label="Lavoro (es. Rifacimento tetto)" mode="outlined" value={titolo} onChangeText={setTitolo} />
        <TextInput
          label="Descrizione (cosa serve, misure, urgenza...)"
          mode="outlined"
          value={descrizione}
          onChangeText={setDescrizione}
          multiline
          numberOfLines={5}
          style={styles.testo}
        />
        <Nota>La vedranno tutti i condòmini, che potranno anche aggiungere preventivi.</Nota>
      </Riquadro>
      <Errore testo={errore} />
      <Button mode="contained" icon="check" onPress={salva} loading={inCorso} disabled={inCorso} contentStyle={styles.alto}>
        Crea richiesta
      </Button>
    </Pagina>
  );
}

const styles = StyleSheet.create({
  testo: { minHeight: 110 },
  alto: { height: 48 },
});
