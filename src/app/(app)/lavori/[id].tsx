// Dettaglio di un lavoro: dati, garanzia, documenti divisi per tipo.
// L'amministratore aggiunge documenti (fatture, garanzie, foto) ed elimina.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { Allegati } from '@/components/Allegati';
import { BottoneConferma } from '@/components/BottoneConferma';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { Errore, Etichetta, Nota, Riquadro, Titoletto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { caricaFile, eliminaFile, TIPI_DOCUMENTO, type FileScelto } from '@/lib/file';
import { data, euro } from '@/lib/formato';
import { CATEGORIE_ALLEGATO, STATI_LAVORO, statoGaranzia, statoLavoro } from '@/lib/lavori';
import { usePermessi } from '@/lib/permessi';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { CategoriaAllegatoLavoro, Lavoro, StatoLavoro } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

function Dato({ icona, etichetta, valore }: { icona: string; etichetta: string; valore: string }) {
  const tema = useTheme();
  return (
    <View style={styles.dato}>
      <Icon source={icona} size={20} color={tema.colors.onSurfaceVariant} />
      <View style={styles.flex}>
        <Nota>{etichetta}</Nota>
        <Text variant="bodyLarge">{valore}</Text>
      </View>
    </View>
  );
}

function AggiungiDocumenti({ lavoro, onCaricati }: { lavoro: Lavoro; onCaricati: () => void }) {
  const [categoria, setCategoria] = useState<CategoriaAllegatoLavoro>('fattura');
  const [file, setFile] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function carica() {
    setErrore('');
    setInCorso(true);
    try {
      for (const f of file) {
        const percorso = await caricaFile('documenti', `lavori/${lavoro.id}`, f);
        const { error } = await supabase
          .from('lavori_allegati')
          .insert({ lavoro_id: lavoro.id, categoria, percorso, nome_file: f.nome, tipo_mime: f.tipo });
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
        onValueChange={(v) => setCategoria(v as CategoriaAllegatoLavoro)}
        buttons={CATEGORIE_ALLEGATO.map((c) => ({ value: c.valore, label: c.etichetta }))}
      />
      <SceltaFile file={file} onCambia={setFile} tipi={TIPI_DOCUMENTO} etichetta="Scegli file" />
      {file.length > 0 && (
        <Button mode="contained" onPress={carica} loading={inCorso} disabled={inCorso}>
          Carica {file.length} file
        </Button>
      )}
      <Errore testo={errore} />
    </Riquadro>
  );
}

export default function DettaglioLavoro() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profilo } = useAuth();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';
  const { puo } = usePermessi();
  const [erroreStato, setErroreStato] = useState('');

  const leggi = useCallback(async () => {
    const { data: l, error } = await supabase.from('lavori').select('*, lavori_allegati(*)').eq('id', id).maybeSingle<Lavoro>();
    if (!error && !l) return { data: null, error: { message: 'Lavoro non trovato (forse è stato eliminato).' } };
    return { data: l, error };
  }, [id]);
  const { dati: l, errore, ricarica } = useDati(leggi);

  if (errore)
    return (
      <Pagina titolo="Lavoro">
        <Errore testo={errore} />
      </Pagina>
    );
  if (!l)
    return (
      <Pagina titolo="Lavoro">
        <ActivityIndicator style={styles.caricamento} />
      </Pagina>
    );

  const g = statoGaranzia(l);
  const st = statoLavoro(l.stato);
  const mio = l.autore_id === profilo?.id;

  async function cambiaStato(nuovo: StatoLavoro) {
    setErroreStato('');
    const { error } = await supabase.from('lavori').update({ stato: nuovo }).eq('id', l!.id);
    if (error) setErroreStato(`Errore: ${error.message}`);
    else await ricarica();
  }

  async function eliminaAllegato(percorso: string, allegatoId: string) {
    await eliminaFile('documenti', [percorso]);
    await supabase.from('lavori_allegati').delete().eq('id', allegatoId);
    await ricarica();
  }

  async function elimina() {
    await eliminaFile('documenti', l!.lavori_allegati.map((f) => f.percorso));
    await supabase.from('lavori').delete().eq('id', l!.id);
    router.back();
  }

  return (
    <Pagina titolo={l.titolo}>
      <Riquadro>
        {puo('lavori') ? (
          <SegmentedButtons
            value={st.valore}
            onValueChange={(v) => cambiaStato(v as StatoLavoro)}
            buttons={STATI_LAVORO.map((s) => ({ value: s.valore, label: s.etichetta, icon: s.icona }))}
          />
        ) : (
          <View style={styles.etichette}>
            <Etichetta testo={st.etichetta} tinta={tinte[st.tinta]} icona={st.icona} />
          </View>
        )}
        <Errore testo={erroreStato} />
        <Dato icona="calendar" etichetta="Data" valore={data(l.data_lavoro)} />
        {!!l.ditta && <Dato icona="domain" etichetta="Ditta" valore={l.ditta} />}
        {l.importo != null && <Dato icona="currency-eur" etichetta="Costo" valore={euro(l.importo)} />}
        {g && (
          <View style={styles.etichette}>
            <Etichetta
              testo={
                g.valida
                  ? `In garanzia fino al ${data(l.garanzia_fino!)}${g.inScadenza ? ' (in scadenza)' : ''}`
                  : `Garanzia scaduta il ${data(l.garanzia_fino!)}`
              }
              tinta={g.valida ? (g.inScadenza ? tinte.arancio : tinte.verde) : tinte.grigio}
              icona="shield-check-outline"
            />
          </View>
        )}
        {!!l.descrizione && (
          <Text variant="bodyLarge" style={styles.testo}>
            {l.descrizione}
          </Text>
        )}
      </Riquadro>

      {l.lavori_allegati.length > 0 && <Titoletto>Documenti</Titoletto>}
      {CATEGORIE_ALLEGATO.map((c) => {
        const file = l.lavori_allegati.filter((f) => f.categoria === c.valore);
        if (!file.length) return null;
        return (
          <Riquadro key={c.valore}>
            <Text variant="titleSmall">{c.etichetta}</Text>
            <Allegati bucket="documenti" file={file.map((f) => ({ percorso: f.percorso, nome: f.nome_file, tipo: f.tipo_mime }))} />
            {(admin || puo('lavori')) &&
              file
                .filter((f) => admin || f.autore_id === profilo?.id)
                .map((f) => (
                <View key={f.id} style={styles.dato}>
                  <Nota style={styles.flex}>{f.nome_file}</Nota>
                  <BottoneConferma etichetta="" conferma="Elimina" onConferma={() => eliminaAllegato(f.percorso, f.id)} />
                </View>
              ))}
          </Riquadro>
        );
      })}

      {puo('lavori') && <AggiungiDocumenti lavoro={l} onCaricati={ricarica} />}
      {(admin || mio) && (
        <Riquadro style={styles.azioni}>
          <BottoneConferma etichetta="Elimina lavoro" conferma="Elimina definitivamente" onConferma={elimina} />
        </Riquadro>
      )}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  etichette: { flexDirection: 'row', flexWrap: 'wrap' },
  testo: { lineHeight: 24 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end' },
});
