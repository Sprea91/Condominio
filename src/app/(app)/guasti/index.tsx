// Elenco dei guasti segnalati, filtrabile per stato. Tutti possono aprirne uno nuovo.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { BottoneNuovo, Errore, Etichetta, IconaTonda, Nota, Riquadro, Vuoto } from '@/components/ui';
import { autore, data } from '@/lib/formato';
import { stato } from '@/lib/guasti';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { Guasto } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type Filtro = 'attivi' | 'chiusi' | 'tutti';

export default function Guasti() {
  const tema = useTheme();
  const tinte = useTinte();
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

  const attivi = dati?.filter((g) => g.stato !== 'chiuso').length ?? 0;
  const visibili = dati?.filter((g) =>
    filtro === 'tutti' ? true : filtro === 'chiusi' ? g.stato === 'chiuso' : g.stato !== 'chiuso',
  );

  return (
    <Pagina
      titolo="Guasti"
      sottotitolo={dati ? (attivi ? `${attivi} da risolvere` : 'Nessun guasto aperto') : undefined}
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={<BottoneNuovo etichetta="Segnala guasto" onPress={() => router.push('/guasti/nuovo')} />}
    >
      <SegmentedButtons
        value={filtro}
        onValueChange={(v) => setFiltro(v as Filtro)}
        buttons={[
          { value: 'attivi', label: 'Da risolvere' },
          { value: 'chiusi', label: 'Risolti' },
          { value: 'tutti', label: 'Tutti' },
        ]}
      />
      <Errore testo={errore} />
      {dati === null && !errore && <ActivityIndicator style={styles.caricamento} />}
      {visibili?.length === 0 && (
        <Vuoto
          icona={filtro === 'chiusi' ? 'check-all' : 'emoticon-happy-outline'}
          titolo={filtro === 'attivi' ? 'Tutto funziona!' : 'Nessun guasto'}
          testo={filtro === 'attivi' ? 'Se noti un problema, segnalalo con il pulsante in basso.' : undefined}
        />
      )}

      {visibili?.map((g) => {
        const s = stato(g.stato);
        return (
          <Riquadro key={g.id} onPress={() => router.push(`/guasti/${g.id}`)} style={styles.riga}>
            <IconaTonda icona={s.icona} tinta={tinte[s.tinta]} />
            <View style={styles.flex}>
              <Text variant="titleMedium" numberOfLines={2}>
                {g.titolo}
              </Text>
              <Nota>
                {data(g.creato_il)} · {autore(g.autore)}
              </Nota>
              <View style={styles.sotto}>
                <Etichetta testo={s.etichetta} tinta={tinte[s.tinta]} />
                {g.guasti_foto.length > 0 && (
                  <View style={styles.foto}>
                    <Icon source="camera-outline" size={14} color={tema.colors.onSurfaceVariant} />
                    <Nota>{g.guasti_foto.length}</Nota>
                  </View>
                )}
              </View>
            </View>
            <Icon source="chevron-right" size={20} color={tema.colors.onSurfaceVariant} />
          </Riquadro>
        );
      })}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
  sotto: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  foto: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
