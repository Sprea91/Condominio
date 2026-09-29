// Dettaglio di un guasto: descrizione, foto e stato.
// L'amministratore cambia lo stato e scrive una nota; chi l'ha segnalato può aggiungere foto.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { Allegati } from '@/components/Allegati';
import { BottoneConferma } from '@/components/BottoneConferma';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { useAuth } from '@/lib/auth';
import { caricaFile, eliminaFile, TIPI_IMMAGINE, type FileScelto } from '@/lib/file';
import { autore, dataOra } from '@/lib/formato';
import { STATI, stato } from '@/lib/guasti';
import { supabase } from '@/lib/supabase';
import type { Guasto, StatoGuasto } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

function GestioneAdmin({ guasto, onSalvato }: { guasto: Guasto; onSalvato: () => void }) {
  const [nuovoStato, setNuovoStato] = useState<StatoGuasto>(guasto.stato);
  const [nota, setNota] = useState(guasto.nota_admin ?? '');
  const [inCorso, setInCorso] = useState(false);
  const [messaggio, setMessaggio] = useState('');

  async function salva() {
    setInCorso(true);
    const { error } = await supabase
      .from('guasti')
      .update({ stato: nuovoStato, nota_admin: nota.trim() || null })
      .eq('id', guasto.id);
    setInCorso(false);
    setMessaggio(error ? `Errore: ${error.message}` : 'Salvato.');
    if (!error) onSalvato();
  }

  async function elimina() {
    await eliminaFile('guasti', guasto.guasti_foto.map((f) => f.percorso));
    await supabase.from('guasti').delete().eq('id', guasto.id);
    router.back();
  }

  return (
    <Card mode="outlined">
      <Card.Title title="Gestione (amministratore)" />
      <Card.Content style={styles.contenuto}>
        <SegmentedButtons
          value={nuovoStato}
          onValueChange={(v) => setNuovoStato(v as StatoGuasto)}
          buttons={STATI.map((s) => ({ value: s.valore, label: s.etichetta }))}
        />
        <TextInput
          label="Nota per i condòmini (es. tecnico chiamato per giovedì)"
          mode="outlined"
          value={nota}
          onChangeText={setNota}
          multiline
        />
        {!!messaggio && <Text variant="bodySmall">{messaggio}</Text>}
      </Card.Content>
      <Card.Actions>
        <BottoneConferma etichetta="Elimina" conferma="Elimina guasto" onConferma={elimina} />
        <Button mode="contained" onPress={salva} loading={inCorso} disabled={inCorso}>
          Salva
        </Button>
      </Card.Actions>
    </Card>
  );
}

function AggiungiFoto({ guasto, onAggiunte }: { guasto: Guasto; onAggiunte: () => void }) {
  const { session } = useAuth();
  const [foto, setFoto] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function carica() {
    setErrore('');
    setInCorso(true);
    try {
      for (const f of foto) {
        const percorso = await caricaFile('guasti', `${session!.user.id}/${guasto.id}`, f);
        const { error } = await supabase.from('guasti_foto').insert({ guasto_id: guasto.id, percorso });
        if (error) throw new Error(error.message);
      }
      setFoto([]);
      onAggiunte();
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <View style={styles.contenuto}>
      <SceltaFile file={foto} onCambia={setFoto} tipi={TIPI_IMMAGINE} etichetta="Aggiungi foto" />
      {foto.length > 0 && (
        <Button mode="contained" onPress={carica} loading={inCorso} disabled={inCorso}>
          Carica {foto.length} foto
        </Button>
      )}
      <HelperText type="error" visible={!!errore}>
        {errore}
      </HelperText>
    </View>
  );
}

export default function DettaglioGuasto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profilo } = useAuth();
  const admin = profilo?.ruolo === 'amministratore';

  const leggi = useCallback(async () => {
    const { data, error } = await supabase
      .from('guasti')
      .select('*, autore:profili(nome, appartamento), guasti_foto(id, percorso)')
      .eq('id', id)
      .maybeSingle<Guasto>();
    if (!error && !data) return { data: null, error: { message: 'Guasto non trovato (forse è stato eliminato).' } };
    return { data, error };
  }, [id]);
  const { dati: g, errore, ricarica } = useDati(leggi);

  if (errore) return <Pagina titolo="Guasto"><Text>{errore}</Text></Pagina>;
  if (!g) return <Pagina titolo="Guasto"><ActivityIndicator /></Pagina>;

  const s = stato(g.stato);
  const mio = g.autore_id === profilo?.id;

  return (
    <Pagina titolo="Guasto">
      <Card mode="elevated">
        <Card.Title title={g.titolo} subtitle={`Segnalato da ${autore(g.autore)}`} titleNumberOfLines={3} />
        <Card.Content style={styles.contenuto}>
          <Chip style={[styles.stato, { backgroundColor: s.colore }]} textStyle={styles.testoStato}>
            {s.etichetta}
          </Chip>
          <Text variant="bodyMedium">{g.descrizione}</Text>
          <Text variant="bodySmall">
            Aperto il {dataOra(g.creato_il)} · aggiornato il {dataOra(g.aggiornato_il)}
          </Text>
          {!!g.nota_admin && (
            <Card mode="contained">
              <Card.Content>
                <Text variant="labelLarge">Nota dell’amministratore</Text>
                <Text variant="bodyMedium">{g.nota_admin}</Text>
              </Card.Content>
            </Card>
          )}
          <Allegati bucket="guasti" file={g.guasti_foto.map((f) => ({ percorso: f.percorso }))} />
          {(mio || admin) && g.stato !== 'chiuso' && <AggiungiFoto guasto={g} onAggiunte={ricarica} />}
        </Card.Content>
      </Card>

      {admin && <GestioneAdmin key={g.aggiornato_il} guasto={g} onSalvato={ricarica} />}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  contenuto: { gap: 12 },
  stato: { alignSelf: 'flex-start' },
  testoStato: { color: '#fff' },
});
