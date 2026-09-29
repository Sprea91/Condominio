// Dettaglio di un'assemblea: quando e dove, ordine del giorno, convocazione e documenti,
// conferma di presenza, aggiunta al calendario. L'amministratore vede le risposte e carica i verbali.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, IconButton, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import { Allegati } from '@/components/Allegati';
import { BottoneConferma } from '@/components/BottoneConferma';
import { DataCalendario } from '@/components/DataCalendario';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { Errore, Etichetta, Nota, Riquadro, Titoletto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apriGoogleCalendar, scaricaIcs } from '@/lib/calendario';
import { caricaFile, eliminaFile, TIPI_ASSEMBLEA, type FileScelto } from '@/lib/file';
import { dataLunga, millesimi, ora, traQuanto } from '@/lib/formato';
import { RISPOSTE } from '@/lib/presenze';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { AllegatoAssemblea, Assemblea, CategoriaAllegato, Presenza, RispostaPresenza } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type PresenzaConMillesimi = Presenza & { profilo: { nome: string | null; appartamento: string | null; millesimi: number } | null };

type Dati = {
  assemblea: Assemblea;
  presenze: PresenzaConMillesimi[];
  condomini: number;
};

const CATEGORIE: { valore: CategoriaAllegato; etichetta: string }[] = [
  { valore: 'convocazione', etichetta: 'Convocazione' },
  { valore: 'verbale', etichetta: 'Verbale' },
  { valore: 'altro', etichetta: 'Altro' },
];

