// Preventivi: elenco delle richieste (es. "Rifacimento tetto"), ognuna con i preventivi raccolti.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { CampoRicerca, corrisponde } from '@/components/CampoRicerca';
import { Pagina } from '@/components/Pagina';
import { BottoneNuovo, Errore, Etichetta, IconaTonda, Nota, Riquadro, Titoletto, Vuoto } from '@/components/ui';
import { data, euro } from '@/lib/formato';
import { usePermessi } from '@/lib/permessi';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { RichiestaPreventivi } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

export default function Preventivi() {
  const tema = useTheme();
  const tinte = useTinte();
  const { puo } = usePermessi();
  const [cerca, setCerca] = useState('');

  const leggi = useCallback(
    () =>
      supabase
        .from('preventivi_richieste')
        .select('*, preventivi(*)')
        .order('creato_il', { ascending: false })
        .returns<RichiestaPreventivi[]>(),
    [],
  );
  const { dati, errore, aggiorna, aggiornamento } = useDati(leggi);

  const trovate = (dati ?? []).filter((r) =>
    corrisponde(cerca, r.titolo, r.descrizione, ...r.preventivi.map((p) => `${p.ditta} ${p.descrizione ?? ''}`)),
  );
  const aperte = trovate.filter((r) => !r.chiusa);
  const chiuse = trovate.filter((r) => r.chiusa);

  function Scheda({ r }: { r: RichiestaPreventivi }) {
    const conImporto = r.preventivi.filter((p) => p.importo != null && p.stato !== 'scartato');
    const minimo = conImporto.length ? Math.min(...conImporto.map((p) => Number(p.importo))) : null;
    const accettato = r.preventivi.find((p) => p.stato === 'accettato');
    return (
      <Riquadro onPress={() => router.push(`/preventivi/${r.id}`)} style={styles.riga}>
        <IconaTonda icona="file-compare" tinta={r.chiusa ? tinte.grigio : tinte.blu} dimensione={40} />
        <View style={styles.flex}>
          <Text variant="titleMedium" numberOfLines={2}>
            {r.titolo}
          </Text>
          <Nota>
            {r.preventivi.length} preventiv{r.preventivi.length === 1 ? 'o' : 'i'} · dal {data(r.creato_il)}
          </Nota>
          <View style={styles.etichette}>
            {accettato ? (
              <Etichetta testo={`Scelto: ${accettato.ditta}`} tinta={tinte.verde} icona="check-circle-outline" />
            ) : (
              minimo !== null && <Etichetta testo={`Dal più basso: ${euro(minimo)}`} tinta={tinte.blu} icona="tag-outline" />
            )}
            {r.sondaggio_id && <Etichetta testo="Messa ai voti" tinta={tinte.viola} icona="vote-outline" />}
          </View>
        </View>
        <Icon source="chevron-right" size={20} color={tema.colors.onSurfaceVariant} />
      </Riquadro>
    );
  }

  return (
    <Pagina
      titolo="Preventivi"
      sottotitolo="Confronta le offerte delle ditte"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={puo('preventivi') && <BottoneNuovo etichetta="Nuova richiesta" onPress={() => router.push('/preventivi/nuova')} />}
    >
      <CampoRicerca valore={cerca} onCambia={setCerca} segnaposto="Cerca (es. tetto, nome della ditta)" />
      <Errore testo={errore} />
      {dati === null && !errore && <ActivityIndicator style={styles.caricamento} />}
      {dati?.length === 0 && (
        <Vuoto
          icona="file-compare"
          titolo="Nessuna richiesta di preventivo"
          testo="Crea una richiesta (es. “Rifacimento tetto”) e aggiungi i preventivi delle varie ditte."
        />
      )}
      {aperte.length > 0 && <Titoletto>In corso</Titoletto>}
      {aperte.map((r) => (
        <Scheda key={r.id} r={r} />
      ))}
      {chiuse.length > 0 && <Titoletto>Chiuse</Titoletto>}
      {chiuse.map((r) => (
        <Scheda key={r.id} r={r} />
      ))}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
  etichette: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
});
