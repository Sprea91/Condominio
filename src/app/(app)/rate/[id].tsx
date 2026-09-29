// Dettaglio di una rata emessa (solo amministratore): chi ha pagato e chi no.
// "Segna pagata" registra anche l'entrata nel conto spese; "Annulla" la toglie.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Icon, Text, TextInput, useTheme } from 'react-native-paper';

import { BottoneConferma } from '@/components/BottoneConferma';
import { CampoData } from '@/components/CampoData';
import { Pagina } from '@/components/Pagina';
import { Errore, Etichetta, Nota, Riquadro, Titoletto } from '@/components/ui';
import { apriFile, eliminaFile } from '@/lib/file';
import { data, dataOra, euro, leggiData, leggiNumero } from '@/lib/formato';
import { CAUSALE_PREDEFINITA, oggiIso, statoRata } from '@/lib/rate';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { EmissioneRate, Rata } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type Dati = { emissione: EmissioneRate; rate: Rata[] };

type EventoStoria = {
  id: string;
  evento: 'segnalata' | 'segnalazione_ritirata' | 'pagata' | 'pagamento_annullato' | 'importo_modificato';
  dettaglio: string | null;
  creato_il: string;
  autore: { nome: string | null } | null;
  rata: { profilo: { nome: string | null; appartamento: string | null } | null } | null;
};

const EVENTI: Record<EventoStoria['evento'], { testo: string; icona: string }> = {
  segnalata: { testo: 'ha segnalato il pagamento', icona: 'send-outline' },
  segnalazione_ritirata: { testo: 'segnalazione ritirata o rifiutata', icona: 'close-circle-outline' },
  pagata: { testo: 'pagamento confermato', icona: 'check-circle-outline' },
  pagamento_annullato: { testo: 'pagamento annullato', icona: 'undo' },
  importo_modificato: { testo: 'importo modificato', icona: 'pencil-outline' },
};

// Modifica di titolo, scadenza, note, causale e importi delle quote non ancora pagate
function ModificaRata({ emissione, rate, onFatto }: { emissione: EmissioneRate; rate: Rata[]; onFatto: (salvato: boolean) => void }) {
  const tema = useTheme();
  const [titolo, setTitolo] = useState(emissione.titolo);
  const [scadenza, setScadenza] = useState(data(`${emissione.scadenza}T12:00:00`));
  const [note, setNote] = useState(emissione.note ?? '');
  const [causale, setCausale] = useState(emissione.causale ?? '');
  const [importi, setImporti] = useState<Record<string, string>>(
    Object.fromEntries(rate.map((r) => [r.id, String(r.importo).replace('.', ',')])),
  );
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    const scadenzaDb = leggiData(scadenza);
    if (!titolo.trim()) {
      setErrore('Il titolo non può essere vuoto.');
      return;
    }
    if (!scadenzaDb) {
      setErrore('Scadenza non valida.');
      return;
    }
    const nuovi = rate.map((r) => ({ r, valore: r.pagata_il ? Number(r.importo) : leggiNumero(importi[r.id] ?? '') }));
    if (nuovi.some((x) => x.valore === null)) {
      setErrore('Controlla gli importi (esempio: 120,50).');
      return;
    }
    setInCorso(true);
    try {
      for (const { r, valore } of nuovi) {
        if (!r.pagata_il && Math.abs(Number(valore) - Number(r.importo)) > 0.001) {
          const { error } = await supabase.from('rate').update({ importo: valore }).eq('id', r.id);
          if (error) throw new Error(error.message);
        }
      }
      const totale = Math.round(nuovi.reduce((t, x) => t + Number(x.valore), 0) * 100) / 100;
      const { error } = await supabase
        .from('rate_emissioni')
        .update({
          titolo: titolo.trim(),
          scadenza: scadenzaDb,
          note: note.trim() || null,
          totale,
          // la causale si manda solo se la colonna esiste già (supabase/12-...sql) o se è stata scritta
          ...('causale' in emissione || causale.trim() ? { causale: causale.trim() || null } : {}),
        })
        .eq('id', emissione.id);
      if (error) throw new Error(error.message);
      onFatto(true);
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Riquadro evidenziato>
      <Text variant="titleSmall">Modifica rata</Text>
      <TextInput label="Titolo" mode="outlined" value={titolo} onChangeText={setTitolo} />
      <CampoData label="Scadenza" value={scadenza} onChangeText={setScadenza} />
      <TextInput label="Note" mode="outlined" value={note} onChangeText={setNote} />
      <TextInput
        label="Causale del bonifico"
        mode="outlined"
        value={causale}
        onChangeText={setCausale}
        placeholder={CAUSALE_PREDEFINITA}
      />
      <Nota>Vuota = automatica. Puoi usare {'{appartamento}'} e {'{nome}'}.</Nota>
      <Text variant="titleSmall">Importi</Text>
      {rate.map((r) => (
        <View key={r.id} style={[styles.rigaImporto, { borderBottomColor: tema.colors.outlineVariant }]}>
          <Text variant="bodyMedium" style={styles.flex}>
            {r.profilo?.appartamento ? `App. ${r.profilo.appartamento} · ` : ''}
            {r.profilo?.nome ?? '—'}
          </Text>
          {r.pagata_il ? (
            <Nota>{`${euro(r.importo)} (già pagata)`}</Nota>
          ) : (
            <TextInput
              style={styles.importo}
              mode="outlined"
              dense
              value={importi[r.id] ?? ''}
              onChangeText={(t) => setImporti({ ...importi, [r.id]: t })}
              keyboardType="decimal-pad"
            />
          )}
        </View>
      ))}
      <Errore testo={errore} />
      <View style={styles.azioniRiga}>
        <Button onPress={() => onFatto(false)} disabled={inCorso}>
          Annulla
        </Button>
        <Button mode="contained" onPress={salva} loading={inCorso} disabled={inCorso}>
          Salva modifiche
        </Button>
      </View>
    </Riquadro>
  );
}

