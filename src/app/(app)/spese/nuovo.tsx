// Nuovo movimento del conto (solo amministratore): entrata o uscita, con fattura/giustificativo.
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, HelperText, SegmentedButtons, TextInput } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { caricaFile, TIPI_IMMAGINE_PDF, type FileScelto } from '@/lib/file';
import { leggiData, leggiNumero, oggi } from '@/lib/formato';
import { supabase } from '@/lib/supabase';

export default function NuovoMovimento() {
  const [tipo, setTipo] = useState<'entrata' | 'uscita'>('uscita');
  const [giorno, setGiorno] = useState(oggi());
  const [descrizione, setDescrizione] = useState('');
  const [categoria, setCategoria] = useState('');
  const [importo, setImporto] = useState('');
  const [file, setFile] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    const dataDb = leggiData(giorno);
    const valore = leggiNumero(importo);
    if (!dataDb) {
      setErrore('Data non valida: usa il formato gg/mm/aaaa.');
      return;
    }
    if (!descrizione.trim()) {
      setErrore('Inserisci una descrizione.');
      return;
    }
    if (!valore) {
      setErrore('Importo non valido (esempio: 125,50).');
      return;
    }
    setInCorso(true);
    try {
      const percorso = file[0] ? await caricaFile('giustificativi', dataDb.slice(0, 4), file[0]) : null;
      const { error } = await supabase.from('movimenti').insert({
        tipo,
        data: dataDb,
        descrizione: descrizione.trim(),
        categoria: categoria.trim() || null,
        importo: Math.round(valore * 100) / 100,
        giustificativo_path: percorso,
      });
      if (error) throw new Error(error.message);
      router.back();
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Pagina titolo="Nuovo movimento">
      <SegmentedButtons
        value={tipo}
        onValueChange={(v) => setTipo(v as 'entrata' | 'uscita')}
        buttons={[
          { value: 'uscita', label: 'Uscita', icon: 'arrow-up' },
          { value: 'entrata', label: 'Entrata', icon: 'arrow-down' },
        ]}
      />
      <TextInput
        label="Data (gg/mm/aaaa)"
        mode="outlined"
        value={giorno}
        onChangeText={setGiorno}
        keyboardType="numbers-and-punctuation"
      />
      <TextInput
        label={tipo === 'uscita' ? 'Descrizione (es. Pulizia scale ottobre)' : 'Descrizione (es. Rata condominiale app. 3)'}
        mode="outlined"
        value={descrizione}
        onChangeText={setDescrizione}
      />
      <TextInput
        label="Categoria (facoltativa, es. Pulizie, Luce, Manutenzione)"
        mode="outlined"
        value={categoria}
        onChangeText={setCategoria}
      />
      <TextInput
        label="Importo in €"
        mode="outlined"
        value={importo}
        onChangeText={setImporto}
        keyboardType="decimal-pad"
      />
      <SceltaFile
        file={file}
        onCambia={setFile}
        tipi={TIPI_IMMAGINE_PDF}
        etichetta="Allega fattura o giustificativo"
        multipli={false}
      />
      <HelperText type="error" visible={!!errore}>
        {errore}
      </HelperText>
      <Button mode="contained" onPress={salva} loading={inCorso} disabled={inCorso}>
        Salva movimento
      </Button>
    </Pagina>
  );
}
