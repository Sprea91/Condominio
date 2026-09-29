// Elenco dei guasti segnalati, filtrabile per stato. Tutti possono aprirne uno nuovo.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ActivityIndicator, Card, Chip, FAB, SegmentedButtons, Text } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { autore, data } from '@/lib/formato';
import { stato } from '@/lib/guasti';
import { supabase } from '@/lib/supabase';
import type { Guasto } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type Filtro = 'attivi' | 'chiusi' | 'tutti';

export default function Guasti() {
  const [filtro, setFiltro] = useState<Filtro>('attivi');

  const leggi = useCallback(
    () =>
      supabase
        .from('guasti')
        .select('*, autore:profili(nome, appartamento), guasti_foto(id, percorso)')
        .order('creato_il', { ascending: false })
        .returns<Guasto[]>(),
    [],
  );
  const { dati, errore, aggiorna, aggiornamento } = useDati(leggi);

  const visibili = dati?.filter((g) =>
    filtro === 'tutti' ? true : filtro === 'chiusi' ? g.stato === 'chiuso' : g.stato !== 'chiuso',
  );

  return (
    <Pagina
      titolo="Guasti"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={<FAB icon="plus" label="Segnala guasto" style={styles.fab} onPress={() => router.push('/guasti/nuovo')} />}
    >
      <SegmentedButtons
        value={filtro}
        onValueChange={(v) => setFiltro(v as Filtro)}
        buttons={[
          { value: 'attivi', label: 'Da risolvere' },
          { value: 'chiusi', label: 'Chiusi' },
          { value: 'tutti', label: 'Tutti' },
        ]}
      />
      {!!errore && <Text style={styles.errore}>{errore}</Text>}
      {dati === null && !errore && <ActivityIndicator />}
      {visibili?.length === 0 && <Text variant="bodyMedium">Nessun guasto in questo elenco.</Text>}

      {visibili?.map((g) => {
        const s = stato(g.stato);
        return (
          <Card key={g.id} mode="elevated" onPress={() => router.push(`/guasti/${g.id}`)}>
            <Card.Title
              title={g.titolo}
              subtitle={`${data(g.creato_il)} · ${autore(g.autore)}${g.guasti_foto.length ? ` · ${g.guasti_foto.length} foto` : ''}`}
              titleNumberOfLines={2}
              right={() => (
                <Chip compact style={[styles.stato, { backgroundColor: s.colore }]} textStyle={styles.testoStato}>
                  {s.etichetta}
                </Chip>
              )}
            />
          </Card>
        );
      })}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  errore: { color: '#B3261E' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  stato: { marginRight: 12 },
  testoStato: { color: '#fff' },
});
