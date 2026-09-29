// Nuova assemblea (solo amministratore): titolo, data e ora, luogo, ordine del giorno,
// testo della convocazione (si può incollare l'email) e documenti allegati.
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import { CampoData, CampoOra } from '@/components/CampoData';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { Errore, Nota, Riquadro } from '@/components/ui';
import { caricaFile, TIPI_ASSEMBLEA, type FileScelto } from '@/lib/file';
import { leggiData, leggiOra } from '@/lib/formato';
import { supabase } from '@/lib/supabase';

export default function NuovaAssemblea() {
  const [titolo, setTitolo] = useState('Assemblea ordinaria');
  const [giorno, setGiorno] = useState('');
  const [orario, setOrario] = useState('');
  const [luogo, setLuogo] = useState('');
  const [link, setLink] = useState('');
  const [ordine, setOrdine] = useState('');
  const [testo, setTesto] = useState('');
  const [file, setFile] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    const dataDb = leggiData(giorno);
    const oraDb = leggiOra(orario);
    if (!titolo.trim()) {
      setErrore('Inserisci un titolo.');
      return;
    }
    if (!dataDb) {
      setErrore('Data non valida: usa il formato gg/mm/aaaa.');
      return;
    }
    if (!oraDb) {
      setErrore('Ora non valida: usa il formato hh:mm (es. 20:30).');
      return;
    }
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) {
      setErrore('Il link deve iniziare con https://');
      return;
    }
    // Data e ora sono quelle del telefono (ora italiana): si salvano in formato universale
    const dataOra = new Date(`${dataDb}T${oraDb}:00`).toISOString();

    setInCorso(true);
    try {
      const { data: assemblea, error } = await supabase
        .from('assemblee')
        .insert({
          titolo: titolo.trim(),
          data_ora: dataOra,
          luogo: luogo.trim() || null,
          link_online: link.trim() || null,
          ordine_del_giorno: ordine.trim() || null,
          testo: testo.trim() || null,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);

      for (const f of file) {
        const percorso = await caricaFile('assemblee', assemblea.id, f);
        const { error: e } = await supabase
          .from('assemblee_allegati')
          .insert({ assemblea_id: assemblea.id, categoria: 'convocazione', percorso, nome_file: f.nome, tipo_mime: f.tipo });
        if (e) throw new Error(e.message);
      }
      router.replace(`/assemblee/${assemblea.id}`);
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Pagina titolo="Nuova assemblea" sottotitolo="La vedranno tutti i condòmini approvati">
      <Riquadro>
        <TextInput label="Titolo" mode="outlined" value={titolo} onChangeText={setTitolo} />
        <View style={styles.riga}>
          <CampoData style={styles.flex} label="Data" value={giorno} onChangeText={setGiorno} />
          <CampoOra style={styles.ora} label="Ora" value={orario} onChangeText={setOrario} />
        </View>
        <TextInput
          label="Luogo (es. Androne scala A)"
          mode="outlined"
          value={luogo}
          onChangeText={setLuogo}
          left={<TextInput.Icon icon="map-marker-outline" />}
        />
        <TextInput
          label="Link per collegarsi online (facoltativo)"
          mode="outlined"
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          keyboardType="url"
          left={<TextInput.Icon icon="video-outline" />}
        />
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Ordine del giorno</Text>
        <Nota>Un punto per riga: verranno numerati in automatico.</Nota>
        <TextInput
          mode="outlined"
          value={ordine}
          onChangeText={setOrdine}
          multiline
          numberOfLines={6}
          placeholder={'Approvazione rendiconto\nPreventivo spese\nVarie ed eventuali'}
          style={styles.alto}
        />
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Testo della convocazione</Text>
        <Nota>Facoltativo: puoi incollare qui il testo dell’email ricevuta.</Nota>
        <TextInput mode="outlined" value={testo} onChangeText={setTesto} multiline numberOfLines={8} style={styles.alto} />
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Documenti della convocazione</Text>
        <Nota>PDF, email salvata (.eml o .msg di Outlook), Word o foto. Il verbale potrai aggiungerlo dopo.</Nota>
        <SceltaFile file={file} onCambia={setFile} tipi={TIPI_ASSEMBLEA} etichetta="Allega documenti" />
      </Riquadro>

      <Errore testo={errore} />
      <Button mode="contained" icon="check" onPress={salva} loading={inCorso} disabled={inCorso} contentStyle={styles.pulsante}>
        Crea assemblea
      </Button>
    </Pagina>
  );
}

const styles = StyleSheet.create({
  riga: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  ora: { width: 110 },
  alto: { minHeight: 120 },
  pulsante: { height: 48 },
});
