// Dettaglio di un sondaggio: voto e risultati.
// I risultati si vedono dopo aver votato o a sondaggio concluso (l'amministratore li vede sempre).
// Nessuno vede chi ha votato cosa: i totali arrivano dalla funzione risultati_sondaggio.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, HelperText, ProgressBar, RadioButton, Text } from 'react-native-paper';

import { BottoneConferma } from '@/components/BottoneConferma';
import { Pagina } from '@/components/Pagina';
import { useAuth } from '@/lib/auth';
import { dataOra, millesimi } from '@/lib/formato';
import { aperto } from '@/lib/sondaggi';
import { supabase } from '@/lib/supabase';
import type { RisultatoOpzione, Sondaggio } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type Dati = {
  sondaggio: Sondaggio;
  mioVoto: string | null;
  risultati: RisultatoOpzione[];
  aventiDiritto: { persone: number; millesimi: number };
};

export default function DettaglioSondaggio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profilo } = useAuth();
  const admin = profilo?.ruolo === 'amministratore';
  const [scelta, setScelta] = useState('');
  const [cambio, setCambio] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  const leggi = useCallback(async () => {
    const [s, v, r, p] = await Promise.all([
      supabase.from('sondaggi').select('*, sondaggi_opzioni(id, testo, ordine)').eq('id', id).single<Sondaggio>(),
      supabase.from('voti').select('opzione_id').eq('sondaggio_id', id).eq('utente_id', profilo?.id ?? '').maybeSingle(),
      supabase.rpc('risultati_sondaggio', { p_sondaggio: id }),
      supabase.from('profili').select('millesimi').eq('approvato', true),
    ]);
    const error = s.error ?? v.error ?? r.error ?? p.error;
    if (error || !s.data) return { data: null, error: error ?? { message: 'Sondaggio non trovato' } };
    const dati: Dati = {
      sondaggio: { ...s.data, sondaggi_opzioni: [...s.data.sondaggi_opzioni].sort((a, b) => a.ordine - b.ordine) },
      mioVoto: (v.data?.opzione_id as string | undefined) ?? null,
      risultati: (r.data ?? []) as RisultatoOpzione[],
      aventiDiritto: {
        persone: p.data?.length ?? 0,
        millesimi: (p.data ?? []).reduce((t, x) => t + Number(x.millesimi), 0),
      },
    };
    return { data: dati, error: null };
  }, [id, profilo?.id]);
  const { dati, errore: erroreCaricamento, ricarica } = useDati(leggi);

  if (erroreCaricamento) return <Pagina titolo="Sondaggio"><Text>{erroreCaricamento}</Text></Pagina>;
  if (!dati) return <Pagina titolo="Sondaggio"><ActivityIndicator /></Pagina>;

  const { sondaggio: s, mioVoto, risultati, aventiDiritto } = dati;
  const votabile = aperto(s);
  const perMillesimi = s.modalita === 'millesimi';
  const mostraVoto = votabile && (!mioVoto || cambio);
  const mostraRisultati = admin || !!mioVoto || !votabile;

  const totaleTeste = risultati.reduce((t, x) => t + Number(x.voti_testa), 0);
  const totaleMillesimi = risultati.reduce((t, x) => t + Number(x.voti_millesimi), 0);

  async function vota() {
    if (!scelta) {
      setErrore('Scegli un’opzione.');
      return;
    }
    setErrore('');
    setInCorso(true);
    try {
      if (mioVoto) {
        const { error } = await supabase.from('voti').delete().eq('sondaggio_id', s.id).eq('utente_id', profilo!.id);
        if (error) throw new Error(error.message);
      }
      const { error } = await supabase.from('voti').insert({ sondaggio_id: s.id, opzione_id: scelta });
      if (error) throw new Error(error.message);
      setCambio(false);
      await ricarica();
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  async function chiudi(chiuso: boolean) {
    await supabase.from('sondaggi').update({ chiuso }).eq('id', s.id);
    await ricarica();
  }

  async function elimina() {
    await supabase.from('sondaggi').delete().eq('id', s.id);
    router.back();
  }

  return (
    <Pagina titolo="Sondaggio">
      <Card mode="elevated">
        <Card.Title title={s.domanda} titleNumberOfLines={4} titleVariant="titleLarge" />
        <Card.Content style={styles.contenuto}>
          {!!s.descrizione && <Text variant="bodyMedium">{s.descrizione}</Text>}
          <Text variant="bodySmall">
            {perMillesimi ? 'Voto per millesimi' : 'Voto per testa (1 voto a testa)'}
            {s.scadenza ? ` · scadenza ${dataOra(s.scadenza)}` : ''}
            {!votabile ? ' · CONCLUSO' : ''}
          </Text>
        </Card.Content>
      </Card>

      {mostraVoto && (
        <Card mode="outlined">
          <Card.Title title={mioVoto ? 'Cambia il tuo voto' : 'Il tuo voto'} />
          <Card.Content>
            <RadioButton.Group onValueChange={setScelta} value={scelta}>
              {s.sondaggi_opzioni.map((o) => (
                <RadioButton.Item key={o.id} label={o.testo} value={o.id} />
              ))}
            </RadioButton.Group>
            <HelperText type="error" visible={!!errore}>
              {errore}
            </HelperText>
          </Card.Content>
          <Card.Actions>
            {cambio && <Button onPress={() => setCambio(false)}>Annulla</Button>}
            <Button mode="contained" onPress={vota} loading={inCorso} disabled={inCorso}>
              Vota
            </Button>
          </Card.Actions>
        </Card>
      )}

      {!!mioVoto && !cambio && (
        <Card mode="contained">
          <Card.Content>
            <Text variant="bodyMedium">
              Hai votato: <Text style={styles.grassetto}>{s.sondaggi_opzioni.find((o) => o.id === mioVoto)?.testo}</Text>
            </Text>
          </Card.Content>
          {votabile && (
            <Card.Actions>
              <Button
                onPress={() => {
                  setScelta(mioVoto);
                  setCambio(true);
                }}
              >
                Cambia voto
              </Button>
            </Card.Actions>
          )}
        </Card>
      )}

      {mostraRisultati && (
        <Card mode="outlined">
          <Card.Title
            title="Risultati"
            subtitle={
              perMillesimi
                ? `Votato: ${millesimi(totaleMillesimi)} su ${millesimi(aventiDiritto.millesimi)} millesimi (${totaleTeste} persone)`
                : `Votanti: ${totaleTeste} su ${aventiDiritto.persone}`
            }
            subtitleNumberOfLines={2}
          />
          <Card.Content style={styles.contenuto}>
            {risultati.map((r) => {
              const valore = perMillesimi ? Number(r.voti_millesimi) : Number(r.voti_testa);
              const totale = perMillesimi ? totaleMillesimi : totaleTeste;
              const quota = totale > 0 ? valore / totale : 0;
              return (
                <View key={r.opzione_id} style={styles.risultato}>
                  <View style={styles.rigaRisultato}>
                    <Text variant="bodyMedium" style={styles.opzione}>
                      {r.testo}
                    </Text>
                    <Text variant="bodyMedium">
                      {perMillesimi ? `${millesimi(valore)} ‰` : `${valore} vot${valore === 1 ? 'o' : 'i'}`} ·{' '}
                      {Math.round(quota * 100)}%
                    </Text>
                  </View>
                  <ProgressBar progress={quota} />
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}

      {!mostraRisultati && (
        <Text variant="bodySmall">I risultati saranno visibili dopo il tuo voto.</Text>
      )}

      {admin && (
        <Card mode="outlined">
          <Card.Title title="Gestione (amministratore)" />
          <Card.Actions>
            <BottoneConferma etichetta="Elimina" conferma="Elimina sondaggio" onConferma={elimina} />
            <Button mode="contained-tonal" onPress={() => chiudi(!s.chiuso)}>
              {s.chiuso ? 'Riapri votazione' : 'Chiudi votazione'}
            </Button>
          </Card.Actions>
        </Card>
      )}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  contenuto: { gap: 8 },
  grassetto: { fontWeight: 'bold' },
  risultato: { gap: 4 },
  rigaRisultato: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  opzione: { flex: 1 },
});
