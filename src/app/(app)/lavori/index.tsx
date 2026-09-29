// Storico lavori: cosa è stato fatto nel condominio, quando, da chi, quanto è costato
// e fino a quando vale la garanzia. Raggruppati per anno, dal più recente.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { CampoRicerca, corrisponde } from '@/components/CampoRicerca';
import { Pagina } from '@/components/Pagina';
import { BottoneNuovo, Errore, Etichetta, IconaTonda, Nota, Riquadro, Titoletto, Vuoto } from '@/components/ui';
import { data, euro } from '@/lib/formato';
import { statoGaranzia, statoLavoro } from '@/lib/lavori';
import { usePermessi } from '@/lib/permessi';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { Lavoro } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

export default function Lavori() {
  const tema = useTheme();
  const tinte = useTinte();
  const { puo } = usePermessi();
  const [cerca, setCerca] = useState('');

  const leggi = useCallback(
    () =>
      supabase
        .from('lavori')
        .select('*, lavori_allegati(*)')
        .order('data_lavoro', { ascending: false })
        .returns<Lavoro[]>(),
    [],
  );
  const { dati, errore, aggiorna, aggiornamento } = useDati(leggi);

  const trovati = (dati ?? []).filter((l) =>
    corrisponde(cerca, l.titolo, l.descrizione, l.ditta, ...l.lavori_allegati.map((f) => f.nome_file)),
  );
  const anni = [...new Set(trovati.map((l) => l.data_lavoro.slice(0, 4)))];
  const inGaranzia = (dati ?? []).filter((l) => statoGaranzia(l)?.valida).length;

  return (
    <Pagina
      titolo="Storico lavori"
      sottotitolo={dati?.length ? `${dati.length} lavori · ${inGaranzia} ancora in garanzia` : 'Interventi, fatture e garanzie'}
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={puo('lavori') && <BottoneNuovo etichetta="Nuovo lavoro" onPress={() => router.push('/lavori/nuovo')} />}
    >
      <CampoRicerca valore={cerca} onCambia={setCerca} segnaposto="Cerca nei lavori (es. tetto, caldaia, ditta)" />
      <Errore testo={errore} />
      {dati === null && !errore && <ActivityIndicator style={styles.caricamento} />}
      {dati?.length === 0 && (
        <Vuoto icona="hammer-wrench" titolo="Nessun lavoro registrato" testo="Qui resterà la storia degli interventi fatti nel condominio." />
      )}

      {anni.map((anno) => (
        <View key={anno} style={styles.gruppo}>
          <Titoletto>{anno}</Titoletto>
          {trovati
            .filter((l) => l.data_lavoro.startsWith(anno))
            .map((l) => {
              const g = statoGaranzia(l);
              const st = statoLavoro(l.stato);
              const fatture = l.lavori_allegati.filter((f) => f.categoria === 'fattura').length;
              return (
                <Riquadro key={l.id} onPress={() => router.push(`/lavori/${l.id}`)} style={styles.riga}>
                  <IconaTonda icona={st.icona} tinta={tinte[st.tinta]} dimensione={40} />
                  <View style={styles.flex}>
                    <Text variant="titleMedium" numberOfLines={2}>
                      {l.titolo}
                    </Text>
                    <Nota>
                      {data(l.data_lavoro)}
                      {l.ditta ? ` · ${l.ditta}` : ''}
                      {l.importo != null ? ` · ${euro(l.importo)}` : ''}
                    </Nota>
                    <View style={styles.etichette}>
                      {st.valore !== 'finito' && <Etichetta testo={st.etichetta} tinta={tinte[st.tinta]} icona={st.icona} />}
                      {g && (
                        <Etichetta
                          testo={g.valida ? `Garanzia fino al ${data(l.garanzia_fino!)}` : 'Garanzia scaduta'}
                          tinta={g.valida ? (g.inScadenza ? tinte.arancio : tinte.verde) : tinte.grigio}
                          icona="shield-check-outline"
                        />
                      )}
                      {fatture > 0 && <Etichetta testo={`${fatture} fattur${fatture === 1 ? 'a' : 'e'}`} tinta={tinte.blu} icona="receipt" />}
                    </View>
                  </View>
                  <Icon source="chevron-right" size={20} color={tema.colors.onSurfaceVariant} />
                </Riquadro>
              );
            })}
        </View>
      ))}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  gruppo: { gap: 12 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
  etichette: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
});
