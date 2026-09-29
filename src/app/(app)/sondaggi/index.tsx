// Elenco dei sondaggi: aperti in alto, poi quelli conclusi.
import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { ActivityIndicator, Card, Chip, FAB, Text } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { useAuth } from '@/lib/auth';
import { data, dataOra } from '@/lib/formato';
import { aperto } from '@/lib/sondaggi';
import { supabase } from '@/lib/supabase';
import type { Sondaggio } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

export default function Sondaggi() {
  const { profilo } = useAuth();
  const admin = profilo?.ruolo === 'amministratore';

  const leggiSondaggi = useCallback(
    () =>
      supabase
        .from('sondaggi')
        .select('*, sondaggi_opzioni(id, testo, ordine)')
        .order('creato_il', { ascending: false })
        .returns<Sondaggio[]>(),
    [],
  );
  const leggiMieiVoti = useCallback(
    () => supabase.from('voti').select('sondaggio_id').eq('utente_id', profilo?.id ?? '').returns<{ sondaggio_id: string }[]>(),
    [profilo?.id],
  );
  const { dati, errore, aggiorna, aggiornamento } = useDati(leggiSondaggi);
  const { dati: mieiVoti } = useDati(leggiMieiVoti);
  const votati = new Set(mieiVoti?.map((v) => v.sondaggio_id));

  const ordinati = dati ? [...dati.filter(aperto), ...dati.filter((s) => !aperto(s))] : null;

  return (
    <Pagina
      titolo="Sondaggi"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={admin && <FAB icon="plus" label="Nuovo sondaggio" style={styles.fab} onPress={() => router.push('/sondaggi/nuovo')} />}
    >
      {!!errore && <Text style={styles.errore}>{errore}</Text>}
      {ordinati === null && !errore && <ActivityIndicator />}
      {ordinati?.length === 0 && <Text variant="bodyMedium">Nessun sondaggio.</Text>}

      {ordinati?.map((s) => {
        const ok = aperto(s);
        const etichetta = !ok ? 'Concluso' : votati.has(s.id) ? 'Hai votato' : 'Da votare';
        const colore = !ok ? '#616161' : votati.has(s.id) ? '#2E7D32' : '#1565C0';
        return (
          <Card key={s.id} mode="elevated" onPress={() => router.push(`/sondaggi/${s.id}`)}>
            <Card.Title
              title={s.domanda}
              titleNumberOfLines={3}
              subtitle={`${s.modalita === 'millesimi' ? 'Per millesimi' : 'Per testa'} · ${
                s.scadenza ? `scade il ${dataOra(s.scadenza)}` : `creato il ${data(s.creato_il)}`
              }`}
              right={() => (
                <Chip compact style={[styles.chip, { backgroundColor: colore }]} textStyle={styles.testoChip}>
                  {etichetta}
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
  chip: { marginRight: 12 },
  testoChip: { color: '#fff' },
});
