// Conto spese: saldo, totali e lista di entrate/uscite con i giustificativi.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Chip, FAB, IconButton, SegmentedButtons, Text } from 'react-native-paper';

import { BottoneConferma } from '@/components/BottoneConferma';
import { Pagina } from '@/components/Pagina';
import { useAuth } from '@/lib/auth';
import { apriFile, eliminaFile } from '@/lib/file';
import { data, euro } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import type { Movimento } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type Filtro = 'tutti' | 'entrata' | 'uscita';

const VERDE = '#2E7D32';
const ROSSO = '#C62828';

export default function Spese() {
  const { profilo } = useAuth();
  const admin = profilo?.ruolo === 'amministratore';
  const [filtro, setFiltro] = useState<Filtro>('tutti');
  const [aperto, setAperto] = useState<string | null>(null);

  const leggi = useCallback(
    () =>
      supabase
        .from('movimenti')
        .select('*')
        .order('data', { ascending: false })
        .order('creato_il', { ascending: false })
        .returns<Movimento[]>(),
    [],
  );
  const { dati, errore, ricarica, aggiorna, aggiornamento } = useDati(leggi);

  const entrate = (dati ?? []).filter((m) => m.tipo === 'entrata').reduce((t, m) => t + Number(m.importo), 0);
  const uscite = (dati ?? []).filter((m) => m.tipo === 'uscita').reduce((t, m) => t + Number(m.importo), 0);
  const saldo = entrate - uscite;
  const visibili = dati?.filter((m) => filtro === 'tutti' || m.tipo === filtro);

  async function elimina(m: Movimento) {
    if (m.giustificativo_path) await eliminaFile('giustificativi', [m.giustificativo_path]);
    await supabase.from('movimenti').delete().eq('id', m.id);
    await ricarica();
  }

  return (
    <Pagina
      titolo="Conto spese"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={admin && <FAB icon="plus" label="Nuovo movimento" style={styles.fab} onPress={() => router.push('/spese/nuovo')} />}
    >
      {!!errore && <Text style={styles.errore}>{errore}</Text>}
      {dati === null && !errore && <ActivityIndicator />}

      {dati && (
        <Card mode="elevated">
          <Card.Content style={styles.riepilogo}>
            <Text variant="labelLarge">Saldo del condominio</Text>
            <Text variant="displaySmall" style={{ color: saldo < 0 ? ROSSO : VERDE }}>
              {euro(saldo)}
            </Text>
            <View style={styles.totali}>
              <Text variant="bodyMedium" style={{ color: VERDE }}>Entrate {euro(entrate)}</Text>
              <Text variant="bodyMedium" style={{ color: ROSSO }}>Uscite {euro(uscite)}</Text>
            </View>
          </Card.Content>
        </Card>
      )}

      <SegmentedButtons
        value={filtro}
        onValueChange={(v) => setFiltro(v as Filtro)}
        buttons={[
          { value: 'tutti', label: 'Tutti' },
          { value: 'entrata', label: 'Entrate' },
          { value: 'uscita', label: 'Uscite' },
        ]}
      />
      {visibili?.length === 0 && <Text variant="bodyMedium">Nessun movimento.</Text>}

      {visibili?.map((m) => (
        <Card key={m.id} mode="outlined" onPress={() => setAperto(aperto === m.id ? null : m.id)}>
          <Card.Title
            title={m.descrizione}
            titleNumberOfLines={2}
            subtitle={`${data(m.data)}${m.categoria ? ` · ${m.categoria}` : ''}`}
            right={() => (
              <View style={styles.destra}>
                {m.giustificativo_path && (
                  <IconButton icon="paperclip" size={20} onPress={() => apriFile('giustificativi', m.giustificativo_path!)} />
                )}
                <Text variant="titleMedium" style={{ color: m.tipo === 'entrata' ? VERDE : ROSSO }}>
                  {m.tipo === 'entrata' ? '+' : '−'}
                  {euro(m.importo)}
                </Text>
              </View>
            )}
          />
          {aperto === m.id && (
            <Card.Actions>
              {m.giustificativo_path && (
                <Chip icon="file-document" onPress={() => apriFile('giustificativi', m.giustificativo_path!)}>
                  Apri giustificativo
                </Chip>
              )}
              {admin && <BottoneConferma etichetta="Elimina" conferma="Elimina movimento" onConferma={() => elimina(m)} />}
            </Card.Actions>
          )}
        </Card>
      ))}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  errore: { color: '#B3261E' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  riepilogo: { gap: 4, alignItems: 'center' },
  totali: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  destra: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
});
