// Scheda di un ex condòmino (account disattivato): riattivazione o eliminazione definitiva.
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Text } from 'react-native-paper';
import { useState } from 'react';

import { data } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import type { Profilo } from '@/lib/tipi';

import { BottoneConferma } from './BottoneConferma';
import { Errore, Nota, Riquadro } from './ui';

export function SchedaExCondomino({ profilo, onModificato }: { profilo: Profilo; onModificato: () => void }) {
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');
  const nome = profilo.nome ?? profilo.email;

  async function riattiva() {
    setErrore('');
    setInCorso(true);
    const { error } = await supabase.from('profili').update({ approvato: true, disattivato_il: null }).eq('id', profilo.id);
    setInCorso(false);
    if (error) setErrore(`Errore: ${error.message}`);
    else onModificato();
  }

  async function eliminaDefinitivamente() {
    setErrore('');
    const { error } = await supabase.rpc('elimina_account', { p_utente: profilo.id });
    if (error) setErrore(`Errore: ${error.message}`);
    else onModificato();
  }

  return (
    <Riquadro>
      <View style={styles.testa}>
        <Avatar.Text size={36} label={(nome[0] ?? '?').toUpperCase()} />
        <View style={styles.flex}>
          <Text variant="titleSmall">{nome}</Text>
          <Nota>
            {profilo.appartamento ? `Era app. ${profilo.appartamento} · ` : ''}
            {profilo.disattivato_il ? `disattivato il ${data(profilo.disattivato_il)}` : ''}
          </Nota>
        </View>
      </View>
      <Nota>
        Non può più entrare nell’app. I suoi voti, le rate pagate, le presenze e i guasti segnalati restano nello storico.
      </Nota>
      <Errore testo={errore} />
      <View style={styles.azioni}>
        <BottoneConferma
          etichetta="Elimina definitivamente"
          conferma="Sì, elimina (si perdono voti e rate)"
          onConferma={eliminaDefinitivamente}
        />
        <Button mode="contained-tonal" icon="account-reactivate-outline" onPress={riattiva} loading={inCorso} disabled={inCorso}>
          Riattiva
        </Button>
      </View>
    </Riquadro>
  );
}

const styles = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
});
