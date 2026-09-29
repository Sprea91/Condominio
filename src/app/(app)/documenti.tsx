// Archivio documenti del condominio, diviso in cartelle (regolamento, assicurazione, contratti...).
// Tutti li consultano; l'amministratore li carica ed elimina.
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Icon, Text, TextInput, useTheme } from 'react-native-paper';

import { BottoneConferma } from '@/components/BottoneConferma';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { BottoneNuovo, Errore, IconaTonda, Nota, Riquadro, Vuoto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apriFile, caricaFile, eliminaFile, TIPI_DOCUMENTO, type FileScelto } from '@/lib/file';
import { data } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import { useTinte, type Tinta } from '@/lib/tema';
import type { Documento } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

const CARTELLE: { nome: string; icona: string }[] = [
  { nome: 'Regolamento', icona: 'book-open-variant' },
  { nome: 'Assicurazione', icona: 'shield-check-outline' },
  { nome: 'Contratti', icona: 'file-sign' },
  { nome: 'Impianti', icona: 'cog-outline' },
  { nome: 'Verbali', icona: 'text-box-check-outline' },
  { nome: 'Bilanci', icona: 'chart-box-outline' },
  { nome: 'Altro', icona: 'folder-outline' },
];

function iconaFile(d: Documento) {
  if (d.tipo_mime === 'application/pdf') return 'file-pdf-box';
  if (d.tipo_mime.startsWith('image/')) return 'file-image-outline';
  if (d.tipo_mime.includes('word')) return 'file-word-outline';
  if (d.tipo_mime.includes('excel') || d.tipo_mime.includes('sheet')) return 'file-excel-outline';
  if (d.tipo_mime.includes('rfc822') || d.tipo_mime.includes('outlook')) return 'email-outline';
  return 'file-document-outline';
}

function NuovoDocumento({ cartellaIniziale, onSalvato, onAnnulla }: { cartellaIniziale: string; onSalvato: () => void; onAnnulla: () => void }) {
  const [cartella, setCartella] = useState(cartellaIniziale);
  const [titolo, setTitolo] = useState('');
  const [file, setFile] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    if (!file.length) {
      setErrore('Scegli il file da caricare.');
      return;
    }
    setInCorso(true);
    try {
      for (const f of file) {
        const percorso = await caricaFile('documenti', `archivio/${cartella}`, f);
        const { error } = await supabase.from('documenti').insert({
          // con un solo file vale il titolo scritto, con più file il nome di ciascuno
          titolo: (file.length === 1 && titolo.trim()) || f.nome.replace(/\.[^.]+$/, ''),
          cartella,
          percorso,
          nome_file: f.nome,
          tipo_mime: f.tipo,
        });
        if (error) throw new Error(error.message);
      }
      onSalvato();
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Riquadro evidenziato>
      <Text variant="titleSmall">Carica documenti</Text>
      <View style={styles.chip}>
        {CARTELLE.map((c) => (
          <Chip
            key={c.nome}
            icon={c.icona}
            selected={cartella === c.nome}
            showSelectedCheck={false}
            mode={cartella === c.nome ? 'flat' : 'outlined'}
            onPress={() => setCartella(c.nome)}
          >
            {c.nome}
          </Chip>
        ))}
      </View>
      <TextInput
        label="Titolo (facoltativo, es. Polizza globale fabbricato 2026)"
        mode="outlined"
        value={titolo}
        onChangeText={setTitolo}
      />
      <SceltaFile file={file} onCambia={setFile} tipi={TIPI_DOCUMENTO} etichetta="Scegli file (PDF, Word, Excel, foto, email)" />
      <Errore testo={errore} />
      <View style={styles.azioni}>
        <Button onPress={onAnnulla}>Annulla</Button>
        <Button mode="contained" onPress={salva} loading={inCorso} disabled={inCorso}>
          Carica
        </Button>
      </View>
    </Riquadro>
  );
}

