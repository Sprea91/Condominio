// Dettaglio di una rata emessa (solo amministratore): chi ha pagato e chi no.
// "Segna pagata" registra anche l'entrata nel conto spese; "Annulla" la toglie.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Text, useTheme } from 'react-native-paper';

import { BottoneConferma } from '@/components/BottoneConferma';
import { Pagina } from '@/components/Pagina';
import { Errore, Etichetta, Nota, Riquadro, Titoletto } from '@/components/ui';
import { apriFile, eliminaFile } from '@/lib/file';
import { data, euro } from '@/lib/formato';
import { oggiIso, statoRata } from '@/lib/rate';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { EmissioneRate, Rata } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type Dati = { emissione: EmissioneRate; rate: Rata[] };

export default function DettaglioRata() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tinte = useTinte();
  const tema = useTheme();
  const [registraNelConto, setRegistraNelConto] = useState(false);
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [erroreAzione, setErroreAzione] = useState('');

  const leggi = useCallback(async () => {
    const [e, r] = await Promise.all([
      supabase.from('rate_emissioni').select('*').eq('id', id).maybeSingle<EmissioneRate>(),
      supabase.from('rate').select('*, profilo:profili(nome, appartamento, millesimi)').eq('emissione_id', id).returns<Rata[]>(),
    ]);
    const error = e.error ?? r.error;
    if (error) return { data: null, error };
    if (!e.data) return { data: null, error: { message: 'Rata non trovata (forse è stata eliminata).' } };
    const rate = [...(r.data ?? [])].sort((a, b) =>
      (a.profilo?.appartamento ?? '').localeCompare(b.profilo?.appartamento ?? '', 'it', { numeric: true }),
    );
    return { data: { emissione: e.data, rate } as Dati, error: null };
  }, [id]);
  const { dati, errore, ricarica } = useDati(leggi);

  if (errore)
    return (
      <Pagina titolo="Rata">
        <Errore testo={errore} />
      </Pagina>
    );
  if (!dati)
    return (
      <Pagina titolo="Rata">
        <ActivityIndicator style={styles.caricamento} />
      </Pagina>
    );

  const { emissione: e, rate } = dati;
  const incassato = rate.filter((r) => r.pagata_il).reduce((t, r) => t + Number(r.importo), 0);
  const daConfermare = rate.filter((r) => !r.pagata_il && r.segnalata_il);
  const nomeCondomino = (r: Rata) =>
    `${r.profilo?.appartamento ? `App. ${r.profilo.appartamento} · ` : ''}${r.profilo?.nome ?? '—'}`;

  const dataPagamento = (r: Rata) => (r.segnalata_il ? r.segnalata_il.slice(0, 10) : oggiIso());

  async function segnaPagata(r: Rata) {
    setErroreAzione('');
    setInCorso(r.id);
    try {
      let movimentoId: string | null = null;
      if (registraNelConto && Number(r.importo) > 0) {
        const { data: m, error } = await supabase
          .from('movimenti')
          .insert({
            tipo: 'entrata',
            data: dataPagamento(r),
            descrizione: `${e.titolo} – ${r.profilo?.appartamento ? `app. ${r.profilo.appartamento}` : (r.profilo?.nome ?? '')}`,
            categoria: 'Rate condominiali',
            importo: r.importo,
          })
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        movimentoId = m.id;
      }
      const { error } = await supabase.from('rate').update({ pagata_il: dataPagamento(r), movimento_id: movimentoId }).eq('id', r.id);
      if (error) throw new Error(error.message);
      await ricarica();
    } catch (err) {
      setErroreAzione(`Errore: ${(err as Error).message}`);
    } finally {
      setInCorso(null);
    }
  }

  async function annullaPagamento(r: Rata) {
    setErroreAzione('');
    setInCorso(r.id);
    try {
      const { error } = await supabase.from('rate').update({ pagata_il: null, movimento_id: null }).eq('id', r.id);
      if (error) throw new Error(error.message);
      // toglie anche l'entrata registrata in automatico nel conto
      if (r.movimento_id) await supabase.from('movimenti').delete().eq('id', r.movimento_id);
      await ricarica();
    } catch (err) {
      setErroreAzione(`Errore: ${(err as Error).message}`);
    } finally {
      setInCorso(null);
    }
  }

  // La segnalazione non torna: la rata ritorna "da pagare" per il condòmino
  async function rifiutaSegnalazione(r: Rata) {
    setErroreAzione('');
    setInCorso(r.id);
    try {
      const { error } = await supabase
        .from('rate')
        .update({ segnalata_il: null, segnalata_nota: null, ricevuta_path: null, ricevuta_nome: null })
        .eq('id', r.id);
      if (error) throw new Error(error.message);
      if (r.ricevuta_path) await eliminaFile('ricevute', [r.ricevuta_path]);
      await ricarica();
    } catch (err) {
      setErroreAzione(`Errore: ${(err as Error).message}`);
    } finally {
      setInCorso(null);
    }
  }

  async function elimina() {
    await supabase.from('rate_emissioni').delete().eq('id', e.id);
    router.back();
  }

  return (
    <Pagina titolo={e.titolo} sottotitolo={`Scadenza ${data(e.scadenza)}`}>
      <Riquadro>
        <View style={styles.riga}>
          <View style={styles.flex}>
            <Nota>Incassato</Nota>
            <Text variant="headlineSmall">{euro(incassato)}</Text>
          </View>
          <View style={styles.destra}>
            <Nota>Totale</Nota>
            <Text variant="titleMedium">{euro(e.totale)}</Text>
          </View>
        </View>
        <Nota>
          Divisa {e.ripartizione === 'millesimi' ? 'per millesimi' : e.ripartizione === 'uguale' ? 'in parti uguali' : 'a mano'}
          {e.note ? ` · ${e.note}` : ''}
        </Nota>
        <View style={styles.riga}>
          <Checkbox.Android status={registraNelConto ? 'checked' : 'unchecked'} onPress={() => setRegistraNelConto(!registraNelConto)} />
          <Text variant="bodyMedium" style={styles.flex} onPress={() => setRegistraNelConto(!registraNelConto)}>
            Quando segno un pagamento, registralo anche come entrata nel Conto spese
          </Text>
        </View>
      </Riquadro>

      <Errore testo={erroreAzione} />
      {daConfermare.length > 0 && <Titoletto>Pagamenti da confermare</Titoletto>}
      {daConfermare.map((r) => (
        <Riquadro key={r.id} evidenziato>
          <View style={styles.riga}>
            <View style={styles.flex}>
              <Text variant="titleSmall">{nomeCondomino(r)}</Text>
              <Nota>Dice di aver pagato il {data(r.segnalata_il!)}</Nota>
              {!!r.segnalata_nota && <Text variant="bodyMedium">“{r.segnalata_nota}”</Text>}
            </View>
            <Text variant="titleSmall">{euro(r.importo)}</Text>
          </View>
          <View style={styles.azioniRiga}>
            {r.ricevuta_path ? (
              <Button compact icon="receipt" onPress={() => apriFile('ricevute', r.ricevuta_path!)}>
                Vedi ricevuta
              </Button>
            ) : (
              <Nota style={styles.flex}>Nessuna ricevuta allegata</Nota>
            )}
            <Button compact textColor={tema.colors.error} onPress={() => rifiutaSegnalazione(r)} disabled={!!inCorso}>
              Rifiuta
            </Button>
            <Button compact mode="contained" icon="check" onPress={() => segnaPagata(r)} loading={inCorso === r.id} disabled={!!inCorso}>
              Conferma
            </Button>
          </View>
        </Riquadro>
      ))}

      <Titoletto>Condòmini</Titoletto>
      {rate.map((r) => {
        const s = statoRata({ pagata_il: r.pagata_il, segnalata_il: r.segnalata_il, scadenza: e.scadenza });
        return (
          <Riquadro key={r.id} style={styles.riga}>
            <View style={styles.flex}>
              <Text variant="titleSmall">{nomeCondomino(r)}</Text>
              <View style={styles.etichetta}>
                <Etichetta
                  testo={
                    s === 'pagata'
                      ? `Pagata il ${data(r.pagata_il!)}`
                      : s === 'in_verifica'
                        ? 'Da confermare'
                        : s === 'in_ritardo'
                          ? 'In ritardo'
                          : 'Da pagare'
                  }
                  tinta={s === 'pagata' ? tinte.verde : s === 'in_verifica' ? tinte.blu : s === 'in_ritardo' ? tinte.rosso : tinte.arancio}
                />
              </View>
            </View>
            <Text variant="titleSmall">{euro(r.importo)}</Text>
            {r.pagata_il ? (
              <Button compact onPress={() => annullaPagamento(r)} loading={inCorso === r.id} disabled={!!inCorso}>
                Annulla
              </Button>
            ) : (
              // anche senza segnalazione (es. pagato in contanti) l'amministratore può segnarla pagata
              <Button compact mode="outlined" onPress={() => segnaPagata(r)} loading={inCorso === r.id} disabled={!!inCorso}>
                Pagata
              </Button>
            )}
          </Riquadro>
        );
      })}

      <Titoletto>Gestione</Titoletto>
      <Riquadro style={styles.azioni}>
        <Nota style={styles.flex}>Eliminando la rata le entrate già registrate nel conto restano.</Nota>
        <BottoneConferma etichetta="Elimina rata" conferma="Elimina" onConferma={elimina} />
      </Riquadro>
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  destra: { alignItems: 'flex-end' },
  etichetta: { flexDirection: 'row', marginTop: 4 },
  azioni: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  azioniRiga: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
});
