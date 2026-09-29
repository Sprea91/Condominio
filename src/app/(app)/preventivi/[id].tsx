// Richiesta di preventivi: descrizione, tutti i preventivi ricevuti (dal più economico),
// stato di ognuno, aggiunta di nuovi preventivi, "Metti ai voti" e "Registra nello storico lavori".
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { BottoneConferma } from '@/components/BottoneConferma';
import { CampoDitta } from '@/components/CampoDitta';
import { CampoData } from '@/components/CampoData';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { Errore, Etichetta, Nota, Riquadro, Titoletto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apriFile, caricaFile, eliminaFile, TIPI_DOCUMENTO, type FileScelto } from '@/lib/file';
import { autore, data, euro, leggiData, leggiNumero } from '@/lib/formato';
import type { NomeTinta } from '@/lib/guasti';
import { usePermessi } from '@/lib/permessi';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { Preventivo, RichiestaPreventivi, StatoPreventivo } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

const STATI: { valore: StatoPreventivo; etichetta: string; tinta: NomeTinta; icona: string }[] = [
  { valore: 'in_valutazione', etichetta: 'In valutazione', tinta: 'blu', icona: 'timer-sand' },
  { valore: 'accettato', etichetta: 'Accettato', tinta: 'verde', icona: 'check-circle-outline' },
  { valore: 'scartato', etichetta: 'Scartato', tinta: 'grigio', icona: 'close-circle-outline' },
];

function NuovoPreventivo({ richiestaId, onSalvato, onAnnulla }: { richiestaId: string; onSalvato: () => void; onAnnulla: () => void }) {
  const [ditta, setDitta] = useState('');
  const [importo, setImporto] = useState('');
  const [giorno, setGiorno] = useState('');
  const [validoFino, setValidoFino] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [file, setFile] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    const valore = importo.trim() ? leggiNumero(importo) : null;
    if (!ditta.trim()) {
      setErrore('Scrivi il nome della ditta.');
      return;
    }
    if (importo.trim() && valore === null) {
      setErrore('Importo non valido (esempio: 12.500,00).');
      return;
    }
    setInCorso(true);
    try {
      const f = file[0];
      const percorso = f ? await caricaFile('documenti', `offerte/${richiestaId}`, f) : null;
      const { error } = await supabase.from('preventivi').insert({
        richiesta_id: richiestaId,
        ditta: ditta.trim(),
        importo: valore,
        data_preventivo: giorno ? leggiData(giorno) : null,
        valido_fino: validoFino ? leggiData(validoFino) : null,
        descrizione: descrizione.trim() || null,
        file_path: percorso,
        file_nome: f?.nome ?? null,
      });
      if (error) throw new Error(error.message);
      onSalvato();
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Riquadro evidenziato>
      <Text variant="titleSmall">Nuovo preventivo</Text>
      <CampoDitta value={ditta} onChangeText={setDitta} />
      <TextInput
        label="Importo in € (facoltativo)"
        mode="outlined"
        value={importo}
        onChangeText={setImporto}
        keyboardType="decimal-pad"
        left={<TextInput.Icon icon="currency-eur" />}
      />
      <View style={styles.riga}>
        <CampoData style={styles.flex} label="Data" value={giorno} onChangeText={setGiorno} svuotabile />
        <CampoData style={styles.flex} label="Valido fino al" value={validoFino} onChangeText={setValidoFino} svuotabile />
      </View>
      <TextInput
        label="Breve descrizione (cosa comprende, tempi, garanzia...)"
        mode="outlined"
        value={descrizione}
        onChangeText={setDescrizione}
        multiline
        numberOfLines={3}
      />
      <SceltaFile file={file} onCambia={setFile} tipi={TIPI_DOCUMENTO} etichetta="Allega il preventivo (PDF)" multipli={false} />
      <Errore testo={errore} />
      <View style={styles.azioni}>
        <Button onPress={onAnnulla} disabled={inCorso}>
          Annulla
        </Button>
        <Button mode="contained" onPress={salva} loading={inCorso} disabled={inCorso}>
          Salva preventivo
        </Button>
      </View>
    </Riquadro>
  );
}

