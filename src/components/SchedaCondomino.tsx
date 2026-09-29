// Scheda di un condòmino nella schermata "Gestione condòmini".
// - In attesa: si assegnano appartamento e millesimi, poi Approva o Rifiuta.
// - Attivo: si correggono appartamento, millesimi e ruolo.
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Button, Icon, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import { leggiNumero } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { Contatti, Profilo, Ruolo } from '@/lib/tipi';

import { Errore, Etichetta, Nota, Riquadro } from './ui';

type Props = {
  profilo: Profilo;
  contatti?: Contatti;
  sonoIo: boolean;
  onModificato: () => void;
};

function Telefono({ icona, etichetta, numero }: { icona: string; etichetta: string; numero: string }) {
  const tema = useTheme();
  return (
    <Pressable style={styles.telefono} onPress={() => Linking.openURL(`tel:${numero.replace(/\s/g, '')}`)}>
      <Icon source={icona} size={18} color={tema.colors.primary} />
      <Text variant="bodyMedium" style={styles.flex}>
        {etichetta}
      </Text>
      <Text variant="labelLarge" style={{ color: tema.colors.primary }}>
        {numero}
      </Text>
    </Pressable>
  );
}

export function SchedaCondomino({ profilo, contatti, sonoIo, onModificato }: Props) {
  const tema = useTheme();
  const tinte = useTinte();
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

  const nome = profilo.nome ?? '(senza nome)';

  return (
    <Riquadro evidenziato={inAttesa}>
      <View style={styles.testa}>
        <Avatar.Text size={40} label={nome.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'} />
        <View style={styles.flex}>
          <Text variant="titleMedium">
            {nome}
            {sonoIo ? '  (tu)' : ''}
          </Text>
          <Nota>{profilo.email}</Nota>
        </View>
        {!inAttesa && profilo.ruolo === 'amministratore' && <Etichetta testo="Admin" tinta={tinte.viola} />}
      </View>
      {!!contatti?.cellulare && <Telefono icona="cellphone" etichetta="Cellulare" numero={contatti.cellulare} />}
      {!!contatti?.emergenza_telefono && (
        <Telefono
          icona="account-heart-outline"
          etichetta={`Emergenza${contatti.emergenza_nome ? `: ${contatti.emergenza_nome}` : ''}`}
          numero={contatti.emergenza_telefono}
        />
      )}
      {inAttesa && (
        <Nota>Appartamento indicato alla registrazione: {profilo.appartamento_richiesto ?? '—'}</Nota>
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
      <Errore testo={errore} />
      {salvato && !inAttesa && <Nota>Salvato ✓</Nota>}

      <View style={styles.azioni}>
        {inAttesa && !confermaRifiuto && (
          <Button textColor={tema.colors.error} onPress={() => setConfermaRifiuto(true)} disabled={inCorso}>
            Rifiuta
          </Button>
        )}
        {inAttesa && confermaRifiuto && (
          <>
            <Button onPress={() => setConfermaRifiuto(false)} disabled={inCorso}>
              Annulla
            </Button>
            <Button mode="contained" buttonColor={tema.colors.error} onPress={rifiuta} loading={inCorso} disabled={inCorso}>
              Conferma rifiuto
            </Button>
          </>
        )}
        {!confermaRifiuto && (
          <Button mode={inAttesa ? 'contained' : 'contained-tonal'} icon={inAttesa ? 'check' : undefined} onPress={salva} loading={inCorso} disabled={inCorso}>
            {inAttesa ? 'Approva' : 'Salva'}
          </Button>
        )}
      </View>
    </Riquadro>
  );
}

const styles = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  riga: { flexDirection: 'row', gap: 8 },
  campo: { flex: 1 },
  telefono: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
});