export default function Documenti() {
  const { profilo } = useAuth();
  const tema = useTheme();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';
  const [cartella, setCartella] = useState<string | null>(null);
  const [nuovo, setNuovo] = useState(false);
  const [cerca, setCerca] = useState('');

  const leggi = useCallback(
    () => supabase.from('documenti').select('*').order('creato_il', { ascending: false }).returns<Documento[]>(),
    [],
  );
  const { dati, errore, ricarica, aggiorna, aggiornamento } = useDati(leggi);

  const conta = (c: string) => (dati ?? []).filter((d) => d.cartella === c).length;
  const testo = cerca.trim().toLowerCase();
  const visibili = (dati ?? []).filter(
    (d) => (!cartella || d.cartella === cartella) && (!testo || `${d.titolo} ${d.nome_file}`.toLowerCase().includes(testo)),
  );
  const tintaCartella = (c: string): Tinta => (c === 'Assicurazione' || c === 'Contratti' ? tinte.viola : c === 'Bilanci' ? tinte.verde : tinte.blu);

  async function elimina(d: Documento) {
    await eliminaFile('documenti', [d.percorso]);
    await supabase.from('documenti').delete().eq('id', d.id);
    await ricarica();
  }

  return (
    <Pagina
      titolo="Documenti"
      sottotitolo="Regolamento, polizze, contratti e altro"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={admin && !nuovo && <BottoneNuovo etichetta="Carica documento" onPress={() => setNuovo(true)} />}
    >
      {nuovo && (
        <NuovoDocumento
          cartellaIniziale={cartella ?? 'Altro'}
          onAnnulla={() => setNuovo(false)}
          onSalvato={() => {
            setNuovo(false);
            ricarica();
          }}
        />
      )}
      <TextInput
        mode="outlined"
        placeholder="Cerca un documento"
        value={cerca}
        onChangeText={setCerca}
        left={<TextInput.Icon icon="magnify" />}
        dense
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scorrevole}>
        <Chip selected={!cartella} showSelectedCheck={false} mode={!cartella ? 'flat' : 'outlined'} onPress={() => setCartella(null)}>
          Tutti ({dati?.length ?? 0})
        </Chip>
        {CARTELLE.filter((c) => conta(c.nome) > 0).map((c) => (
          <Chip
            key={c.nome}
            icon={c.icona}
            selected={cartella === c.nome}
            showSelectedCheck={false}
            mode={cartella === c.nome ? 'flat' : 'outlined'}
            onPress={() => setCartella(cartella === c.nome ? null : c.nome)}
          >
            {`${c.nome} (${conta(c.nome)})`}
          </Chip>
        ))}
      </ScrollView>

      <Errore testo={errore} />
      {dati === null && !errore && <ActivityIndicator style={styles.caricamento} />}
      {dati && visibili.length === 0 && (
        <Vuoto
          icona="folder-open-outline"
          titolo={testo ? 'Nessun risultato' : 'Nessun documento'}
          testo={testo ? 'Prova con un’altra parola.' : 'Qui l’amministratore caricherà regolamento, polizze e contratti.'}
        />
      )}

      {visibili.map((d) => (
        <Riquadro key={d.id} onPress={() => apriFile('documenti', d.percorso)} style={styles.riga}>
          <IconaTonda icona={iconaFile(d)} tinta={tintaCartella(d.cartella)} dimensione={40} />
          <View style={styles.flex}>
            <Text variant="titleSmall" numberOfLines={2}>
              {d.titolo}
            </Text>
            <Nota>
              {d.cartella} · {data(d.creato_il)}
            </Nota>
          </View>
          {admin ? (
            <BottoneConferma etichetta="" conferma="Elimina" onConferma={() => elimina(d)} />
          ) : (
            <Icon source="open-in-new" size={18} color={tema.colors.onSurfaceVariant} />
          )}
        </Riquadro>
      ))}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scorrevole: { gap: 6 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
});
