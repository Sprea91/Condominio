// Bacheca avvisi: comunicazioni ufficiali con allegati.
// Quelli "in evidenza" stanno in cima qui e compaiono anche nella Home di tutti; quelli arrivati dopo l'ultima visita hanno l'etichetta "Nuovo".
// L'amministratore può pubblicarli, fissarli in alto ed eliminarli.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import { Allegati } from '@/components/Allegati';
import { BottoneConferma } from '@/components/BottoneConferma';
import { CampoRicerca, corrisponde } from '@/components/CampoRicerca';
import { Pagina } from '@/components/Pagina';
import { BottoneNuovo, Errore, Etichetta, Nota, Riquadro, Vuoto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { eliminaFile } from '@/lib/file';
import { autore, dataOra } from '@/lib/formato';
import { segnaVisitati, ultimaVisita } from '@/lib/letti';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { Avviso } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

export default function Avvisi() {
  const { profilo } = useAuth();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';
  // Letta una volta sola all'apertura: così i "Nuovo" restano visibili finché si è nella pagina
  const [visitaPrecedente] = useState(() => (profilo ? ultimaVisita(profilo.id) : null));
  const [erroreAzione, setErroreAzione] = useState('');
  const [cerca, setCerca] = useState('');

  const leggi = useCallback(async () => {
    const risultato = await supabase
      .from('avvisi')
      .select('*, autore:profili(nome, appartamento), avvisi_allegati(*)')
      .order('creato_il', { ascending: false })
      .returns<Avviso[]>();
    if (profilo && !risultato.error) segnaVisitati(profilo.id);
    return risultato;
  }, [profilo]);
  const { dati, errore, ricarica, aggiorna, aggiornamento } = useDati(leggi);

  // In evidenza prima, poi dal più recente
  const ordinati = dati
    ? [...dati]
        .filter((a) => corrisponde(cerca, a.titolo, a.testo, ...a.avvisi_allegati.map((f) => f.nome_file)))
        .sort((a, b) => Number(!!b.in_evidenza) - Number(!!a.in_evidenza)) : null;

  async function elimina(a: Avviso) {
    await eliminaFile('avvisi', a.avvisi_allegati.map((f) => f.percorso));
    await supabase.from('avvisi').delete().eq('id', a.id);
    await ricarica();
  }

  async function evidenzia(a: Avviso) {
    setErroreAzione('');
    const { error } = await supabase.from('avvisi').update({ in_evidenza: !a.in_evidenza }).eq('id', a.id);
    if (error) {
      setErroreAzione(
        error.code === 'PGRST204'
          ? 'Funzione non ancora attiva: esegui supabase/04-migliorie.sql in Supabase.'
          : `Errore: ${error.message}`,
      );
      return;
    }
    await ricarica();
  }

  return (
    <Pagina
      titolo="Bacheca avvisi"
      sottotitolo="Comunicazioni ufficiali del condominio"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={admin && <BottoneNuovo etichetta="Nuovo avviso" onPress={() => router.push('/avvisi/nuovo')} />}
    >
      <CampoRicerca valore={cerca} onCambia={setCerca} segnaposto="Cerca negli avvisi" />
      <Errore testo={errore || erroreAzione} />
      {dati === null && !errore && <ActivityIndicator style={styles.caricamento} />}
      {dati?.length === 0 && (
        <Vuoto icona="bullhorn-outline" titolo="Nessun avviso" testo="Qui compariranno le comunicazioni dell’amministratore." />
      )}

      {ordinati?.map((a) => {
        const nuovo = !!visitaPrecedente && a.creato_il > visitaPrecedente;
        return (
          <Riquadro key={a.id} evidenziato={!!a.in_evidenza}>
            {(a.in_evidenza || nuovo) && (
              <View style={styles.etichette}>
                {a.in_evidenza && <Etichetta testo="In evidenza nella Home" tinta={tinte.blu} icona="pin" />}
                {nuovo && <Etichetta testo="Nuovo" tinta={tinte.verde} icona="star-four-points" />}
              </View>
            )}
            <Text variant="titleLarge">{a.titolo}</Text>
            <Nota>
              {dataOra(a.creato_il)} · {autore(a.autore)}
            </Nota>
            <Text variant="bodyLarge" style={styles.testo}>
              {a.testo}
            </Text>
            <Allegati
              bucket="avvisi"
              file={a.avvisi_allegati.map((f) => ({ percorso: f.percorso, nome: f.nome_file, tipo: f.tipo_mime }))}
            />
            {admin && (
              <View style={styles.azioni}>
                <Button compact icon={a.in_evidenza ? 'pin-off-outline' : 'pin-outline'} onPress={() => evidenzia(a)}>
                  {a.in_evidenza ? 'Togli dalla Home' : 'Metti in evidenza nella Home'}
                </Button>
                <BottoneConferma etichetta="Elimina" conferma="Elimina avviso" onConferma={() => elimina(a)} />
              </View>
            )}
          </Riquadro>
        );
      })}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  etichette: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  testo: { lineHeight: 24 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 4 },
});
