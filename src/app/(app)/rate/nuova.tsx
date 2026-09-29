// Nuova rata (solo amministratore): titolo, scadenza, totale e come dividerlo tra gli appartamenti.
// Prima di salvare si vede l'anteprima dell'importo di ciascuno (modificabile a mano).
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import { CampoData } from '@/components/CampoData';
import { Pagina } from '@/components/Pagina';
import { Errore, Nota, Riquadro } from '@/components/ui';
import { euro, leggiData, leggiNumero, millesimi } from '@/lib/formato';
import { ripartisci } from '@/lib/rate';
import { supabase } from '@/lib/supabase';
import type { Ripartizione } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type Condomino = { id: string; nome: string | null; appartamento: string | null; millesimi: number };

export default function NuovaRata() {
  const tema = useTheme();
  const [titolo, setTitolo] = useState('');
  const [scadenza, setScadenza] = useState('');
  const [totale, setTotale] = useState('');
  const [modo, setModo] = useState<Ripartizione>('millesimi');
  const [manuali, setManuali] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  const leggi = useCallback(
    () => supabase.from('profili').select('id, nome, appartamento, millesimi').eq('approvato', true).returns<Condomino[]>(),
    [],
  );
  const { dati: condomini } = useDati(leggi);
  const ordinati = [...(condomini ?? [])].sort((a, b) =>
    (a.appartamento ?? '').localeCompare(b.appartamento ?? '', 'it', { numeric: true }),
  );

  const valoreTotale = leggiNumero(totale) ?? 0;
  const calcolate = modo === 'manuale' ? null : ripartisci(valoreTotale, ordinati, modo);
  const importoDi = (id: string) => (calcolate ? (calcolate.get(id) ?? 0) : (leggiNumero(manuali[id] ?? '') ?? 0));
  const sommaManuale = ordinati.reduce((t, c) => t + importoDi(c.id), 0);

  async function salva() {
    setErrore('');
    const scadenzaDb = leggiData(scadenza);
    if (!titolo.trim()) {
      setErrore('Scrivi un titolo (es. Rata 1° trimestre 2026).');
      return;
    }
    if (!scadenzaDb) {
      setErrore('Scadenza non valida: usa gg/mm/aaaa.');
      return;
    }
    if (modo !== 'manuale' && !valoreTotale) {
      setErrore('Inserisci l’importo totale da dividere.');
      return;
    }
    if (!ordinati.length) {
      setErrore('Non ci sono condòmini approvati a cui assegnare la rata.');
      return;
    }
    const totaleFinale = modo === 'manuale' ? Math.round(sommaManuale * 100) / 100 : valoreTotale;
    setInCorso(true);
    try {
      const { data: emissione, error } = await supabase
        .from('rate_emissioni')
        .insert({ titolo: titolo.trim(), scadenza: scadenzaDb, totale: totaleFinale, ripartizione: modo, note: note.trim() || null })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      const { error: e } = await supabase
        .from('rate')
        .insert(ordinati.map((c) => ({ emissione_id: emissione.id, utente_id: c.id, importo: importoDi(c.id) })));
      if (e) throw new Error(e.message);
      router.replace(`/rate/${emissione.id}`);
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Pagina titolo="Nuova rata" sottotitolo="Ogni condòmino vedrà solo la propria quota">
      <Riquadro>
        <TextInput label="Titolo (es. Rata 1° trimestre 2026)" mode="outlined" value={titolo} onChangeText={setTitolo} />
        <CampoData label="Scadenza" value={scadenza} onChangeText={setScadenza} />
        <TextInput label="Note (facoltative)" mode="outlined" value={note} onChangeText={setNote} />
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Come si divide?</Text>
        <SegmentedButtons
          value={modo}
          onValueChange={(v) => setModo(v as Ripartizione)}
          buttons={[
            { value: 'millesimi', label: 'Millesimi' },
            { value: 'uguale', label: 'In parti uguali' },
            { value: 'manuale', label: 'A mano' },
          ]}
        />
        {modo !== 'manuale' && (
          <TextInput
            label="Importo totale in €"
            mode="outlined"
            value={totale}
            onChangeText={setTotale}
            keyboardType="decimal-pad"
            left={<TextInput.Icon icon="currency-eur" />}
          />
        )}
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Anteprima</Text>
        {condomini === null && <ActivityIndicator />}
        {ordinati.map((c) => (
          <View key={c.id} style={[styles.riga, { borderBottomColor: tema.colors.outlineVariant }]}>
            <View style={styles.flex}>
              <Text variant="bodyMedium">
                {c.appartamento ? `App. ${c.appartamento} · ` : ''}
                {c.nome ?? '—'}
              </Text>
              <Nota>{millesimi(c.millesimi)} millesimi</Nota>
            </View>
            {modo === 'manuale' ? (
              <TextInput
                style={styles.importo}
                mode="outlined"
                dense
                value={manuali[c.id] ?? ''}
                onChangeText={(t) => setManuali({ ...manuali, [c.id]: t })}
                keyboardType="decimal-pad"
                placeholder="0,00"
              />
            ) : (
              <Text variant="titleSmall">{euro(importoDi(c.id))}</Text>
            )}
          </View>
        ))}
        <View style={styles.totale}>
          <Text variant="titleSmall">Totale</Text>
          <Text variant="titleMedium">{euro(modo === 'manuale' ? sommaManuale : valoreTotale)}</Text>
        </View>
      </Riquadro>

      <Errore testo={errore} />
      <Button mode="contained" icon="check" onPress={salva} loading={inCorso} disabled={inCorso} contentStyle={styles.alto}>
        Emetti rata
      </Button>
    </Pagina>
  );
}

const styles = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1 },
  flex: { flex: 1 },
  importo: { width: 110 },
  totale: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alto: { height: 48 },
});