function MiaRisposta({ assemblea, mia, onSalvata }: { assemblea: Assemblea; mia: Presenza | undefined; onSalvata: () => void }) {
  const { profilo } = useAuth();
  const tema = useTheme();
  const tinte = useTinte();
  const [scelta, setScelta] = useState<RispostaPresenza | null>(mia?.risposta ?? null);
  const [delegato, setDelegato] = useState(mia?.delegato ?? '');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');
  const modificata = scelta !== (mia?.risposta ?? null) || (scelta === 'delega' && delegato.trim() !== (mia?.delegato ?? ''));

  async function salva() {
    if (!scelta) return;
    setErrore('');
    if (scelta === 'delega' && !delegato.trim()) {
      setErrore('Scrivi il nome della persona che delegheresti.');
      return;
    }
    setInCorso(true);
    const { error } = await supabase.from('presenze').upsert({
      assemblea_id: assemblea.id,
      utente_id: profilo!.id,
      risposta: scelta,
      delegato: scelta === 'delega' ? delegato.trim() : null,
    });
    setInCorso(false);
    if (error) setErrore(`Errore: ${error.message}`);
    else onSalvata();
  }

  return (
    <>
      <Titoletto>La tua presenza</Titoletto>
      {RISPOSTE.map((r) => {
        const attiva = scelta === r.valore;
        const tinta = tinte[r.tinta];
        return (
          <Pressable
            key={r.valore}
            onPress={() => setScelta(r.valore)}
            style={[
              styles.opzione,
              {
                borderColor: attiva ? tinta.testo : tema.colors.outlineVariant,
                backgroundColor: attiva ? tinta.sfondo : tema.colors.surface,
              },
            ]}
          >
            <Icon source={r.icona} size={22} color={attiva ? tinta.testo : tema.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={[styles.flex, attiva && { color: tinta.testo }]}>
              {r.etichetta}
            </Text>
            {attiva && <Icon source="check" size={20} color={tinta.testo} />}
          </Pressable>
        );
      })}
      {scelta === 'delega' && (
        <TextInput
          label="A chi deleghi? (nome e cognome)"
          mode="outlined"
          value={delegato}
          onChangeText={setDelegato}
          left={<TextInput.Icon icon="account-outline" />}
        />
      )}
      <Errore testo={errore} />
      {modificata && (
        <Button mode="contained" icon="check" onPress={salva} loading={inCorso} disabled={inCorso || !scelta}>
          {mia ? 'Aggiorna risposta' : 'Invia risposta'}
        </Button>
      )}
    </>
  );
}

function Risposte({ presenze, condomini }: { presenze: PresenzaConMillesimi[]; condomini: number }) {
  const tinte = useTinte();
  const conta = (r: RispostaPresenza) => presenze.filter((p) => p.risposta === r).length;
  const millesimiRappresentati = presenze
    .filter((p) => p.risposta !== 'assente')
    .reduce((t, p) => t + Number(p.profilo?.millesimi ?? 0), 0);

  return (
    <>
      <Titoletto>Risposte</Titoletto>
      <Riquadro>
        <View style={styles.etichette}>
          <Etichetta testo={`${conta('presente')} presenti`} tinta={tinte.verde} icona="check-circle-outline" />
          <Etichetta testo={`${conta('delega')} deleghe`} tinta={tinte.blu} icona="account-arrow-right-outline" />
          <Etichetta testo={`${conta('assente')} assenti`} tinta={tinte.grigio} icona="close-circle-outline" />
        </View>
        <Nota>
          Hanno risposto {presenze.length} su {condomini} · millesimi rappresentati (presenti + deleghe):{' '}
          {millesimi(millesimiRappresentati)} / 1000
        </Nota>
        {presenze.map((p) => {
          const r = RISPOSTE.find((x) => x.valore === p.risposta)!;
          return (
            <View key={p.utente_id} style={styles.rigaPersona}>
              <Icon source={r.icona} size={18} color={tinte[r.tinta].testo} />
              <Text variant="bodyMedium" style={styles.flex}>
                {p.profilo?.nome ?? '—'}
                {p.profilo?.appartamento ? ` (app. ${p.profilo.appartamento})` : ''}
              </Text>
              <Nota>{p.risposta === 'delega' ? `delega a ${p.delegato}` : r.etichetta}</Nota>
            </View>
          );
        })}
      </Riquadro>
    </>
  );
}

function CaricaDocumenti({ assemblea, onCaricati }: { assemblea: Assemblea; onCaricati: () => void }) {
  const passata = new Date(assemblea.data_ora) < new Date();
  const [categoria, setCategoria] = useState<CategoriaAllegato>(passata ? 'verbale' : 'convocazione');
  const [file, setFile] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function carica() {
    setErrore('');
    setInCorso(true);
    try {
      for (const f of file) {
        const percorso = await caricaFile('assemblee', assemblea.id, f);
        const { error } = await supabase
          .from('assemblee_allegati')
          .insert({ assemblea_id: assemblea.id, categoria, percorso, nome_file: f.nome, tipo_mime: f.tipo });
        if (error) throw new Error(error.message);
      }
      setFile([]);
      onCaricati();
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Riquadro>
      <Text variant="titleSmall">Aggiungi documenti</Text>
      <SegmentedButtons
        value={categoria}
        onValueChange={(v) => setCategoria(v as CategoriaAllegato)}
        buttons={CATEGORIE.map((c) => ({ value: c.valore, label: c.etichetta }))}
      />
      <SceltaFile file={file} onCambia={setFile} tipi={TIPI_ASSEMBLEA} etichetta="Scegli file (PDF, email .eml/.msg, Word, foto)" />
      {file.length > 0 && (
        <Button mode="contained" onPress={carica} loading={inCorso} disabled={inCorso}>
          Carica {file.length} file
        </Button>
      )}
      <Errore testo={errore} />
    </Riquadro>
  );
}

export default function DettaglioAssemblea() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profilo } = useAuth();
  const tema = useTheme();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';
  const [modificaDocumenti, setModificaDocumenti] = useState(false);

  const leggi = useCallback(async () => {
    const [a, p, c] = await Promise.all([
      supabase.from('assemblee').select('*, assemblee_allegati(*)').eq('id', id).maybeSingle<Assemblea>(),
      supabase.from('presenze').select('*, profilo:profili(nome, appartamento, millesimi)').eq('assemblea_id', id),
      supabase.from('profili').select('id', { count: 'exact', head: true }).eq('approvato', true),
    ]);
    const error = a.error ?? p.error;
    if (error) return { data: null, error };
    if (!a.data) return { data: null, error: { message: 'Assemblea non trovata (forse è stata eliminata).' } };
    const dati: Dati = {
      assemblea: a.data,
      presenze: (p.data ?? []) as PresenzaConMillesimi[],
      condomini: c.count ?? 0,
    };
    return { data: dati, error: null };
  }, [id]);
  const { dati, errore, ricarica } = useDati(leggi);

  if (errore)
    return (
      <Pagina titolo="Assemblea">
        <Errore testo={errore} />
      </Pagina>
    );
  if (!dati)
    return (
      <Pagina titolo="Assemblea">
        <ActivityIndicator style={styles.caricamento} />
      </Pagina>
    );

  const { assemblea: a, presenze, condomini } = dati;
  const passata = new Date(a.data_ora) < new Date();
  const mia = presenze.find((p) => p.utente_id === profilo?.id);
  const punti = (a.ordine_del_giorno ?? '')
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);
  const perCategoria = (c: CategoriaAllegato) =>
    a.assemblee_allegati
      .filter((f) => f.categoria === c)
      .map((f: AllegatoAssemblea) => ({ percorso: f.percorso, nome: f.nome_file, tipo: f.tipo_mime }));

  async function eliminaAllegato(f: AllegatoAssemblea) {
    await eliminaFile('assemblee', [f.percorso]);
    await supabase.from('assemblee_allegati').delete().eq('id', f.id);
    await ricarica();
  }

  async function elimina() {
    await eliminaFile('assemblee', a.assemblee_allegati.map((f) => f.percorso));
    await supabase.from('assemblee').delete().eq('id', a.id);
    router.back();
  }

  return (
    <Pagina titolo={a.titolo}>
      {/* Quando e dove */}
      <Riquadro>
        <View style={styles.riga}>
          <DataCalendario iso={a.data_ora} passata={passata} />
          <View style={styles.flex}>
            <Text variant="titleMedium" style={styles.maiuscolaIniziale}>
              {dataLunga(a.data_ora)}
            </Text>
            <Text variant="bodyLarge">ore {ora(a.data_ora)}</Text>
            <View style={styles.etichette}>
              <Etichetta
                testo={passata ? 'Conclusa' : traQuanto(a.data_ora)}
                tinta={passata ? tinte.grigio : tinte.blu}
                icona={passata ? 'check' : 'clock-outline'}
              />
            </View>
          </View>
        </View>
        {!!a.luogo && (
          <View style={styles.rigaIcona}>
            <Icon source="map-marker-outline" size={20} color={tema.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={styles.flex}>
              {a.luogo}
            </Text>
          </View>
        )}
        {!!a.link_online && (
          <Pressable style={styles.rigaIcona} onPress={() => Linking.openURL(a.link_online!)}>
            <Icon source="video-outline" size={20} color={tema.colors.primary} />
            <Text variant="bodyLarge" style={[styles.flex, { color: tema.colors.primary }]} numberOfLines={1}>
              Collegati online
            </Text>
          </Pressable>
        )}
        {!passata && (
          <View style={styles.azioniCalendario}>
            <Button mode="contained-tonal" icon="calendar-plus" onPress={() => scaricaIcs(a)} compact>
              Aggiungi al calendario
            </Button>
            <Button mode="text" icon="google" onPress={() => apriGoogleCalendar(a)} compact>
              Google Calendar
            </Button>
          </View>
        )}
      </Riquadro>

      {/* Ordine del giorno */}
      {punti.length > 0 && (
        <>
          <Titoletto>Ordine del giorno</Titoletto>
          <Riquadro>
            {punti.map((p, i) => (
              <View key={i} style={styles.punto}>
                <View style={[styles.numero, { backgroundColor: tema.colors.primaryContainer }]}>
                  <Text variant="labelLarge" style={{ color: tema.colors.onPrimaryContainer }}>
                    {i + 1}
                  </Text>
                </View>
                <Text variant="bodyLarge" style={styles.flex}>
                  {p}
                </Text>
              </View>
            ))}
          </Riquadro>
        </>
      )}

      {/* Presenza */}
      {!passata && <MiaRisposta key={mia?.risposta ?? 'nessuna'} assemblea={a} mia={mia} onSalvata={ricarica} />}

      {/* Testo della convocazione */}
      {!!a.testo && (
        <>
          <Titoletto>Convocazione</Titoletto>
          <Riquadro>
            <Text variant="bodyLarge" style={styles.testo} selectable>
              {a.testo}
            </Text>
          </Riquadro>
        </>
      )}

      {/* Documenti */}
      {(a.assemblee_allegati.length > 0 || admin) && (
        <View style={styles.titoloDocumenti}>
          <Titoletto>Documenti</Titoletto>
          {admin && a.assemblee_allegati.length > 0 && (
            <IconButton
              icon={modificaDocumenti ? 'check' : 'pencil-outline'}
              size={18}
              onPress={() => setModificaDocumenti(!modificaDocumenti)}
              accessibilityLabel="Modifica documenti"
            />
          )}
        </View>
      )}
      {CATEGORIE.map((c) => {
        const file = perCategoria(c.valore);
        if (!file.length) return null;
        return (
          <Riquadro key={c.valore}>
            <Text variant="titleSmall">{c.etichetta}</Text>
            {modificaDocumenti ? (
              a.assemblee_allegati
                .filter((f) => f.categoria === c.valore)
                .map((f) => (
                  <View key={f.id} style={styles.rigaIcona}>
                    <Text variant="bodyMedium" style={styles.flex} numberOfLines={1}>
                      {f.nome_file}
                    </Text>
                    <BottoneConferma etichetta="Elimina" conferma="Elimina" onConferma={() => eliminaAllegato(f)} />
                  </View>
                ))
            ) : (
              <Allegati bucket="assemblee" file={file} />
            )}
          </Riquadro>
        );
      })}
      {admin && <CaricaDocumenti assemblea={a} onCaricati={ricarica} />}

      {/* Risposte (solo amministratore) */}
      {admin && <Risposte presenze={presenze} condomini={condomini} />}

      {admin && (
        <>
          <Titoletto>Gestione amministratore</Titoletto>
          <Riquadro style={styles.azioni}>
            <BottoneConferma etichetta="Elimina assemblea" conferma="Elimina definitivamente" onConferma={elimina} />
          </Riquadro>
        </>
      )}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1 },
  maiuscolaIniziale: { textTransform: 'capitalize' },
  etichette: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  rigaIcona: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  azioniCalendario: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  punto: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  numero: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  opzione: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 16, padding: 16 },
  testo: { lineHeight: 24 },
  titoloDocumenti: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rigaPersona: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end' },
});
