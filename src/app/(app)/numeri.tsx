// Numeri utili: idraulico, elettricista, ascensore, emergenze...
// Un tocco sul numero avvia la chiamata. L'amministratore li aggiunge ed elimina.
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, IconButton, Text, TextInput } from 'react-native-paper';

import { BottoneConferma } from '@/components/BottoneConferma';
import { CampoRicerca, corrisponde } from '@/components/CampoRicerca';
import { CampoDitta } from '@/components/CampoDitta';
import { Pagina } from '@/components/Pagina';
import { BottoneNuovo, Errore, IconaTonda, Nota, Riquadro, Titoletto, Vuoto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { usePermessi } from '@/lib/permessi';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { NumeroUtile } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

const CATEGORIE: { nome: string; icona: string }[] = [
  { nome: 'Emergenze', icona: 'alarm-light-outline' },
  { nome: 'Idraulico', icona: 'water-pump' },
  { nome: 'Elettricista', icona: 'flash-outline' },
  { nome: 'Ascensore', icona: 'elevator-passenger-outline' },
  { nome: 'Caldaia', icona: 'fire' },
  { nome: 'Pulizie', icona: 'broom' },
  { nome: 'Giardiniere', icona: 'flower-outline' },
  { nome: 'Amministrazione', icona: 'briefcase-outline' },
  { nome: 'Altro', icona: 'phone-outline' },
];

const iconaCategoria = (c: string) => CATEGORIE.find((x) => x.nome === c)?.icona ?? 'phone-outline';

// Modulo per un numero nuovo o, con "iniziale", per modificarne uno esistente
function NuovoNumero({
  iniziale,
  onSalvato,
  onAnnulla,
}: {
  iniziale?: NumeroUtile;
  onSalvato: () => void;
  onAnnulla: () => void;
}) {
  const [nome, setNome] = useState(iniziale?.nome ?? '');
  const [categoria, setCategoria] = useState(iniziale?.categoria ?? 'Idraulico');
  const [telefono, setTelefono] = useState(iniziale?.telefono ?? '');
  const [email, setEmail] = useState(iniziale?.email ?? '');
  const [note, setNote] = useState(iniziale?.note ?? '');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    if (!nome.trim() || (!telefono.trim() && !email.trim())) {
      setErrore('Inserisci il nome e almeno un telefono o un’email.');
      return;
    }
    setInCorso(true);
    const campi = {
      nome: nome.trim(),
      categoria,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      note: note.trim() || null,
    };
    const { error } = iniziale
      ? await supabase.from('numeri_utili').update(campi).eq('id', iniziale.id)
      : await supabase.from('numeri_utili').insert(campi);
    setInCorso(false);
    if (error) setErrore(`Errore: ${error.message}`);
    else onSalvato();
  }

  return (
    <Riquadro evidenziato>
      <Text variant="titleSmall">{iniziale ? 'Modifica numero' : 'Nuovo numero'}</Text>
      <View style={styles.chip}>
        {CATEGORIE.map((c) => (
          <Chip
            key={c.nome}
            icon={c.icona}
            selected={categoria === c.nome}
            showSelectedCheck={false}
            mode={categoria === c.nome ? 'flat' : 'outlined'}
            onPress={() => setCategoria(c.nome)}
          >
            {c.nome}
          </Chip>
        ))}
      </View>
      <CampoDitta label="Nome (es. Idraulica Bianchi)" value={nome} onChangeText={setNome} />
      <TextInput label="Telefono" mode="outlined" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
      <TextInput
        label="Email (facoltativa)"
        mode="outlined"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput label="Note (es. reperibile anche il sabato)" mode="outlined" value={note} onChangeText={setNote} />
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

export default function Numeri() {
  const { profilo } = useAuth();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';
  const { puo } = usePermessi();
  const [nuovo, setNuovo] = useState(false);
  const [inModifica, setInModifica] = useState<string | null>(null);
  const [cerca, setCerca] = useState('');

  const leggi = useCallback(() => supabase.from('numeri_utili').select('*').order('nome').returns<NumeroUtile[]>(), []);
  const { dati, errore, ricarica, aggiorna, aggiornamento } = useDati(leggi);

  // Raggruppati per categoria, nell'ordine dell'elenco CATEGORIE (Emergenze per prime)
  const trovati = (dati ?? []).filter((n) => corrisponde(cerca, n.nome, n.categoria, n.telefono, n.email, n.note));
  const gruppi = CATEGORIE.map((c) => ({ ...c, numeri: trovati.filter((n) => n.categoria === c.nome) })).filter(
    (g) => g.numeri.length,
  );
  const altre = trovati.filter((n) => !CATEGORIE.some((c) => c.nome === n.categoria));

  async function elimina(n: NumeroUtile) {
    await supabase.from('numeri_utili').delete().eq('id', n.id);
    await ricarica();
  }

  function Numero({ n }: { n: NumeroUtile }) {
    if (inModifica === n.id) {
      return (
        <NuovoNumero
          iniziale={n}
          onAnnulla={() => setInModifica(null)}
          onSalvato={() => {
            setInModifica(null);
            ricarica();
          }}
        />
      );
    }
    return (
      <Riquadro>
        {/* Riga 1: icona, nome, telefono e note (tutto lo spazio al testo) */}
        <View style={styles.riga}>
          <IconaTonda icona={iconaCategoria(n.categoria)} tinta={n.categoria === 'Emergenze' ? tinte.rosso : tinte.blu} dimensione={40} />
          <View style={styles.flex}>
            <Text variant="titleMedium">{n.nome}</Text>
            {!!n.telefono && <Text variant="bodyMedium">{n.telefono}</Text>}
            {!!n.email && <Nota>{n.email}</Nota>}
            {!!n.note && <Nota>{n.note}</Nota>}
          </View>
        </View>
        {/* Riga 2: pulsanti */}
        <View style={styles.pulsanti}>
          {(admin || n.autore_id === profilo?.id) && <BottoneConferma etichetta="" conferma="Elimina" onConferma={() => elimina(n)} />}
          {puo('numeri') && (
            <IconButton icon="pencil-outline" onPress={() => setInModifica(n.id)} accessibilityLabel={`Modifica ${n.nome}`} />
          )}
          {!!n.email && (
            <Button compact mode="contained-tonal" icon="email-outline" onPress={() => Linking.openURL(`mailto:${n.email}`)}>
              Scrivi
            </Button>
          )}
          {!!n.telefono && (
            <Button
              compact
              mode="contained"
              icon="phone"
              onPress={() => Linking.openURL(`tel:${n.telefono!.replace(/\s/g, '')}`)}
              accessibilityLabel={`Chiama ${n.nome}`}
            >
              Chiama
            </Button>
          )}
        </View>
      </Riquadro>
    );
  }

  return (
    <Pagina
      titolo="Numeri utili"
      sottotitolo="Tocca il telefono per chiamare"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={puo('numeri') && !nuovo && <BottoneNuovo etichetta="Aggiungi numero" onPress={() => setNuovo(true)} />}
    >
      {nuovo && (
        <NuovoNumero
          onAnnulla={() => setNuovo(false)}
          onSalvato={() => {
            setNuovo(false);
            ricarica();
          }}
        />
      )}
      <CampoRicerca valore={cerca} onCambia={setCerca} segnaposto="Cerca (es. idraulico, ascensore)" />
      <Errore testo={errore} />
      {dati === null && !errore && <ActivityIndicator style={styles.caricamento} />}
      {dati?.length === 0 && !nuovo && (
        <Vuoto icona="phone-outline" titolo="Nessun numero" testo="Aggiungi idraulico, elettricista, emergenze..." />
      )}
      {gruppi.map((g) => (
        <View key={g.nome} style={styles.gruppo}>
          <Titoletto>{g.nome}</Titoletto>
          {g.numeri.map((n) => (
            <Numero key={n.id} n={n} />
          ))}
        </View>
      ))}
      {altre.map((n) => (
        <Numero key={n.id} n={n} />
      ))}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pulsanti: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  flex: { flex: 1, gap: 2 },
  gruppo: { gap: 12 },
});
