// Elenco dei sondaggi: aperti in alto, poi quelli conclusi.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { CampoRicerca, corrisponde } from '@/components/CampoRicerca';
import { Pagina } from '@/components/Pagina';
import { BottoneNuovo, Errore, Etichetta, IconaTonda, Nota, Riquadro, Titoletto, Vuoto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { data, dataOra } from '@/lib/formato';
import { aperto } from '@/lib/sondaggi';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { Sondaggio } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

export default function Sondaggi() {
  const { profilo } = useAuth();
  const tema = useTheme();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';
  const [cerca, setCerca] = useState('');

  const leggi = useCallback(async () => {
    const [s, v] = await Promise.all([
      supabase
        .from('sondaggi')
        .select('*, sondaggi_opzioni!sondaggi_opzioni_sondaggio_id_fkey(*)')
        .order('creato_il', { ascending: false })
        .returns<Sondaggio[]>(),
      supabase.from('voti').select('sondaggio_id').eq('utente_id', profilo?.id ?? ''),
    ]);
    const error = s.error ?? v.error;
    if (error) return { data: null, error };
    return { data: { sondaggi: s.data ?? [], votati: new Set((v.data ?? []).map((x) => x.sondaggio_id as string)) }, error: null };
  }, [profilo?.id]);
  const { dati, errore, aggiorna, aggiornamento } = useDati(leggi);

  const trovati = (dati?.sondaggi ?? []).filter((s) =>
    corrisponde(cerca, s.domanda, s.descrizione, ...s.sondaggi_opzioni.map((o) => `${o.testo} ${o.ditta ?? ''}`)),
  );
  const aperti = trovati.filter(aperto);
  const conclusi = trovati.filter((s) => !aperto(s));

  function Scheda({ s }: { s: Sondaggio }) {
    const ok = aperto(s);
    const votato = dati?.votati.has(s.id);
    const tinta = !ok ? tinte.grigio : votato ? tinte.verde : tinte.viola;
    return (
      <Riquadro onPress={() => router.push(`/sondaggi/${s.id}`)} style={styles.riga}>
        <IconaTonda icona={ok ? 'vote-outline' : 'archive-outline'} tinta={tinta} />
        <View style={styles.flex}>
          <Text variant="titleMedium" numberOfLines={3}>
            {s.domanda}
          </Text>
          <Nota>
            {s.modalita === 'millesimi' ? 'Per millesimi' : 'Per testa'} ·{' '}
            {s.scadenza ? `${ok ? 'scade' : 'scaduto'} il ${dataOra(s.scadenza)}` : `dal ${data(s.creato_il)}`}
          </Nota>
          <View style={styles.sotto}>
            <Etichetta testo={!ok ? 'Concluso' : votato ? 'Hai votato' : 'Da votare'} tinta={tinta} />
          </View>
        </View>
        <Icon source="chevron-right" size={20} color={tema.colors.onSurfaceVariant} />
      </Riquadro>
    );
  }

  return (
    <Pagina
      titolo="Sondaggi"
      sottotitolo="Decisioni comuni"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={admin && <BottoneNuovo etichetta="Nuovo sondaggio" onPress={() => router.push('/sondaggi/nuovo')} />}
    >
      <CampoRicerca valore={cerca} onCambia={setCerca} segnaposto="Cerca nei sondaggi (anche nei preventivi)" />
      <Errore testo={errore} />
      {dati === null && !errore && <ActivityIndicator style={styles.caricamento} />}
      {dati?.sondaggi.length === 0 && (
        <Vuoto icona="vote-outline" titolo="Nessun sondaggio" testo="Quando ci sarà da decidere qualcosa insieme, lo troverai qui." />
      )}

      {aperti.length > 0 && <Titoletto>In corso</Titoletto>}
      {aperti.map((s) => (
        <Scheda key={s.id} s={s} />
      ))}
      {conclusi.length > 0 && <Titoletto>Conclusi</Titoletto>}
      {conclusi.map((s) => (
        <Scheda key={s.id} s={s} />
      ))}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
  sotto: { flexDirection: 'row', marginTop: 6 },
});
