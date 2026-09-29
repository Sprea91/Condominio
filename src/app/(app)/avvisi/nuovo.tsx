// Nuovo avviso (solo amministratore): titolo, testo e allegati (PDF o immagini).
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, HelperText, TextInput } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { caricaFile, TIPI_IMMAGINE_PDF, type FileScelto } from '@/lib/file';
import { supabase } from '@/lib/supabase';

export default function NuovoAvviso() {
  const [titolo, setTitolo] = useState('');
  const [testo, setTesto] = useState('');
  const [file, setFile] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function pubblica() {
    setErrore('');
    if (!titolo.trim() || !testo.trim()) {
      setErrore('Inserisci titolo e testo.');
      return;
    }
    setInCorso(true);
    try {
      const { data: avviso, error } = await supabase
        .from('avvisi')
        .insert({ titolo: titolo.trim(), testo: testo.trim() })
        .select('id')
        .single();
      if (error) throw new Error(error.message);

      for (const f of file) {
        const percorso = await caricaFile('avvisi', avviso.id, f);
        const { error: e } = await supabase
          .from('avvisi_allegati')
          .insert({ avviso_id: avviso.id, percorso, nome_file: f.nome, tipo_mime: f.tipo });
        if (e) throw new Error(e.message);
      }
      router.back();
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Pagina titolo="Nuovo avviso">
      <TextInput label="Titolo" mode="outlined" value={titolo} onChangeText={setTitolo} />
      <TextInput label="Testo" mode="outlined" value={testo} onChangeText={setTesto} multiline numberOfLines={8} />
      <SceltaFile file={file} onCambia={setFile} tipi={TIPI_IMMAGINE_PDF} etichetta="Allega PDF o immagini" />
      <HelperText type="error" visible={!!errore}>
        {errore}
      </HelperText>
      <Button mode="contained" onPress={pubblica} loading={inCorso} disabled={inCorso}>
        Pubblica
      </Button>
    </Pagina>
  );
}
