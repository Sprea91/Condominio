// Dettaglio di un sondaggio: voto e risultati.
// I risultati si vedono dopo aver votato o a sondaggio concluso (l'amministratore li vede sempre).
// Nessuno vede chi ha votato cosa: i totali arrivano dalla funzione risultati_sondaggio.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, Text, useTheme } from 'react-native-paper';

import { Allegati } from '@/components/Allegati';
import { BottoneConferma } from '@/components/BottoneConferma';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { Errore, Etichetta, IconaTonda, Nota, Riquadro, Titoletto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apriFile, caricaFile, eliminaFile, TIPI_DOCUMENTO, type FileScelto } from '@/lib/file';
import { dataOra, euro, millesimi } from '@/lib/formato';
import { aperto } from '@/lib/sondaggi';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { RisultatoOpzione, Sondaggio } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type Dati = {
  sondaggio: Sondaggio;
  mieiVoti: string[]; // opzioni scelte da me (più di una nei sondaggi a scelta multipla)
  risultati: RisultatoOpzione[];
  aventiDiritto: { persone: number; millesimi: number };
  // chi ha votato (persone diverse): con la scelta multipla i voti sono più dei votanti
  votanti: { persone: number; millesimi: number } | null;
};

// Barra orizzontale colorata (quota da 0 a 1)
function Barra({ quota, colore, sfondo }: { quota: number; colore: string; sfondo: string }) {
  return (
    <View style={[styles.barra, { backgroundColor: sfondo }]}>
      <View style={[styles.riempimento, { width: `${Math.round(quota * 100)}%`, backgroundColor: colore }]} />
    </View>
  );
}

