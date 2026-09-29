// Nuovo avviso (solo amministratore): titolo, testo, allegati (PDF o immagini), in evidenza.
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Switch, Text, TextInput } from 'react-native-paper';

import { CampoData, CampoOra } from '@/components/CampoData';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { Errore, Nota, Riquadro } from '@/components/ui';
import { caricaFile, TIPI_IMMAGINE_PDF, type FileScelto } from '@/lib/file';
import { leggiData, leggiOra } from '@/lib/formato';
import { supabase } from '@/lib/supabase';

export default function NuovoAvviso() {
  const [titolo, setTitolo] = useState('');
  const [testo, setTesto] = useState('');
  const [inEvidenza, setInEvidenza] = useState(false);
  const [giorno, setGiorno] = useState('');
  const [orario, setOrario] = useState('');
  const [luogo, setLuogo] = useState('');
  const [file, setFile] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function pubblica() {
    setErrore('');
    if (!titolo.trim() || !testo.trim()) {
      setErrore('Inserisci titolo e testo.');
      return;
    }
    // Appuntamento facoltativo: servono giorno e ora insieme
    let appuntamento: string | null = null;
    if (giorno || orario) {
      const g = leggiData(giorno);
      const o = leggiOra(orario);
      if (!g || !o) {
        setErrore('Per l’appuntamento indica sia il giorno sia l’ora (oppure lasciali vuoti).');
        return;
      }
      appuntamento = new Date(`${g}T${o}:00`).toISOString();
    }
    setInCorso(true);
    try {
      // "in_evidenza" si manda solo se attivo: così funziona anche prima di eseguire 04-migliorie.sql
      const { data: avviso, error } = await supabase
        .from('avvisi')
        .insert({
          titolo: titolo.trim(),
          testo: testo.trim(),
          ...(inEvidenza ? { in_evidenza: true } : {}),
          // colonne di supabase/17-...sql: si mandano solo se c'è un appuntamento
          ...(appuntamento ? { appuntamento, appuntamento_luogo: luogo.trim() || null } : {}),
        })
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
    <Pagina titolo="Nuovo avviso" sottotitolo="Sarà visibile a tutti i condòmini">
      <Riquadro>
        <TextInput label="Titolo" mode="outlined" value={titolo} onChangeText={setTitolo} />
        <TextInput
          label="Testo"
          mode="outlined"
          value={testo}
          onChangeText={setTesto}
          multiline
          numberOfLines={8}
          style={styles.testo}
        />
        <View style={styles.riga}>
          <View style={styles.flex}>
            <Text variant="titleSmall">In evidenza nella Home</Text>
            <Nota>Compare in cima alla Home di tutti i condòmini</Nota>
          </View>
          <Switch value={inEvidenza} onValueChange={setInEvidenza} />
        </View>
      </Riquadro>
      <Riquadro>
        <Text variant="titleSmall">Appuntamento (facoltativo)</Text>
        <Nota>Es. sopralluogo dell’idraulico: giorno e ora compariranno in evidenza nella Home di tutti.</Nota>
        <View style={styles.riga}>
          <CampoData style={styles.flex} label="Giorno" value={giorno} onChangeText={setGiorno} svuotabile />
          <CampoOra style={styles.ora} label="Ora" value={orario} onChangeText={setOrario} svuotabile />
        </View>
        {!!giorno && (
          <TextInput label="Dove (facoltativo, es. cantina scala B)" mode="outlined" value={luogo} onChangeText={setLuogo} />
        )}
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Allegati</Text>
        <SceltaFile file={file} onCambia={setFile} tipi={TIPI_IMMAGINE_PDF} etichetta="Allega PDF o immagini" />
      </Riquadro>
      <Errore testo={errore} />
      <Button mode="contained" icon="send" onPress={pubblica} loading={inCorso} disabled={inCorso} contentStyle={styles.alto}>
        Pubblica avviso
      </Button>
    </Pagina>
  );
}

const styles = StyleSheet.create({
  testo: { minHeight: 160 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  alto: { height: 48 },
  ora: { width: 120 },
});