// Registro di tutto quello che è successo alle quote di questa rata (supabase/13-...sql)
// idQuote: gli id delle quote separati da virgola (una stringa, così non cambia a ogni disegno dello schermo)
function StoricoRata({ idQuote }: { idQuote: string }) {
  const tema = useTheme();
  const leggi = useCallback(
    () =>
      supabase
        .from('rate_storia')
        .select('id, evento, dettaglio, creato_il, autore:profili(nome), rata:rate(profilo:profili(nome, appartamento))')
        .in('rata_id', idQuote.split(','))
        .order('creato_il', { ascending: false })
        .returns<EventoStoria[]>(),
    [idQuote],
  );
  const { dati, errore } = useDati(leggi);
  if (errore || !dati) return null;
  return (
    <>
      <Titoletto>Storico</Titoletto>
      <Riquadro>
        {dati.length === 0 && <Nota>Ancora nessun movimento su questa rata.</Nota>}
        {dati.map((ev) => {
          const info = EVENTI[ev.evento];
          const chi = ev.rata?.profilo;
          return (
            <View key={ev.id} style={styles.evento}>
              <Icon source={info.icona} size={18} color={tema.colors.onSurfaceVariant} />
              <View style={styles.flex}>
                <Text variant="bodyMedium">
                  <Text style={styles.grassetto}>
                    {chi?.appartamento ? `App. ${chi.appartamento} ` : ''}
                    {chi?.nome ?? ''}
                  </Text>
                  {` – ${info.testo}`}
                  {ev.dettaglio ? ` (${ev.dettaglio})` : ''}
                </Text>
                <Nota>
                  {dataOra(ev.creato_il)}
                  {ev.autore?.nome ? ` · da ${ev.autore.nome}` : ''}
                </Nota>
              </View>
            </View>
          );
        })}
      </Riquadro>
    </>
  );
}


export default function DettaglioRata() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tinte = useTinte();
  const tema = useTheme();
  const [registraNelConto, setRegistraNelConto] = useState(false);
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [erroreAzione, setErroreAzione] = useState('');
  const [modifica, setModifica] = useState(false);

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
        {!modifica && (
          <Button compact mode="outlined" icon="pencil-outline" onPress={() => setModifica(true)} style={styles.sinistra}>
            Modifica rata
          </Button>
        )}
        <View style={styles.riga}>
          <Checkbox.Android status={registraNelConto ? 'checked' : 'unchecked'} onPress={() => setRegistraNelConto(!registraNelConto)} />
          <Text variant="bodyMedium" style={styles.flex} onPress={() => setRegistraNelConto(!registraNelConto)}>
            Quando segno un pagamento, registralo anche come entrata nel Conto spese
          </Text>
        </View>
      </Riquadro>

      {modifica && (
        <ModificaRata
          emissione={e}
          rate={rate}
          onFatto={(salvato) => {
            setModifica(false);
            if (salvato) ricarica();
          }}
        />
      )}

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

      {[
        { titolo: `Non hanno ancora pagato (${rate.filter((r) => !r.pagata_il).length})`, elenco: rate.filter((r) => !r.pagata_il) },
        { titolo: `Hanno pagato (${rate.filter((r) => r.pagata_il).length})`, elenco: rate.filter((r) => r.pagata_il) },
      ].map((g) => (
        <View key={g.titolo} style={styles.gruppo}>
          {g.elenco.length > 0 && <Titoletto>{g.titolo}</Titoletto>}
          {g.elenco.map((r) => {
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
        </View>
      ))}

      <StoricoRata key={rate.map((r) => `${r.id}${r.pagata_il}${r.segnalata_il}${r.importo}`).join('|')} idQuote={rate.map((r) => r.id).join(',')} />

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
  sinistra: { alignSelf: 'flex-start' },
  gruppo: { gap: 12 },
  rigaImporto: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1 },
  importo: { width: 110 },
  evento: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  grassetto: { fontWeight: 'bold' },
  azioniRiga: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
});
