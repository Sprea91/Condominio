// Nuovo sondaggio (solo amministratore): domanda, opzioni, modalità di conteggio, scadenza facoltativa.
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { Errore, Nota, Riquadro } from '@/components/ui';
import { leggiData } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import type { ModalitaVoto } from '@/lib/tipi';

export default function NuovoSondaggio() {
  const [domanda, setDomanda] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [modalita, setModalita] = useState<ModalitaVoto>('testa');
  const [opzioni, setOpzioni] = useState(['Favorevole', 'Contrario', 'Astenuto']);
  const [scadenza, setScadenza] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  function cambiaOpzione(i: number, testo: string) {
    setOpzioni(opzioni.map((o, j) => (j === i ? testo : o)));
  }

  async function crea() {
    setErrore('');
    const valide = opzioni.map((o) => o.trim()).filter(Boolean);
    if (!domanda.trim()) {
      setErrore('Scrivi la domanda.');
      return;
    }
    if (valide.length < 2) {
      setErrore('Servono almeno 2 opzioni.');
      return;
    }
    let scadenzaIso: string | null = null;
    if (scadenza.trim()) {
      const giorno = leggiData(scadenza);
      if (!giorno) {
        setErrore('Scadenza non valida: usa il formato gg/mm/aaaa.');
        return;
      }
      // Si può votare fino alla fine di quel giorno (ora italiana del telefono)
      scadenzaIso = new Date(`${giorno}T23:59:59`).toISOString();
      if (new Date(scadenzaIso) < new Date()) {
        setErrore('La scadenza è già passata.');
        return;
      }
    }

    setInCorso(true);
    try {
      const { data: sondaggio, error } = await supabase
        .from('sondaggi')
        .insert({ domanda: domanda.trim(), descrizione: descrizione.trim() || null, modalita, scadenza: scadenzaIso })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      const { error: e } = await supabase
        .from('sondaggi_opzioni')
        .insert(valide.map((testo, ordine) => ({ sondaggio_id: sondaggio.id, testo, ordine })));
      if (e) throw new Error(e.message);
      router.replace(`/sondaggi/${sondaggio.id}`);
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Pagina titolo="Nuovo sondaggio" sottotitolo="Tutti i condòmini approvati potranno votare">
      <Riquadro>
        <TextInput label="Domanda" mode="outlined" value={domanda} onChangeText={setDomanda} multiline />
        <TextInput
          label="Descrizione (facoltativa)"
          mode="outlined"
          value={descrizione}
          onChangeText={setDescrizione}
          multiline
          numberOfLines={4}
        />
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Come si contano i voti?</Text>
        <SegmentedButtons
          value={modalita}
          onValueChange={(v) => setModalita(v as ModalitaVoto)}
          buttons={[
            { value: 'testa', label: 'Per testa', icon: 'account-multiple' },
            { value: 'millesimi', label: 'Per millesimi', icon: 'chart-pie' },
          ]}
        />
        <Nota>
          {modalita === 'testa'
            ? 'Ogni condòmino vale 1 voto.'
            : 'Ogni voto pesa quanto i millesimi dell’appartamento.'}
        </Nota>
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Opzioni</Text>
        {opzioni.map((o, i) => (
          <View key={i} style={styles.riga}>
            <TextInput
              style={styles.campo}
              label={`Opzione ${i + 1}`}
              mode="outlined"
              dense
              value={o}
              onChangeText={(t) => cambiaOpzione(i, t)}
            />
            <IconButton icon="close" onPress={() => setOpzioni(opzioni.filter((_, j) => j !== i))} />
          </View>
        ))}
        <Button mode="text" icon="plus" onPress={() => setOpzioni([...opzioni, ''])} style={styles.sinistra}>
          Aggiungi opzione
        </Button>
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Scadenza</Text>
        <TextInput
          label="Facoltativa, gg/mm/aaaa"
          mode="outlined"
          value={scadenza}
          onChangeText={setScadenza}
          keyboardType="numbers-and-punctuation"
          left={<TextInput.Icon icon="calendar" />}
        />
        <Nota>Si potrà votare fino alle 23:59 di quel giorno. Puoi anche chiudere la votazione a mano.</Nota>
      </Riquadro>

      <Errore testo={errore} />
      <Button mode="contained" icon="check" onPress={crea} loading={inCorso} disabled={inCorso} contentStyle={styles.alto}>
        Crea sondaggio
      </Button>
    </Pagina>
  );
}

const styles = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center' },
  campo: { flex: 1 },
  sinistra: { alignSelf: 'flex-start' },
  alto: { height: 48 },
});
