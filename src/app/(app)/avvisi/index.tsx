// Bacheca avvisi: comunicazioni ufficiali con allegati. L'amministratore può pubblicarle ed eliminarle.
import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { ActivityIndicator, Card, FAB, Text } from 'react-native-paper';

import { Allegati } from '@/components/Allegati';
import { BottoneConferma } from '@/components/BottoneConferma';
import { Pagina } from '@/components/Pagina';
import { useAuth } from '@/lib/auth';
import { eliminaFile } from '@/lib/file';
import { dataOra } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import type { Avviso } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

export default function Avvisi() {
  const { profilo } = useAuth();
  const admin = profilo?.ruolo === 'amministratore';

  const leggi = useCallback(
    () =>
      supabase
        .from('avvisi')
        .select('*, autore:profili(nome, appartamento), avvisi_allegati(*)')
        .order('creato_il', { ascending: false })
        .returns<Avviso[]>(),
    [],
  );
  const { dati, errore, ricarica, aggiorna, aggiornamento } = useDati(leggi);

  async function elimina(a: Avviso) {
    await eliminaFile('avvisi', a.avvisi_allegati.map((f) => f.percorso));
    await supabase.from('avvisi').delete().eq('id', a.id);
    await ricarica();
  }

  return (
    <Pagina
      titolo="Bacheca avvisi"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={admin && <FAB icon="plus" label="Nuovo avviso" style={styles.fab} onPress={() => router.push('/avvisi/nuovo')} />}
    >
      {!!errore && <Text style={styles.errore}>{errore}</Text>}
      {dati === null && !errore && <ActivityIndicator />}
      {dati?.length === 0 && <Text variant="bodyMedium">Nessun avviso pubblicato.</Text>}

      {dati?.map((a) => (
        <Card key={a.id} mode="elevated">
          <Card.Title title={a.titolo} subtitle={dataOra(a.creato_il)} titleNumberOfLines={3} />
          <Card.Content style={styles.contenuto}>
            <Text variant="bodyMedium">{a.testo}</Text>
            <Allegati
              bucket="avvisi"
              file={a.avvisi_allegati.map((f) => ({ percorso: f.percorso, nome: f.nome_file, tipo: f.tipo_mime }))}
            />
          </Card.Content>
          {admin && (
            <Card.Actions>
              <BottoneConferma etichetta="Elimina" conferma="Elimina avviso" onConferma={() => elimina(a)} />
            </Card.Actions>
          )}
        </Card>
      ))}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  contenuto: { gap: 12 },
  errore: { color: '#B3261E' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
