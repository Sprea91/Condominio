// Scadenze del condominio: revisioni, assicurazione, manutenzioni...
// Divise in scadute / entro 30 giorni / più avanti. Compaiono anche le garanzie dei lavori in scadenza.
// L'amministratore le aggiunge; "Fatto" sposta in avanti quelle che si ripetono ed elimina le altre.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Text, TextInput } from 'react-native-paper';

import { BottoneConferma } from '@/components/BottoneConferma';
import { DataCalendario } from '@/components/DataCalendario';
import { CampoData } from '@/components/CampoData';
import { Pagina } from '@/components/Pagina';
import { BottoneNuovo, Errore, Etichetta, Nota, Riquadro, Titoletto, Vuoto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { data, leggiData, traQuanto } from '@/lib/formato';
import { oggiIso } from '@/lib/rate';
import { usePermessi } from '@/lib/permessi';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { Ripetizione, Scadenza } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

const RIPETIZIONI: { valore: Ripetizione; etichetta: string; mesi: number }[] = [
  { valore: 'nessuna', etichetta: 'Una volta', mesi: 0 },
  { valore: 'mensile', etichetta: 'Ogni mese', mesi: 1 },
  { valore: 'trimestrale', etichetta: 'Ogni 3 mesi', mesi: 3 },
  { valore: 'semestrale', etichetta: 'Ogni 6 mesi', mesi: 6 },
  { valore: 'annuale', etichetta: 'Ogni anno', mesi: 12 },
  { valore: 'biennale', etichetta: 'Ogni 2 anni', mesi: 24 },
];

const CATEGORIE = ['Assicurazione', 'Estintori', 'Ascensore', 'Caldaia', 'Pulizie', 'Contratti', 'Tasse', 'Altro'];

// Sposta una data (aaaa-mm-gg) avanti di N mesi
function avanti(iso: string, mesi: number) {
  const [a, m, g] = iso.split('-').map(Number);
  const d = new Date(a!, m! - 1 + mesi, g!);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function aggiungiGiorni(iso: string, giorni: number) {
  const [a, m, g] = iso.split('-').map(Number);
  const d = new Date(a!, m! - 1, g! + giorni);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Voce = {
  id: string;
  titolo: string;
  data: string;
  categoria: string;
  note: string | null;
  ripetizione?: Ripetizione;
  garanzia?: string;
  autore_id?: string | null;
};

function NuovaScadenza({ onSalvata, onAnnulla }: { onSalvata: () => void; onAnnulla: () => void }) {
  const [titolo, setTitolo] = useState('');
  const [giorno, setGiorno] = useState('');
  const [categoria, setCategoria] = useState('Altro');
  const [ripetizione, setRipetizione] = useState<Ripetizione>('annuale');
  const [note, setNote] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    const dataDb = leggiData(giorno);
    if (!titolo.trim()) {
      setErrore('Scrivi cosa scade (es. Revisione estintori).');
      return;
    }
    if (!dataDb) {
      setErrore('Data non valida: usa gg/mm/aaaa.');
      return;
    }
    setInCorso(true);
    const { error } = await supabase
      .from('scadenze')
      .insert({ titolo: titolo.trim(), data: dataDb, categoria, ripetizione, note: note.trim() || null });
    setInCorso(false);
    if (error) setErrore(`Errore: ${error.message}`);
    else onSalvata();
  }

  return (
    <Riquadro evidenziato>
      <Text variant="titleSmall">Nuova scadenza</Text>
      <TextInput label="Cosa scade (es. Revisione estintori)" mode="outlined" value={titolo} onChangeText={setTitolo} />
      <CampoData label="Data" value={giorno} onChangeText={setGiorno} />
      <Nota>Categoria</Nota>
      <View style={styles.chip}>
        {CATEGORIE.map((c) => (
          <Chip key={c} selected={categoria === c} showSelectedCheck={false} mode={categoria === c ? 'flat' : 'outlined'} onPress={() => setCategoria(c)}>
            {c}
          </Chip>
        ))}
      </View>
      <Nota>Si ripete</Nota>
      <View style={styles.chip}>
        {RIPETIZIONI.map((r) => (
          <Chip
            key={r.valore}
            selected={ripetizione === r.valore}
            showSelectedCheck={false}
            mode={ripetizione === r.valore ? 'flat' : 'outlined'}
            onPress={() => setRipetizione(r.valore)}
          >
            {r.etichetta}
          </Chip>
        ))}
      </View>
      <TextInput label="Note (facoltative)" mode="outlined" value={note} onChangeText={setNote} />
      <Errore testo={errore} />
      <View style={styles.azioni}>
        <Button onPress={onAnnulla}>Annulla</Button>
        <Button mode="contained" onPress={salva} loading={inCorso} disabled={inCorso}>
          Salva
        </Button>
      </View>
    </Riquadro>
  );
}

export default function Scadenze() {
  const { profilo } = useAuth();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';
  const { puo } = usePermessi();
  const [nuova, setNuova] = useState(false);

  const leggi = useCallback(async () => {
    const [s, l] = await Promise.all([
      supabase.from('scadenze').select('*').order('data').returns<Scadenza[]>(),
      supabase.from('lavori').select('id, titolo, ditta, garanzia_fino').not('garanzia_fino', 'is', null),
    ]);
    if (s.error) return { data: null, error: s.error };
    const oggi = oggiIso();
    const limite = aggiungiGiorni(oggi, 90);
    // Garanzie dei lavori che scadono nei prossimi 90 giorni (se lo storico lavori esiste)
    const garanzie: Voce[] = l.error
      ? []
      : (l.data ?? [])
          .filter((x) => x.garanzia_fino >= oggi && x.garanzia_fino <= limite)
          .map((x) => ({
            id: `garanzia-${x.id}`,
            titolo: `Fine garanzia: ${x.titolo}`,
            data: x.garanzia_fino as string,
            categoria: 'Garanzia',
            note: x.ditta ? `Ditta: ${x.ditta}` : null,
            garanzia: x.id as string,
          }));
    const voci: Voce[] = [...(s.data ?? []), ...garanzie].sort((a, b) => a.data.localeCompare(b.data));
    return { data: voci, error: null };
  }, []);
  const { dati, errore, ricarica, aggiorna, aggiornamento } = useDati(leggi);

  const oggi = oggiIso();
  const tra30 = aggiungiGiorni(oggi, 30);
  const scadute = (dati ?? []).filter((v) => v.data < oggi);
  const vicine = (dati ?? []).filter((v) => v.data >= oggi && v.data <= tra30);
  const lontane = (dati ?? []).filter((v) => v.data > tra30);

  async function fatto(v: Voce) {
    const r = RIPETIZIONI.find((x) => x.valore === v.ripetizione);
    if (r && r.mesi > 0) {
      // Si ripete: la prossima scadenza parte dalla data prevista (non da oggi)
      let prossima = avanti(v.data, r.mesi);
      while (prossima < oggi) prossima = avanti(prossima, r.mesi);
      await supabase.from('scadenze').update({ data: prossima }).eq('id', v.id);
    } else {
      await supabase.from('scadenze').delete().eq('id', v.id);
    }
    await ricarica();
  }

  async function elimina(v: Voce) {
    await supabase.from('scadenze').delete().eq('id', v.id);
    await ricarica();
  }

  function Elemento({ v }: { v: Voce }) {
    const scaduta = v.data < oggi;
    const r = RIPETIZIONI.find((x) => x.valore === v.ripetizione);
    return (
      <Riquadro onPress={v.garanzia ? () => router.push(`/lavori/${v.garanzia}`) : undefined}>
        <View style={styles.riga}>
          <DataCalendario iso={`${v.data}T12:00:00`} passata={scaduta} />
          <View style={styles.flex}>
            <Text variant="titleSmall">{v.titolo}</Text>
            <Nota>
              {data(`${v.data}T12:00:00`)} · {traQuanto(`${v.data}T12:00:00`)}
            </Nota>
            <View style={styles.etichette}>
              <Etichetta testo={v.categoria} tinta={v.garanzia ? tinte.viola : tinte.blu} />
              {r && r.mesi > 0 && <Etichetta testo={r.etichetta} tinta={tinte.grigio} icona="repeat" />}
              {scaduta && <Etichetta testo="Scaduta" tinta={tinte.rosso} icona="alert-outline" />}
            </View>
            {!!v.note && <Nota>{v.note}</Nota>}
          </View>
        </View>
        {puo('scadenze') && !v.garanzia && (
          <View style={styles.azioni}>
            {(admin || v.autore_id === profilo?.id) && (
              <BottoneConferma etichetta="" conferma="Elimina" onConferma={() => elimina(v)} />
            )}
            <Button mode="contained-tonal" icon="check" compact onPress={() => fatto(v)}>
              {r && r.mesi > 0 ? 'Fatto, sposta alla prossima' : 'Fatto'}
            </Button>
          </View>
        )}
      </Riquadro>
    );
  }

  return (
    <Pagina
      titolo="Scadenze"
      sottotitolo="Revisioni, assicurazioni, manutenzioni"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={puo('scadenze') && !nuova && <BottoneNuovo etichetta="Nuova scadenza" onPress={() => setNuova(true)} />}
    >
      {nuova && (
        <NuovaScadenza
          onAnnulla={() => setNuova(false)}
          onSalvata={() => {
            setNuova(false);
            ricarica();
          }}
        />
      )}
      <Errore testo={errore} />
      {dati === null && !errore && <ActivityIndicator style={styles.caricamento} />}
      {dati?.length === 0 && !nuova && (
        <Vuoto icona="calendar-check-outline" titolo="Nessuna scadenza" testo="Inserisci revisioni, polizze e manutenzioni da ricordare." />
      )}

      {scadute.length > 0 && <Titoletto>Scadute</Titoletto>}
      {scadute.map((v) => (
        <Elemento key={v.id} v={v} />
      ))}
      {vicine.length > 0 && <Titoletto>Entro 30 giorni</Titoletto>}
      {vicine.map((v) => (
        <Elemento key={v.id} v={v} />
      ))}
      {lontane.length > 0 && <Titoletto>Più avanti</Titoletto>}
      {lontane.map((v) => (
        <Elemento key={v.id} v={v} />
      ))}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1, gap: 2 },
  etichette: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
});
