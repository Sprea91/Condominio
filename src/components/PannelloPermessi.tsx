// Pannello "Permessi" (Gestione condòmini, solo amministratore):
// per ogni azione un interruttore "anche i condòmini" sì/no.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Switch, Text, useTheme } from 'react-native-paper';

import { AZIONI, usePermessi, type Azione } from '@/lib/permessi';
import { supabase } from '@/lib/supabase';

import { Errore, Nota, Riquadro, Titoletto } from './ui';

export function PannelloPermessi() {
  const tema = useTheme();
  const { aperta, ricarica } = usePermessi();
  const [inCorso, setInCorso] = useState<Azione | null>(null);
  const [errore, setErrore] = useState('');

  async function cambia(a: Azione, tutti: boolean) {
    setErrore('');
    setInCorso(a);
    const { error } = await supabase.from('impostazioni').upsert({ chiave: `permesso_${a}`, valore: tutti ? 'tutti' : 'admin' });
    setInCorso(null);
    if (error) setErrore(`Errore: ${error.message}`);
    else ricarica();
  }

  return (
    <>
      <Titoletto>Permessi</Titoletto>
      <Riquadro style={styles.riquadro}>
        <Nota>
          Attiva l’interruttore per permettere l’azione a tutti i condòmini approvati. Eliminare resta sempre a te (o a chi
          ha inserito la cosa); rate, millesimi, approvazioni e cellulari restano solo tuoi.
        </Nota>
        {AZIONI.map((x, i) => (
          <View key={x.azione} style={[styles.riga, i > 0 && { borderTopWidth: 1, borderTopColor: tema.colors.outlineVariant }]}>
            <View style={styles.flex}>
              <Text variant="titleSmall">{x.titolo}</Text>
              <Nota>{x.descrizione}</Nota>
              <Nota>{aperta(x.azione) ? 'Possono farlo tutti' : 'Solo amministratori'}</Nota>
            </View>
            <Switch value={aperta(x.azione)} disabled={inCorso === x.azione} onValueChange={(v) => cambia(x.azione, v)} />
          </View>
        ))}
        <Errore testo={errore} />
      </Riquadro>
    </>
  );
}

const styles = StyleSheet.create({
  riquadro: { gap: 4 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  flex: { flex: 1, gap: 2 },
});
