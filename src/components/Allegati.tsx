// Mostra i file salvati: le immagini come anteprime, i PDF come etichette.
// Toccando si apre il file a tutta grandezza (in una nuova scheda nel browser).
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Chip } from 'react-native-paper';

import { apriFile, linkFile, type Bucket } from '@/lib/file';

export type FileSalvato = { percorso: string; nome?: string; tipo?: string };

function eImmagine(f: FileSalvato) {
  if (f.tipo) return f.tipo.startsWith('image/');
  return /\.(jpe?g|png|webp)$/i.test(f.percorso);
}

function iconaFile(f: FileSalvato) {
  const nome = (f.nome ?? f.percorso).toLowerCase();
  if (f.tipo === 'application/pdf' || nome.endsWith('.pdf')) return 'file-pdf-box';
  if (/\.(eml|msg)$/.test(nome)) return 'email-outline';
  if (/\.docx?$/.test(nome)) return 'file-word-outline';
  return 'file-document-outline';
}

function Anteprima({ bucket, percorso }: { bucket: Bucket; percorso: string }) {
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    linkFile(bucket, percorso).then((l) => {
      if (attivo) setLink(l);
    });
    return () => {
      attivo = false;
    };
  }, [bucket, percorso]);

  return (
    <Pressable onPress={() => apriFile(bucket, percorso)}>
      {link ? <Image source={{ uri: link }} style={styles.anteprima} /> : <View style={[styles.anteprima, styles.vuota]} />}
    </Pressable>
  );
}

export function Allegati({ bucket, file }: { bucket: Bucket; file: FileSalvato[] }) {
  if (!file.length) return null;
  const immagini = file.filter(eImmagine);
  const altri = file.filter((f) => !eImmagine(f));

  return (
    <View style={styles.contenitore}>
      {immagini.length > 0 && (
        <View style={styles.riga}>
          {immagini.map((f) => (
            <Anteprima key={f.percorso} bucket={bucket} percorso={f.percorso} />
          ))}
        </View>
      )}
      {altri.length > 0 && (
        <View style={styles.riga}>
          {altri.map((f) => (
            <Chip key={f.percorso} icon={iconaFile(f)} onPress={() => apriFile(bucket, f.percorso)}>
              {f.nome ?? f.percorso.split('/').pop()}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: { gap: 8 },
  riga: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  anteprima: { width: 96, height: 96, borderRadius: 8 },
  vuota: { backgroundColor: '#8884' },
});
