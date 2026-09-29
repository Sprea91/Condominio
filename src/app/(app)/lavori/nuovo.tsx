// Nuovo lavoro nello storico (solo amministratore): cosa, quando, ditta, costo, garanzia, fatture.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { CampoDitta } from '@/components/CampoDitta';
import { CampoData } from '@/components/CampoData';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { Errore, Nota, Riquadro } from '@/components/ui';
import { caricaFile, TIPI_DOCUMENTO, type FileScelto } from '@/lib/file';
import { leggiData, leggiNumero, oggi } from '@/lib/formato';
import { STATI_LAVORO } from '@/lib/lavori';
import { supabase } from '@/lib/supabase';
import type { StatoLavoro } from '@/lib/tipi';

export default function NuovoLavoro() {
  // Se si arriva da un preventivo accettato, i dati sono già compilati
  const da = useLocalSearchParams<{ titolo?: string; ditta?: string; importo?: string; descrizione?: string }>();
  const [titolo, setTitolo] = useState(da.titolo ?? '');
  const [descrizione, setDescrizione] = useState(da.descrizione ?? '');
  const [giorno, setGiorno] = useState(oggi());
  const [ditta, setDitta] = useState(da.ditta ?? '');
  const [importo, setImporto] = useState(da.importo ?? '');
  const [garanzia, setGaranzia] = useState('');
  const [fatture, setFatture] = useState<FileScelto[]>([]);
  const [stato, setStato] = useState<StatoLavoro>(da.titolo ? 'programmato' : 'finito');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    const dataDb = leggiData(giorno);
    const garanziaDb = garanzia.trim() ? leggiData(garanzia) : null;
    const valore = importo.trim() ? leggiNumero(importo) : null;
    if (!titolo.trim()) {
      setErrore('Scrivi che lavoro è stato fatto.');
      return;
    }
    if (!dataDb) {
      setErrore('Data del lavoro non valida: usa gg/mm/aaaa.');
      return;
    }
    if (garanzia.trim() && !garanziaDb) {
      setErrore('Data di fine garanzia non valida: usa gg/mm/aaaa.');
      return;
    }
    if (importo.trim() && valore === null) {
      setErrore('Importo non valido (esempio: 1.250,00).');
      return;
    }
    setInCorso(true);
    try {
      const { data: lavoro, error } = await supabase
        .from('lavori')
        .insert({
          titolo: titolo.trim(),
          descrizione: descrizione.trim() || null,
          data_lavoro: dataDb,
          ditta: ditta.trim() || null,
          importo: valore,
          garanzia_fino: garanziaDb,
          // lo stato si manda solo se diverso da "finito" (colonna di supabase/08-...sql)
          ...(stato !== 'finito' ? { stato } : {}),
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      for (const f of fatture) {
        const percorso = await caricaFile('documenti', `lavori/${lavoro.id}`, f);
        const { error: e } = await supabase
          .from('lavori_allegati')
          .insert({ lavoro_id: lavoro.id, categoria: 'fattura', percorso, nome_file: f.nome, tipo_mime: f.tipo });
        if (e) throw new Error(e.message);
      }
      router.replace(`/lavori/${lavoro.id}`);
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Pagina titolo="Nuovo lavoro" sottotitolo="Resterà nello storico del condominio">
      <Riquadro>
        <SegmentedButtons
          value={stato}
          onValueChange={(v) => setStato(v as StatoLavoro)}
          buttons={STATI_LAVORO.map((s) => ({ value: s.valore, label: s.etichetta }))}
        />
        <TextInput label="Lavoro (es. Rifacimento tetto)" mode="outlined" value={titolo} onChangeText={setTitolo} />
        <TextInput
          label="Descrizione (facoltativa)"
          mode="outlined"
          value={descrizione}
          onChangeText={setDescrizione}
          multiline
          numberOfLines={4}
        />
        <View style={styles.riga}>
          <CampoData style={styles.flex} label="Data" value={giorno} onChangeText={setGiorno} />
          <TextInput
            style={styles.flex}
            label="Costo in €"
            mode="outlined"
            value={importo}
            onChangeText={setImporto}
            keyboardType="decimal-pad"
          />
        </View>
        <CampoDitta value={ditta} onChangeText={setDitta} />
        <CampoData label="Garanzia fino al (facoltativo)" value={garanzia} onChangeText={setGaranzia} svuotabile />
      </Riquadro>
      <Riquadro>
        <Text variant="titleSmall">Fatture</Text>
        <Nota>Garanzie, foto e altri documenti potrai aggiungerli dopo dal dettaglio del lavoro.</Nota>
        <SceltaFile file={fatture} onCambia={setFatture} tipi={TIPI_DOCUMENTO} etichetta="Allega fatture" />
      </Riquadro>
      <Errore testo={errore} />
      <Button mode="contained" icon="check" onPress={salva} loading={inCorso} disabled={inCorso} contentStyle={styles.alto}>
        Salva lavoro
      </Button>
    </Pagina>
  );
}

const styles = StyleSheet.create({
  riga: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  alto: { height: 48 },
});
