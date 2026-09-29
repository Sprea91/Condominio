// Nuovo sondaggio (solo amministratore): domanda, opzioni, modalità di conteggio, scadenza facoltativa.
// Con "Confronto preventivi" ogni opzione è un preventivo: ditta, importo e file PDF.
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, SegmentedButtons, Switch, Text, TextInput, useTheme } from 'react-native-paper';

import { CampoData } from '@/components/CampoData';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { Errore, Nota, Riquadro } from '@/components/ui';
import { caricaFile, TIPI_DOCUMENTO, type FileScelto } from '@/lib/file';
import { leggiData, leggiNumero } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import type { ModalitaVoto } from '@/lib/tipi';

type Opzione = { testo: string; importo: string; file: FileScelto[] };

const vuota = (testo = ''): Opzione => ({ testo, importo: '', file: [] });

export default function NuovoSondaggio() {
  const tema = useTheme();
  const [domanda, setDomanda] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [modalita, setModalita] = useState<ModalitaVoto>('millesimi');
  const [preventivi, setPreventivi] = useState(false);
  const [opzioni, setOpzioni] = useState<Opzione[]>([vuota('Favorevole'), vuota('Contrario'), vuota('Astenuto')]);
  const [scadenza, setScadenza] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  function cambia(i: number, modifica: Partial<Opzione>) {
    setOpzioni(opzioni.map((o, j) => (j === i ? { ...o, ...modifica } : o)));
  }

  function attivaPreventivi(attivo: boolean) {
    setPreventivi(attivo);
    // Cambiando tipo di sondaggio si propongono opzioni adatte
    setOpzioni(attivo ? [vuota(), vuota(), vuota()] : [vuota('Favorevole'), vuota('Contrario'), vuota('Astenuto')]);
    if (attivo && !domanda.trim()) setDomanda('Quale preventivo scegliamo per ');
  }

  async function crea() {
    setErrore('');
    const valide = opzioni.filter((o) => o.testo.trim());
    if (!domanda.trim()) {
      setErrore('Scrivi la domanda.');
      return;
    }
    if (valide.length < 2) {
      setErrore(preventivi ? 'Servono almeno 2 preventivi (con il nome della ditta).' : 'Servono almeno 2 opzioni.');
      return;
    }
    if (preventivi && valide.some((o) => o.importo.trim() && leggiNumero(o.importo) === null)) {
      setErrore('Controlla gli importi dei preventivi (esempio: 12.500,00).');
      return;
    }
    let scadenzaIso: string | null = null;
    if (scadenza.trim()) {
      const giorno = leggiData(scadenza);
      if (!giorno) {
        setErrore('Scadenza non valida: usa il formato gg/mm/aaaa.');
        return;
      }
      // Si può votare fino alla fine di quel giorno (ora italiana del telefono)
      scadenzaIso = new Date(`${giorno}T23:59:59`).toISOString();
      if (new Date(scadenzaIso) < new Date()) {
        setErrore('La scadenza è già passata.');
        return;
      }
    }

    setInCorso(true);
    try {
      const { data: sondaggio, error } = await supabase
        .from('sondaggi')
        .insert({ domanda: domanda.trim(), descrizione: descrizione.trim() || null, modalita, scadenza: scadenzaIso })
        .select('id')
        .single();
      if (error) throw new Error(error.message);

      const righe = [];
      for (const [ordine, o] of valide.entries()) {
        const riga: Record<string, unknown> = { sondaggio_id: sondaggio.id, testo: o.testo.trim(), ordine };
        // I campi dei preventivi si mandano solo se usati (colonne di supabase/06-...sql)
        if (preventivi) {
          riga.ditta = o.testo.trim();
          if (o.importo.trim()) riga.importo = leggiNumero(o.importo);
          if (o.file[0]) {
            riga.preventivo_path = await caricaFile('documenti', `preventivi/${sondaggio.id}`, o.file[0]);
            riga.preventivo_nome = o.file[0].nome;
          }
        }
        righe.push(riga);
      }
      const { error: e } = await supabase.from('sondaggi_opzioni').insert(righe);
      if (e) throw new Error(e.message);
      router.replace(`/sondaggi/${sondaggio.id}`);
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Pagina titolo="Nuovo sondaggio" sottotitolo="Tutti i condòmini approvati potranno votare">
      <Riquadro>
        <View style={styles.riga}>
          <View style={styles.flex}>
            <Text variant="titleSmall">Confronto preventivi</Text>
            <Nota>Ogni opzione è un preventivo con ditta, importo e PDF.</Nota>
          </View>
          <Switch value={preventivi} onValueChange={attivaPreventivi} />
        </View>
      </Riquadro>

      <Riquadro>
        <TextInput label="Domanda" mode="outlined" value={domanda} onChangeText={setDomanda} multiline />
        <TextInput
          label="Descrizione (facoltativa)"
          mode="outlined"
          value={descrizione}
          onChangeText={setDescrizione}
          multiline
          numberOfLines={4}
        />
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Come si contano i voti?</Text>
        <SegmentedButtons
          value={modalita}
          onValueChange={(v) => setModalita(v as ModalitaVoto)}
          buttons={[
            { value: 'testa', label: 'Per testa', icon: 'account-multiple' },
            { value: 'millesimi', label: 'Per millesimi', icon: 'chart-pie' },
          ]}
        />
        <Nota>
          {modalita === 'testa'
            ? 'Ogni condòmino vale 1 voto.'
            : 'Ogni voto pesa quanto i millesimi dell’appartamento (consigliato per le spese).'}
        </Nota>
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">{preventivi ? 'Preventivi' : 'Opzioni'}</Text>
        {opzioni.map((o, i) =>
          preventivi ? (
            <View key={i} style={[styles.preventivo, { borderColor: tema.colors.outlineVariant }]}>
              <View style={styles.riga}>
                <Text variant="labelLarge" style={styles.flex}>
                  Preventivo {i + 1}
                </Text>
                <IconButton icon="close" size={18} onPress={() => setOpzioni(opzioni.filter((_, j) => j !== i))} />
              </View>
              <TextInput label="Ditta" mode="outlined" dense value={o.testo} onChangeText={(t) => cambia(i, { testo: t })} />
              <TextInput
                label="Importo in €"
                mode="outlined"
                dense
                value={o.importo}
                onChangeText={(t) => cambia(i, { importo: t })}
                keyboardType="decimal-pad"
              />
              <SceltaFile
                file={o.file}
                onCambia={(f) => cambia(i, { file: f })}
                tipi={TIPI_DOCUMENTO}
                etichetta="Allega preventivo (PDF)"
                multipli={false}
              />
            </View>
          ) : (
            <View key={i} style={styles.riga}>
              <TextInput
                style={styles.flex}
                label={`Opzione ${i + 1}`}
                mode="outlined"
                dense
                value={o.testo}
                onChangeText={(t) => cambia(i, { testo: t })}
              />
              <IconButton icon="close" onPress={() => setOpzioni(opzioni.filter((_, j) => j !== i))} />
            </View>
          ),
        )}
        <Button mode="text" icon="plus" onPress={() => setOpzioni([...opzioni, vuota()])} style={styles.sinistra}>
          {preventivi ? 'Aggiungi preventivo' : 'Aggiungi opzione'}
        </Button>
      </Riquadro>

      <Riquadro>
        <Text variant="titleSmall">Scadenza</Text>
        <CampoData label="Scadenza (facoltativa)" value={scadenza} onChangeText={setScadenza} svuotabile />
        <Nota>Si potrà votare fino alle 23:59 di quel giorno. Puoi anche chiudere la votazione a mano.</Nota>
      </Riquadro>

      <Errore testo={errore} />
      <Button mode="contained" icon="check" onPress={crea} loading={inCorso} disabled={inCorso} contentStyle={styles.alto}>
        Crea sondaggio
      </Button>
    </Pagina>
  );
}

const styles = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  preventivo: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  sinistra: { alignSelf: 'flex-start' },
  alto: { height: 48 },
});
