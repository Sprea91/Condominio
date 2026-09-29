// Elenco delle assemblee: prossime in alto (dalla più vicina), poi l'archivio delle passate.
import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { DataCalendario } from '@/components/DataCalendario';
import { Pagina } from '@/components/Pagina';
import { BottoneNuovo, Errore, Etichetta, Nota, Riquadro, Titoletto, Vuoto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ora, traQuanto } from '@/lib/formato';
import { RISPOSTE } from '@/lib/presenze';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { Assemblea, RispostaPresenza } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

export default function Assemblee() {
  const { profilo } = useAuth();
  const tema = useTheme();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';

  const leggi = useCallback(async () => {
    const [a, p] = await Promise.all([
      supabase.from('assemblee').select('*, assemblee_allegati(*)').order('data_ora', { ascending: true }).returns<Assemblea[]>(),
      supabase.from('presenze').select('assemblea_id, risposta').eq('utente_id', profilo?.id ?? ''),
    ]);
    const error = a.error ?? p.error;
    if (error) return { data: null, error };
    const mie = new Map((p.data ?? []).map((x) => [x.assemblea_id as string, x.risposta as RispostaPresenza]));
    return { data: { assemblee: a.data ?? [], mie }, error: null };
  }, [profilo?.id]);
  const { dati, errore, aggiorna, aggiornamento } = useDati(leggi);

  const adesso = new Date().toISOString();
  const prossime = dati?.assemblee.filter((a) => a.data_ora >= adesso) ?? [];
  const passate = [...(dati?.assemblee.filter((a) => a.data_ora < adesso) ?? [])].reverse();

  function Scheda({ a, passata }: { a: Assemblea; passata: boolean }) {
    const risposta = dati?.mie.get(a.id);
    const r = risposta ? RISPOSTE.find((x) => x.valore === risposta) : null;
    const haVerbale = a.assemblee_allegati.some((f) => f.categoria === 'verbale');
    return (
      <Riquadro onPress={() => router.push(`/assemblee/${a.id}`)} style={styles.riga}>
        <DataCalendario iso={a.data_ora} passata={passata} />
        <View style={styles.flex}>
          <Text variant="titleMedium" numberOfLines={2}>
            {a.titolo}
          </Text>
          <Nota>
            ore {ora(a.data_ora)}
            {a.luogo ? ` · ${a.luogo}` : ''}
          </Nota>
          <View style={styles.etichette}>
            {!passata && <Etichetta testo={traQuanto(a.data_ora)} tinta={tinte.blu} icona="clock-outline" />}
            {!passata && r && <Etichetta testo={r.breve} tinta={tinte[r.tinta]} icona={r.icona} />}
            {!passata && !r && <Etichetta testo="Rispondi" tinta={tinte.arancio} icona="help-circle-outline" />}
            {passata && haVerbale && <Etichetta testo="Verbale" tinta={tinte.verde} icona="file-document-outline" />}
          </View>
        </View>
        <Icon source="chevron-right" size={20} color={tema.colors.onSurfaceVariant} />
      </Riquadro>
    );
  }

  return (
    <Pagina
      titolo="Assemblee"
      sottotitolo="Convocazioni, presenze e verbali"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={admin && <BottoneNuovo etichetta="Nuova assemblea" onPress={() => router.push('/assemblee/nuova')} />}
    >
      <Errore testo={errore} />
      {dati === null && !errore && <ActivityIndicator style={styles.caricamento} />}
      {dati?.assemblee.length === 0 && (
        <Vuoto icona="calendar-account-outline" titolo="Nessuna assemblea" testo="Qui troverai le convocazioni con data, ora e documenti." />
      )}

      {prossime.length > 0 && <Titoletto>In programma</Titoletto>}
      {prossime.map((a) => (
        <Scheda key={a.id} a={a} passata={false} />
      ))}
      {passate.length > 0 && <Titoletto>Archivio</Titoletto>}
      {passate.map((a) => (
        <Scheda key={a.id} a={a} passata />
      ))}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1, gap: 2 },
  etichette: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
});