// Documenti allegati al sondaggio: si aprono con un tocco; l'amministratore può aggiungerne
function DocumentiSondaggio({ sondaggioId, admin }: { sondaggioId: string; admin: boolean }) {
  const [nuovi, setNuovi] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');
  const leggi = useCallback(
    () =>
      supabase
        .from('sondaggi_allegati')
        .select('*')
        .eq('sondaggio_id', sondaggioId)
        .order('creato_il')
        .returns<{ id: string; percorso: string; nome_file: string; tipo_mime: string }[]>(),
    [sondaggioId],
  );
  const { dati, errore: erroreLettura, ricarica } = useDati(leggi);

  async function carica() {
    setErrore('');
    setInCorso(true);
    try {
      for (const f of nuovi) {
        const percorso = await caricaFile('documenti', `sondaggi/${sondaggioId}`, f);
        const { error } = await supabase
          .from('sondaggi_allegati')
          .insert({ sondaggio_id: sondaggioId, percorso, nome_file: f.nome, tipo_mime: f.tipo });
        if (error) throw new Error(error.message);
      }
      setNuovi([]);
      ricarica();
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  async function elimina(a: { id: string; percorso: string }) {
    await eliminaFile('documenti', [a.percorso]);
    await supabase.from('sondaggi_allegati').delete().eq('id', a.id);
    ricarica();
  }

  // Tabella non ancora creata (supabase/15-...sql): la sezione non si mostra
  if (erroreLettura || (!dati?.length && !admin)) return null;

  return (
    <>
      <Titoletto>Documenti da consultare</Titoletto>
      <Riquadro>
        {!dati?.length && <Nota>Nessun documento allegato.</Nota>}
        <Allegati bucket="documenti" file={(dati ?? []).map((a) => ({ percorso: a.percorso, nome: a.nome_file, tipo: a.tipo_mime }))} />
        {admin &&
          (dati ?? []).map((a) => (
            <View key={a.id} style={styles.rigaRisultato}>
              <Nota style={styles.flex}>{a.nome_file}</Nota>
              <BottoneConferma etichetta="" conferma="Elimina" onConferma={() => elimina(a)} />
            </View>
          ))}
        {admin && (
          <>
            <SceltaFile file={nuovi} onCambia={setNuovi} tipi={TIPI_DOCUMENTO} etichetta="Aggiungi documenti" />
            {nuovi.length > 0 && (
              <Button mode="contained" onPress={carica} loading={inCorso} disabled={inCorso}>
                Carica {nuovi.length} file
              </Button>
            )}
            <Errore testo={errore} />
          </>
        )}
      </Riquadro>
    </>
  );
}

export default function DettaglioSondaggio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profilo } = useAuth();
  const tema = useTheme();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';
  const [scelta, setScelta] = useState<string[]>([]);
  const [cambio, setCambio] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  const leggi = useCallback(async () => {
    const [s, v, r, p, vt] = await Promise.all([
      supabase.from('sondaggi').select('*, sondaggi_opzioni!sondaggi_opzioni_sondaggio_id_fkey(*)').eq('id', id).single<Sondaggio>(),
      supabase.from('voti').select('opzione_id').eq('sondaggio_id', id).eq('utente_id', profilo?.id ?? ''),
      supabase.rpc('risultati_sondaggio', { p_sondaggio: id }),
      supabase.from('profili').select('millesimi').eq('approvato', true),
      // funzione di supabase/11-...sql: se non c'è ancora si usano i totali dei voti
      supabase.rpc('votanti_sondaggio', { p_sondaggio: id }),
    ]);
    const error = s.error ?? v.error ?? r.error ?? p.error;
    if (error || !s.data) return { data: null, error: error ?? { message: 'Sondaggio non trovato' } };
    const dati: Dati = {
      sondaggio: { ...s.data, sondaggi_opzioni: [...s.data.sondaggi_opzioni].sort((a, b) => a.ordine - b.ordine) },
      mieiVoti: (v.data ?? []).map((x) => x.opzione_id as string),
      risultati: (r.data ?? []) as RisultatoOpzione[],
      aventiDiritto: {
        persone: p.data?.length ?? 0,
        millesimi: (p.data ?? []).reduce((t, x) => t + Number(x.millesimi), 0),
      },
      votanti: vt.error
        ? null
        : {
            persone: Number((vt.data as { persone: number }[] | null)?.[0]?.persone ?? 0),
            millesimi: Number((vt.data as { millesimi: number }[] | null)?.[0]?.millesimi ?? 0),
          },
    };
    return { data: dati, error: null };
  }, [id, profilo?.id]);
  const { dati, errore: erroreCaricamento, ricarica } = useDati(leggi);

  if (erroreCaricamento)
    return (
      <Pagina titolo="Sondaggio">
        <Errore testo={erroreCaricamento} />
      </Pagina>
    );
  if (!dati)
    return (
      <Pagina titolo="Sondaggio">
        <ActivityIndicator style={styles.caricamento} />
      </Pagina>
    );

  const { sondaggio: s, mieiVoti, risultati, aventiDiritto, votanti } = dati;
  const votabile = aperto(s);
  const perMillesimi = s.modalita === 'millesimi';
  const multipla = !!s.multipla;
  const massimoScelte = multipla ? (s.max_scelte ?? null) : 1;
  const hoVotato = mieiVoti.length > 0;
  const mostraVoto = votabile && (!hoVotato || cambio);
  const mostraRisultati = admin || hoVotato || !votabile;
  const conPreventivi = s.sondaggi_opzioni.some((o) => o.importo != null || !!o.preventivo_path);

  const totaleTeste = risultati.reduce((t, x) => t + Number(x.voti_testa), 0);
  const totaleMillesimi = risultati.reduce((t, x) => t + Number(x.voti_millesimi), 0);
  const valore = (r: RisultatoOpzione) => (perMillesimi ? Number(r.voti_millesimi) : Number(r.voti_testa));
  // Chi ha votato: persone diverse (con la scelta multipla una persona dà più voti)
  const votantiTeste = votanti?.persone ?? totaleTeste;
  const votantiMillesimi = votanti?.millesimi ?? totaleMillesimi;
  // Percentuale di ogni opzione: sui voti totali (scelta singola) o sui votanti (scelta multipla)
  const totale = multipla ? (perMillesimi ? votantiMillesimi : votantiTeste) : perMillesimi ? totaleMillesimi : totaleTeste;
  const massimo = Math.max(0, ...risultati.map(valore));
  const partecipazione = perMillesimi
    ? aventiDiritto.millesimi > 0
      ? votantiMillesimi / aventiDiritto.millesimi
      : 0
    : aventiDiritto.persone > 0
      ? votantiTeste / aventiDiritto.persone
      : 0;

  function tocca(opzione: string) {
    setErrore('');
    if (!multipla) {
      setScelta([opzione]);
      return;
    }
    if (scelta.includes(opzione)) setScelta(scelta.filter((x) => x !== opzione));
    else if (massimoScelte && scelta.length >= massimoScelte) setErrore(`Puoi scegliere al massimo ${massimoScelte} opzioni.`);
    else setScelta([...scelta, opzione]);
  }

  async function vota() {
    if (!scelta.length) {
      setErrore(multipla ? 'Scegli almeno un’opzione.' : 'Scegli un’opzione.');
      return;
    }
    setErrore('');
    setInCorso(true);
    try {
      if (hoVotato) {
        const { error } = await supabase.from('voti').delete().eq('sondaggio_id', s.id).eq('utente_id', profilo!.id);
        if (error) throw new Error(error.message);
      }
      const { error } = await supabase.from('voti').insert(scelta.map((o) => ({ sondaggio_id: s.id, opzione_id: o })));
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
      {/* Domanda */}
      <Riquadro>
        <View style={styles.etichette}>
          <Etichetta
            testo={votabile ? 'In corso' : 'Concluso'}
            tinta={votabile ? tinte.viola : tinte.grigio}
            icona={votabile ? 'clock-outline' : 'archive-outline'}
          />
          {multipla && <Etichetta testo="Più scelte" tinta={tinte.verde} icona="checkbox-multiple-marked-outline" />}
          <Etichetta
            testo={perMillesimi ? 'Per millesimi' : 'Per testa'}
            tinta={tinte.blu}
            icona={perMillesimi ? 'chart-pie' : 'account-multiple'}
          />
        </View>
        <Text variant="headlineSmall">{s.domanda}</Text>
        {!!s.descrizione && (
          <Text variant="bodyLarge" style={styles.testo}>
            {s.descrizione}
          </Text>
        )}
        {s.scadenza && <Nota>{`${votabile ? 'Si vota fino al' : 'Scaduto il'} ${dataOra(s.scadenza)}`}</Nota>}
      </Riquadro>

      {/* Documenti da consultare */}
      <DocumentiSondaggio sondaggioId={s.id} admin={admin} />

      {/* Voto */}
      {mostraVoto && (
        <>
          <Titoletto>{hoVotato ? 'Cambia il tuo voto' : 'Il tuo voto'}</Titoletto>
          {multipla && (
            <Nota>
              Puoi scegliere più opzioni{massimoScelte ? ` (al massimo ${massimoScelte})` : ''}.
            </Nota>
          )}
          {s.sondaggi_opzioni.map((o) => {
            const scelto = scelta.includes(o.id);
            return (
              <Pressable
                key={o.id}
                onPress={() => tocca(o.id)}
                style={[
                  styles.opzione,
                  {
                    borderColor: scelto ? tema.colors.primary : tema.colors.outlineVariant,
                    backgroundColor: scelto ? tema.colors.primaryContainer : tema.colors.surface,
                  },
                ]}
              >
                <Icon
                  source={
                    multipla ? (scelto ? 'checkbox-marked' : 'checkbox-blank-outline') : scelto ? 'radiobox-marked' : 'radiobox-blank'
                  }
                  size={22}
                  color={scelto ? tema.colors.primary : tema.colors.onSurfaceVariant}
                />
                <View style={styles.flex}>
                  <Text variant="titleMedium">{o.testo}</Text>
                  {o.importo != null && <Text variant="bodyMedium">{euro(o.importo)}</Text>}
                </View>
                {!!o.preventivo_path && (
                  <Button compact icon="file-pdf-box" onPress={() => apriFile('documenti', o.preventivo_path!)}>
                    Preventivo
                  </Button>
                )}
              </Pressable>
            );
          })}
          <Errore testo={errore} />
          <View style={styles.azioni}>
            {cambio && <Button onPress={() => setCambio(false)}>Annulla</Button>}
            <Button mode="contained" icon="check" onPress={vota} loading={inCorso} disabled={inCorso || !scelta.length}>
              Conferma voto
            </Button>
          </View>
        </>
      )}

      {/* Preventivi a confronto (visibili sempre, anche dopo il voto) */}
      {conPreventivi && !mostraVoto && (
        <>
          <Titoletto>Preventivi</Titoletto>
          {s.sondaggi_opzioni.map((o) => (
            <Riquadro key={o.id} style={styles.riga}>
              <IconaTonda icona="file-document-outline" tinta={tinte.blu} dimensione={40} />
              <View style={styles.flex}>
                <Text variant="titleMedium">{o.testo}</Text>
                {o.importo != null && <Text variant="bodyLarge">{euro(o.importo)}</Text>}
              </View>
              {!!o.preventivo_path && (
                <Button compact icon="open-in-new" onPress={() => apriFile('documenti', o.preventivo_path!)}>
                  Apri
                </Button>
              )}
            </Riquadro>
          ))}
        </>
      )}

      {/* Voto già dato */}
      {hoVotato && !cambio && (
        <Riquadro style={[styles.riga, { backgroundColor: tinte.verde.sfondo, borderColor: tinte.verde.sfondo }]}>
          <Icon source="check-circle" size={24} color={tinte.verde.testo} />
          <View style={styles.flex}>
            <Text variant="labelMedium" style={{ color: tinte.verde.testo }}>
              Hai votato
            </Text>
            <Text variant="titleMedium" style={{ color: tinte.verde.testo }}>
              {s.sondaggi_opzioni
                .filter((o) => mieiVoti.includes(o.id))
                .map((o) => o.testo)
                .join(', ')}
            </Text>
          </View>
          {votabile && (
            <Button
              compact
              textColor={tinte.verde.testo}
              onPress={() => {
                setScelta(mieiVoti);
                setCambio(true);
              }}
            >
              Cambia
            </Button>
          )}
        </Riquadro>
      )}

      {/* Risultati */}
      {mostraRisultati ? (
        <>
          <Titoletto>Risultati</Titoletto>
          <Riquadro style={styles.risultati}>
            {risultati.map((r) => {
              const v = valore(r);
              const quota = totale > 0 ? v / totale : 0;
              const inTesta = v > 0 && v === massimo;
              return (
                <View key={r.opzione_id} style={styles.risultato}>
                  <View style={styles.rigaRisultato}>
                    <Text variant="titleSmall" style={styles.flex}>
                      {r.testo}
                    </Text>
                    <Text variant="titleSmall">{Math.round(quota * 100)}%</Text>
                  </View>
                  <Barra
                    quota={quota}
                    colore={inTesta ? tema.colors.primary : tema.colors.outline}
                    sfondo={tema.colors.surfaceVariant}
                  />
                  <Nota>{perMillesimi ? `${millesimi(v)} millesimi · ${r.voti_testa} voti` : `${v} vot${v === 1 ? 'o' : 'i'}`}</Nota>
                </View>
              );
            })}
            <View style={[styles.partecipazione, { borderTopColor: tema.colors.outlineVariant }]}>
              <View style={styles.rigaRisultato}>
                <Nota>Partecipazione</Nota>
                <Nota>
                  {perMillesimi
                    ? `${millesimi(votantiMillesimi)} / ${millesimi(aventiDiritto.millesimi)} millesimi`
                    : `${votantiTeste} / ${aventiDiritto.persone} condòmini`}
                </Nota>
              </View>
              <Barra quota={Math.min(1, partecipazione)} colore={tinte.verde.testo} sfondo={tema.colors.surfaceVariant} />
            </View>
          </Riquadro>
        </>
      ) : (
        <Nota style={styles.centro}>I risultati saranno visibili dopo il tuo voto.</Nota>
      )}

      {/* Gestione */}
      {admin && (
        <>
          <Titoletto>Gestione amministratore</Titoletto>
          <Riquadro style={styles.azioni}>
            <BottoneConferma etichetta="Elimina" conferma="Elimina sondaggio" onConferma={elimina} />
            <Button mode="contained-tonal" icon={s.chiuso ? 'lock-open-outline' : 'lock-outline'} onPress={() => chiudi(!s.chiuso)}>
              {s.chiuso ? 'Riapri votazione' : 'Chiudi votazione'}
            </Button>
          </Riquadro>
        </>
      )}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  etichette: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  testo: { lineHeight: 24 },
  opzione: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 16, padding: 16 },
  flex: { flex: 1 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  risultati: { gap: 16 },
  risultato: { gap: 6 },
  rigaRisultato: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  barra: { height: 10, borderRadius: 5, overflow: 'hidden' },
  riempimento: { height: '100%', borderRadius: 5 },
  partecipazione: { borderTopWidth: 1, paddingTop: 12, gap: 6 },
  centro: { alignSelf: 'center' },
});
