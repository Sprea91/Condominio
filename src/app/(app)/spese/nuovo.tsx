// Nuovo movimento del conto (solo amministratore): entrata o uscita, con fattura/giustificativo.
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { Errore, Riquadro } from '@/components/ui';
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

  const suggerite = tipo === 'uscita' ? CATEGORIE_USCITA : CATEGORIE_ENTRATA;

  return (
    <Pagina titolo="Nuovo movimento" sottotitolo="Sarà visibile a tutti i condòmini">
      <Riquadro>
        <SegmentedButtons
          value={tipo}
          onValueChange={(v) => setTipo(v as 'entrata' | 'uscita')}
          buttons={[
            { value: 'uscita', label: 'Uscita', icon: 'arrow-top-right' },
            { value: 'entrata', label: 'Entrata', icon: 'arrow-bottom-left' },
          ]}
        />
        <TextInput
          label="Importo in €"
          mode="outlined"
          value={importo}
          onChangeText={setImporto}
          keyboardType="decimal-pad"
          left={<TextInput.Icon icon="currency-eur" />}
        />
        <TextInput
          label={tipo === 'uscita' ? 'Descrizione (es. Pulizia scale ottobre)' : 'Descrizione (es. Rata condominiale app. 3)'}
          mode="outlined"
          value={descrizione}
          onChangeText={setDescrizione}
        />
        <TextInput
          label="Data (gg/mm/aaaa)"
          mode="outlined"
          value={giorno}
          onChangeText={setGiorno}
          keyboardType="numbers-and-punctuation"
          left={<TextInput.Icon icon="calendar" />}
        />
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Categoria</Text>
        <View style={styles.chip}>
          {suggerite.map((c) => (
            <Chip key={c} selected={categoria === c} showSelectedCheck={false} mode={categoria === c ? 'flat' : 'outlined'} onPress={() => setCategoria(categoria === c ? '' : c)}>
              {c}
            </Chip>
          ))}
        </View>
        <TextInput label="Oppure scrivi una categoria" mode="outlined" dense value={categoria} onChangeText={setCategoria} />
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Fattura o giustificativo</Text>
        <SceltaFile file={file} onCambia={setFile} tipi={TIPI_IMMAGINE_PDF} etichetta="Allega PDF o foto" multipli={false} />
      </Riquadro>

      <Errore testo={errore} />
      <Button mode="contained" icon="check" onPress={salva} loading={inCorso} disabled={inCorso} contentStyle={styles.alto}>
        Salva movimento
      </Button>
    </Pagina>
  );
}

const CATEGORIE_USCITA = ['Pulizie', 'Luce', 'Acqua', 'Manutenzione', 'Giardino', 'Assicurazione', 'Amministrazione'];
const CATEGORIE_ENTRATA = ['Rate condominiali', 'Rimborsi', 'Altro'];

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  alto: { height: 48 },
});
