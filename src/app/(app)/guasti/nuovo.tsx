// Segnalazione di un nuovo guasto con descrizione e foto.
// Le foto vanno nella cartella dell'utente (guasti/<id utente>/<id guasto>/...), come richiesto dalle regole di Storage.
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { Errore, Nota, Riquadro } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { caricaFile, TIPI_IMMAGINE, type FileScelto } from '@/lib/file';
import { supabase } from '@/lib/supabase';

export default function NuovoGuasto() {
  const { session } = useAuth();
  const [titolo, setTitolo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [foto, setFoto] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function invia() {
    setErrore('');
    if (!titolo.trim() || !descrizione.trim()) {
      setErrore('Inserisci titolo e descrizione.');
      return;
    }
    setInCorso(true);
    try {
      const { data: guasto, error } = await supabase
        .from('guasti')
        .insert({ titolo: titolo.trim(), descrizione: descrizione.trim() })
        .select('id')
        .single();
      if (error) throw new Error(error.message);

      for (const f of foto) {
        const percorso = await caricaFile('guasti', `${session!.user.id}/${guasto.id}`, f);
        const { error: e } = await supabase.from('guasti_foto').insert({ guasto_id: guasto.id, percorso });
        if (e) throw new Error(e.message);
      }
      router.replace(`/guasti/${guasto.id}`);
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Pagina titolo="Segnala guasto" sottotitolo="L’amministratore riceverà la segnalazione">
      <Riquadro>
        <TextInput label="Cosa non funziona? (es. Luce scale 2° piano)" mode="outlined" value={titolo} onChangeText={setTitolo} />
        <TextInput
          label="Descrivi il problema"
          mode="outlined"
          value={descrizione}
          onChangeText={setDescrizione}
          multiline
          numberOfLines={6}
          style={styles.testo}
        />
      </Riquadro>
      <Riquadro>
        <Text variant="titleSmall">Foto</Text>
        <Nota>Una foto aiuta a capire subito il problema.</Nota>
        <SceltaFile file={foto} onCambia={setFoto} tipi={TIPI_IMMAGINE} etichetta="Aggiungi foto" />
      </Riquadro>
      <Errore testo={errore} />
      <Button mode="contained" icon="send" onPress={invia} loading={inCorso} disabled={inCorso} contentStyle={styles.alto}>
        Invia segnalazione
      </Button>
    </Pagina>
  );
}

const styles = StyleSheet.create({
  testo: { minHeight: 120 },
  alto: { height: 48 },
});
