// Scheda di un condòmino nella schermata "Gestione condòmini".
// - In attesa: si assegnano appartamento e millesimi, poi Approva o Rifiuta.
// - Attivo: si correggono appartamento, millesimi e ruolo.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { supabase } from '@/lib/supabase';
import type { Profilo, Ruolo } from '@/lib/tipi';

type Props = {
  profilo: Profilo;
  sonoIo: boolean;
  onModificato: () => void;
};

// Accetta sia "95,5" sia "95.5"
function leggiNumero(testo: string): number | null {
  const n = Number(testo.trim().replace(',', '.'));
  return testo.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

export function SchedaCondomino({ profilo, sonoIo, onModificato }: Props) {
  const inAttesa = !profilo.approvato;
  const [appartamento, setAppartamento] = useState(
    profilo.appartamento ?? profilo.appartamento_richiesto ?? '',
  );
  const [millesimi, setMillesimi] = useState(String(profilo.millesimi ?? 0).replace('.', ','));
  const [ruolo, setRuolo] = useState<Ruolo>(profilo.ruolo);
  const [inCorso, setInCorso] = useState(false);
  const [confermaRifiuto, setConfermaRifiuto] = useState(false);
  const [errore, setErrore] = useState('');
  const [salvato, setSalvato] = useState(false);

  async function salva() {
    setErrore('');
    setSalvato(false);
    const numero = leggiNumero(millesimi);
    if (!appartamento.trim()) {
      setErrore("Inserisci l'appartamento.");
      return;
    }
    if (numero === null) {
      setErrore('Millesimi non validi (esempio: 95,5).');
      return;
    }
    setInCorso(true);
    const { error } = await supabase
      .from('profili')
      .update({ appartamento: appartamento.trim(), millesimi: numero, ruolo, approvato: true })
      .eq('id', profilo.id);
    setInCorso(false);
    if (error) {
      setErrore(
        error.code === '23505'
          ? 'Questo appartamento è già assegnato a un altro condòmino.'
          : `Errore: ${error.message}`,
      );
      return;
    }
    setSalvato(true);
    onModificato();
  }

  async function rifiuta() {
    setErrore('');
    setInCorso(true);
    const { error } = await supabase.rpc('rifiuta_registrazione', { p_utente: profilo.id });
    setInCorso(false);
    if (error) {
      setErrore(`Errore: ${error.message}`);
      return;
    }
    onModificato();
  }

  return (
    <Card mode="outlined">
      <Card.Title
        title={profilo.nome ?? '(senza nome)'}
        subtitle={profilo.email + (sonoIo ? '  ·  tu' : '')}
      />
      <Card.Content style={styles.contenuto}>
        {inAttesa && (
          <Text variant="bodySmall">
            Appartamento indicato alla registrazione: {profilo.appartamento_richiesto ?? '—'}
          </Text>
        )}
        <View style={styles.riga}>
          <TextInput
            style={styles.campo}
            label="Appartamento"
            mode="outlined"
            dense
            value={appartamento}
            onChangeText={setAppartamento}
          />
          <TextInput
            style={styles.campo}
            label="Millesimi"
            mode="outlined"
            dense
            value={millesimi}
            onChangeText={setMillesimi}
            keyboardType="decimal-pad"
          />
        </View>
        {!inAttesa && !sonoIo && (
          <SegmentedButtons
            value={ruolo}
            onValueChange={(v) => setRuolo(v as Ruolo)}
            buttons={[
              { value: 'condomino', label: 'Condòmino' },
              { value: 'amministratore', label: 'Amministratore' },
            ]}
          />
        )}
        <HelperText type="error" visible={!!errore}>
          {errore}
        </HelperText>
        {salvato && !inAttesa && <Text variant="bodySmall">Salvato.</Text>}
      </Card.Content>

      <Card.Actions>
        {inAttesa && !confermaRifiuto && (
          <Button onPress={() => setConfermaRifiuto(true)} disabled={inCorso}>
            Rifiuta
          </Button>
        )}
        {inAttesa && confermaRifiuto && (
          <>
            <Button onPress={() => setConfermaRifiuto(false)} disabled={inCorso}>
              Annulla
            </Button>
            <Button mode="contained" buttonColor="#B3261E" onPress={rifiuta} loading={inCorso} disabled={inCorso}>
              Conferma rifiuto
            </Button>
          </>
        )}
        {!confermaRifiuto && (
          <Button mode="contained" onPress={salva} loading={inCorso} disabled={inCorso}>
            {inAttesa ? 'Approva' : 'Salva'}
          </Button>
        )}
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  contenuto: { gap: 8 },
  riga: { flexDirection: 'row', gap: 8 },
  campo: { flex: 1 },
});
