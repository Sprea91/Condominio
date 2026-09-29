// Dettaglio di un guasto: avanzamento, descrizione, foto e nota dell'amministratore.
// L'amministratore cambia lo stato e scrive la nota; chi l'ha segnalato può aggiungere foto.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Icon, IconButton, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import { Allegati } from '@/components/Allegati';
import { BottoneConferma } from '@/components/BottoneConferma';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { Errore, Nota, Riquadro, Titoletto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { caricaFile, eliminaFile, TIPI_IMMAGINE, type FileScelto } from '@/lib/file';
import { autore, dataOra } from '@/lib/formato';
import { STATI, stato } from '@/lib/guasti';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { Commento, Guasto, StatoGuasto } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

// Tre pallini collegati: Aperto -> In lavorazione -> Risolto
function Avanzamento({ attuale }: { attuale: StatoGuasto }) {
  const tema = useTheme();
  const tinte = useTinte();
  const indice = STATI.findIndex((s) => s.valore === attuale);
  const colore = tinte[STATI[indice]!.tinta].testo;

  return (
    <View style={styles.avanzamento}>
      {STATI.map((s, i) => {
        const fatto = i <= indice;
        return (
          <View key={s.valore} style={styles.passo}>
            <View style={styles.rigaPasso}>
              <View style={[styles.linea, { backgroundColor: i === 0 ? 'transparent' : fatto ? colore : tema.colors.outlineVariant }]} />
              <View
                style={[
                  styles.pallino,
                  { backgroundColor: fatto ? colore : tema.colors.surface, borderColor: fatto ? colore : tema.colors.outline },
                ]}
              >
                {fatto && <Icon source="check" size={14} color={tema.colors.surface} />}
              </View>
              <View
                style={[
                  styles.linea,
                  { backgroundColor: i === STATI.length - 1 ? 'transparent' : i < indice ? colore : tema.colors.outlineVariant },
                ]}
              />
            </View>
            <Text variant="labelMedium" style={[styles.centro, { color: fatto ? tema.colors.onSurface : tema.colors.onSurfaceVariant }]}>
              {s.etichetta}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function GestioneAdmin({ guasto, onSalvato }: { guasto: Guasto; onSalvato: () => void }) {
  const [nuovoStato, setNuovoStato] = useState<StatoGuasto>(guasto.stato);
  const [nota, setNota] = useState(guasto.nota_admin ?? '');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    setInCorso(true);
    const { error } = await supabase
      .from('guasti')
      .update({ stato: nuovoStato, nota_admin: nota.trim() || null })
      .eq('id', guasto.id);
    setInCorso(false);
    if (error) setErrore(`Errore: ${error.message}`);
    else onSalvato();
  }

  async function elimina() {
    await eliminaFile('guasti', guasto.guasti_foto.map((f) => f.percorso));
    await supabase.from('guasti').delete().eq('id', guasto.id);
    router.back();
  }

  return (
    <>
      <Titoletto>Gestione amministratore</Titoletto>
      <Riquadro>
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
        <Errore testo={errore} />
        <View style={styles.azioni}>
          <BottoneConferma etichetta="Elimina" conferma="Elimina guasto" onConferma={elimina} />
          <Button mode="contained" onPress={salva} loading={inCorso} disabled={inCorso}>
            Salva
          </Button>
        </View>
      </Riquadro>
    </>
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
    <View style={styles.aggiungi}>
      <SceltaFile file={foto} onCambia={setFoto} tipi={TIPI_IMMAGINE} etichetta="Aggiungi foto" />
      {foto.length > 0 && (
        <Button mode="contained" onPress={carica} loading={inCorso} disabled={inCorso}>
          Carica {foto.length} foto
        </Button>
      )}
      <Errore testo={errore} />
    </View>
  );
}

// Commenti dei condòmini (es. "anche da me l'acqua è fredda")
function Commenti({ guasto }: { guasto: Guasto }) {
  const { profilo } = useAuth();
  const tema = useTheme();
  const admin = profilo?.ruolo === 'amministratore';
  const [testo, setTesto] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  const leggi = useCallback(
    () =>
      supabase
        .from('guasti_commenti')
        .select('*, autore:profili(nome, appartamento)')
        .eq('guasto_id', guasto.id)
        .order('creato_il', { ascending: true })
        .returns<Commento[]>(),
    [guasto.id],
  );
  const { dati, errore: erroreLettura, ricarica } = useDati(leggi);

  async function invia() {
    if (!testo.trim()) return;
    setErrore('');
    setInCorso(true);
    const { error } = await supabase.from('guasti_commenti').insert({ guasto_id: guasto.id, testo: testo.trim() });
    setInCorso(false);
    if (error) {
      setErrore(`Errore: ${error.message}`);
      return;
    }
    setTesto('');
    ricarica();
  }

  async function elimina(c: Commento) {
    await supabase.from('guasti_commenti').delete().eq('id', c.id);
    ricarica();
  }

  // Tabella non ancora creata (supabase/06-...sql): la sezione non si mostra
  if (erroreLettura) return null;

  return (
    <>
      <Titoletto>Commenti{dati?.length ? ` (${dati.length})` : ''}</Titoletto>
      <Riquadro>
        {dati?.length === 0 && <Nota>Nessun commento. Hai lo stesso problema? Scrivilo qui.</Nota>}
        {dati?.map((c) => {
          const mio = c.autore_id === profilo?.id;
          return (
            <View key={c.id} style={styles.commento}>
              <Avatar.Text size={32} label={(c.autore?.nome ?? '?').slice(0, 1).toUpperCase()} />
              <View style={[styles.fumetto, { backgroundColor: mio ? tema.colors.primaryContainer : tema.colors.surfaceVariant }]}>
                <View style={styles.testaCommento}>
                  <Text variant="labelLarge" style={styles.flex}>
                    {autore(c.autore)}
                  </Text>
                  <Nota>{dataOra(c.creato_il)}</Nota>
                </View>
                <Text variant="bodyMedium">{c.testo}</Text>
                {(mio || admin) && (
                  <View style={styles.azioni}>
                    <BottoneConferma etichetta="" conferma="Elimina" onConferma={() => elimina(c)} />
                  </View>
                )}
              </View>
            </View>
          );
        })}
        <View style={styles.scrivi}>
          <TextInput
            style={styles.flex}
            mode="outlined"
            dense
            placeholder="Scrivi un commento..."
            value={testo}
            onChangeText={setTesto}
            multiline
          />
          <IconButton
            icon="send"
            mode="contained"
            containerColor={tema.colors.primary}
            iconColor={tema.colors.onPrimary}
            onPress={invia}
            disabled={inCorso || !testo.trim()}
            accessibilityLabel="Invia commento"
          />
        </View>
        <Errore testo={errore} />
      </Riquadro>
    </>
  );
}

export default function DettaglioGuasto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profilo } = useAuth();
  const tema = useTheme();
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

  if (errore)
    return (
      <Pagina titolo="Guasto">
        <Errore testo={errore} />
      </Pagina>
    );
  if (!g)
    return (
      <Pagina titolo="Guasto">
        <ActivityIndicator style={styles.caricamento} />
      </Pagina>
    );

  const s = stato(g.stato);
  const mio = g.autore_id === profilo?.id;

  return (
    <Pagina titolo={g.titolo} sottotitolo={`Segnalato da ${autore(g.autore)}`}>
      <Riquadro>
        <Avanzamento attuale={g.stato} />
      </Riquadro>

      {!!g.nota_admin && (
        <Riquadro style={{ backgroundColor: tema.colors.primaryContainer, borderColor: tema.colors.primaryContainer }}>
          <View style={styles.rigaNota}>
            <Icon source="message-text-outline" size={18} color={tema.colors.onPrimaryContainer} />
            <Text variant="titleSmall" style={{ color: tema.colors.onPrimaryContainer }}>
              Aggiornamento dell’amministratore
            </Text>
          </View>
          <Text variant="bodyLarge" style={{ color: tema.colors.onPrimaryContainer }}>
            {g.nota_admin}
          </Text>
        </Riquadro>
      )}

      <Riquadro>
        <Text variant="titleSmall">Descrizione</Text>
        <Text variant="bodyLarge" style={styles.testo}>
          {g.descrizione}
        </Text>
        <Nota>
          Aperto il {dataOra(g.creato_il)} · {s.etichetta.toLowerCase()} dal {dataOra(g.aggiornato_il)}
        </Nota>
      </Riquadro>

      {(g.guasti_foto.length > 0 || ((mio || admin) && g.stato !== 'chiuso')) && (
        <Riquadro>
          <Text variant="titleSmall">Foto</Text>
          <Allegati bucket="guasti" file={g.guasti_foto.map((f) => ({ percorso: f.percorso }))} />
          {(mio || admin) && g.stato !== 'chiuso' && <AggiungiFoto guasto={g} onAggiunte={ricarica} />}
        </Riquadro>
      )}

      <Commenti guasto={g} />

      {admin && <GestioneAdmin key={g.aggiornato_il} guasto={g} onSalvato={ricarica} />}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  avanzamento: { flexDirection: 'row' },
  passo: { flex: 1, alignItems: 'center', gap: 6 },
  rigaPasso: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  linea: { flex: 1, height: 3, borderRadius: 2 },
  pallino: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  centro: { textAlign: 'center' },
  rigaNota: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testo: { lineHeight: 24 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 4 },
  aggiungi: { gap: 8 },
  commento: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  fumetto: { flex: 1, borderRadius: 14, padding: 10, gap: 4 },
  testaCommento: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scrivi: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
});
