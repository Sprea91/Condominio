// Pulsante "Aggiungi file" + elenco dei file scelti (con la X per toglierli),
// usato nei moduli di avvisi, guasti e spese.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText } from 'react-native-paper';

import { controllaFile, scegliFile, type FileScelto } from '@/lib/file';

type Props = {
  file: FileScelto[];
  onCambia: (file: FileScelto[]) => void;
  tipi: string[];
  etichetta: string;
  multipli?: boolean;
};

export function SceltaFile({ file, onCambia, tipi, etichetta, multipli = true }: Props) {
  const [errore, setErrore] = useState('');

  async function aggiungi() {
    setErrore('');
    const scelti = await scegliFile(tipi, multipli);
    const validi: FileScelto[] = [];
    const problemi: string[] = [];
    for (const f of scelti) {
      const problema = controllaFile(f, tipi);
      if (problema) problemi.push(problema);
      else validi.push(f);
    }
    setErrore(problemi.join('\n'));
    onCambia(multipli ? [...file, ...validi] : validi.slice(0, 1));
  }

  return (
    <View style={styles.contenitore}>
      <View style={styles.chip}>
        {file.map((f, i) => (
          <Chip
            key={`${f.uri}-${i}`}
            icon={f.tipo === 'application/pdf' ? 'file-pdf-box' : f.tipo.startsWith('image/') ? 'image' : 'file-document-outline'}
            onClose={() => onCambia(file.filter((_, j) => j !== i))}
          >
            {f.nome}
          </Chip>
        ))}
      </View>
      <Button mode="outlined" icon="paperclip" onPress={aggiungi}>
        {etichetta}
      </Button>
      {!!errore && <HelperText type="error">{errore}</HelperText>}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: { gap: 4 },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