export default function DettaglioRichiesta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profilo } = useAuth();
  const tinte = useTinte();
  const { puo } = usePermessi();
  const admin = profilo?.ruolo === 'amministratore';
  const [nuovo, setNuovo] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [erroreAzione, setErroreAzione] = useState('');

  const leggi = useCallback(async () => {
    const { data: r, error } = await supabase
      .from('preventivi_richieste')
      .select('*, autore:profili(nome, appartamento), preventivi(*)')
      .eq('id', id)
      .maybeSingle<RichiestaPreventivi>();
    if (!error && !r) return { data: null, error: { message: 'Richiesta non trovata (forse è stata eliminata).' } };
    return { data: r, error };
  }, [id]);
  const { dati: r, errore, ricarica } = useDati(leggi);

  if (errore)
    return (
      <Pagina titolo="Preventivi">
        <Errore testo={errore} />
      </Pagina>
    );
  if (!r)
    return (
      <Pagina titolo="Preventivi">
        <ActivityIndicator style={styles.caricamento} />
      </Pagina>
    );

  const puoModificare = puo('preventivi');
  // Ordine: accettato, poi dal più economico (senza importo in fondo), scartati alla fine
  const peso = (p: Preventivo) => (p.stato === 'accettato' ? 0 : p.stato === 'scartato' ? 2 : 1);
  const ordinati = [...r.preventivi].sort(
    (a, b) => peso(a) - peso(b) || (a.importo ?? Number.MAX_VALUE) - (b.importo ?? Number.MAX_VALUE),
  );
  const validi = r.preventivi.filter((p) => p.stato !== 'scartato' && p.importo != null);
  const minimo = validi.length ? Math.min(...validi.map((p) => Number(p.importo))) : null;
  const accettato = r.preventivi.find((p) => p.stato === 'accettato');

  async function cambiaStato(p: Preventivo, stato: StatoPreventivo) {
    setErroreAzione('');
    const { error } = await supabase.from('preventivi').update({ stato }).eq('id', p.id);
    if (error) setErroreAzione(`Errore: ${error.message}`);
    else ricarica();
  }

  async function eliminaPreventivo(p: Preventivo) {
    if (p.file_path) await eliminaFile('documenti', [p.file_path]);
    await supabase.from('preventivi').delete().eq('id', p.id);
    ricarica();
  }

  async function chiudi(chiusa: boolean) {
    await supabase.from('preventivi_richieste').update({ chiusa }).eq('id', r!.id);
    ricarica();
  }

  async function eliminaRichiesta() {
    const file = r!.preventivi.map((p) => p.file_path).filter(Boolean) as string[];
    await eliminaFile('documenti', file);
    await supabase.from('preventivi_richieste').delete().eq('id', r!.id);
    router.back();
  }

  // Crea il sondaggio di confronto con i preventivi non scartati
  async function mettiAiVoti() {
    setErroreAzione('');
    const candidati = ordinati.filter((p) => p.stato !== 'scartato');
    if (candidati.length < 2) {
      setErroreAzione('Servono almeno 2 preventivi non scartati per metterli ai voti.');
      return;
    }
    setInCorso(true);
    try {
      const { data: s, error } = await supabase
        .from('sondaggi')
        .insert({
          domanda: `Quale preventivo scegliamo per “${r!.titolo}”?`,
          descrizione: r!.descrizione,
          modalita: 'millesimi',
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      const { error: e } = await supabase.from('sondaggi_opzioni').insert(
        candidati.map((p, ordine) => ({
          sondaggio_id: s.id,
          testo: p.ditta,
          ordine,
          ditta: p.ditta,
          importo: p.importo,
          preventivo_path: p.file_path,
          preventivo_nome: p.file_nome,
        })),
      );
      if (e) throw new Error(e.message);
      await supabase.from('preventivi_richieste').update({ sondaggio_id: s.id }).eq('id', r!.id);
      router.push(`/sondaggi/${s.id}`);
    } catch (err) {
      setErroreAzione(`Errore: ${(err as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  function registraNelloStorico() {
    if (!accettato) return;
    router.push({
      pathname: '/lavori/nuovo',
      params: {
        titolo: r!.titolo,
        ditta: accettato.ditta,
        importo: accettato.importo != null ? String(accettato.importo).replace('.', ',') : '',
        descrizione: [r!.descrizione, accettato.descrizione].filter(Boolean).join('\n\n'),
      },
    });
  }

  return (
    <Pagina titolo={r.titolo} sottotitolo={`Richiesta di ${autore(r.autore ?? null)} · ${data(r.creato_il)}`}>
      {(!!r.descrizione || r.chiusa || r.sondaggio_id) && (
        <Riquadro>
          <View style={styles.etichette}>
            {r.chiusa && <Etichetta testo="Chiusa" tinta={tinte.grigio} icona="archive-outline" />}
            {r.sondaggio_id && <Etichetta testo="Messa ai voti" tinta={tinte.viola} icona="vote-outline" />}
          </View>
          {!!r.descrizione && (
            <Text variant="bodyLarge" style={styles.testo}>
              {r.descrizione}
            </Text>
          )}
          {r.sondaggio_id && (
            <Button mode="contained-tonal" icon="vote-outline" onPress={() => router.push(`/sondaggi/${r.sondaggio_id}`)}>
              Vai al sondaggio
            </Button>
          )}
        </Riquadro>
      )}

      <Errore testo={erroreAzione} />

      <Titoletto>{`Preventivi (${r.preventivi.length})`}</Titoletto>
      {r.preventivi.length === 0 && !nuovo && <Nota>Ancora nessun preventivo. Aggiungilo con il pulsante qui sotto.</Nota>}
      {ordinati.map((p) => {
        const st = STATI.find((x) => x.valore === p.stato)!;
        const piuBasso = minimo !== null && p.importo != null && Number(p.importo) === minimo && p.stato !== 'scartato';
        const scaduto = p.valido_fino && p.valido_fino < new Date().toISOString().slice(0, 10);
        return (
          <Riquadro key={p.id} evidenziato={p.stato === 'accettato'} style={p.stato === 'scartato' && styles.scartato}>
            <View style={styles.riga}>
              <View style={styles.flex}>
                <Text variant="titleMedium">{p.ditta}</Text>
                <Nota>
                  {p.data_preventivo ? `Del ${data(`${p.data_preventivo}T12:00:00`)}` : ''}
                  {p.valido_fino ? `${p.data_preventivo ? ' · ' : ''}valido fino al ${data(`${p.valido_fino}T12:00:00`)}` : ''}
                </Nota>
              </View>
              <Text variant="titleLarge">{p.importo != null ? euro(p.importo) : '—'}</Text>
            </View>
            <View style={styles.etichette}>
              <Etichetta testo={st.etichetta} tinta={tinte[st.tinta]} icona={st.icona} />
              {piuBasso && validi.length > 1 && <Etichetta testo="Il più economico" tinta={tinte.verde} icona="tag-outline" />}
              {scaduto && <Etichetta testo="Scaduto" tinta={tinte.rosso} icona="alert-outline" />}
            </View>
            {!!p.descrizione && <Text variant="bodyMedium">{p.descrizione}</Text>}
            <View style={styles.azioni}>
              {p.file_path && (
                <Button compact icon="file-pdf-box" onPress={() => apriFile('documenti', p.file_path!)}>
                  Apri preventivo
                </Button>
              )}
              {(admin || p.autore_id === profilo?.id) && (
                <BottoneConferma etichetta="" conferma="Elimina" onConferma={() => eliminaPreventivo(p)} />
              )}
            </View>
            {puoModificare && !r.chiusa && (
              <SegmentedButtons
                value={p.stato}
                onValueChange={(v) => cambiaStato(p, v as StatoPreventivo)}
                buttons={STATI.map((s) => ({ value: s.valore, label: s.etichetta }))}
                density="small"
              />
            )}
          </Riquadro>
        );
      })}

      {nuovo && (
        <NuovoPreventivo
          richiestaId={r.id}
          onAnnulla={() => setNuovo(false)}
          onSalvato={() => {
            setNuovo(false);
            ricarica();
          }}
        />
      )}
      {puoModificare && !r.chiusa && !nuovo && (
        <Button mode="contained" icon="plus" onPress={() => setNuovo(true)}>
          Aggiungi un preventivo
        </Button>
      )}

      {/* Azioni sulla richiesta */}
      {(admin || puoModificare) && (
        <>
          <Titoletto>Cosa fare</Titoletto>
          <Riquadro style={styles.colonna}>
            {admin && !r.sondaggio_id && r.preventivi.filter((p) => p.stato !== 'scartato').length >= 2 && (
              <Button mode="contained-tonal" icon="vote-outline" onPress={mettiAiVoti} loading={inCorso} disabled={inCorso}>
                Metti ai voti (sondaggio per millesimi)
              </Button>
            )}
            {accettato && puo('lavori') && (
              <Button mode="contained-tonal" icon="hammer-wrench" onPress={registraNelloStorico}>
                Registra nello storico lavori
              </Button>
            )}
            {puoModificare && (
              <Button mode="outlined" icon={r.chiusa ? 'lock-open-outline' : 'archive-outline'} onPress={() => chiudi(!r.chiusa)}>
                {r.chiusa ? 'Riapri la richiesta' : 'Chiudi la richiesta'}
              </Button>
            )}
            {(admin || r.autore_id === profilo?.id) && (
              <BottoneConferma etichetta="Elimina richiesta" conferma="Elimina con tutti i preventivi" onConferma={eliminaRichiesta} />
            )}
          </Riquadro>
        </>
      )}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  colonna: { gap: 10 },
  etichette: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  testo: { lineHeight: 24 },
  scartato: { opacity: 0.6 },
});
