// Ricerca generale: cerca una parola in tutte le sezioni dell'app
// (avvisi, assemblee, sondaggi e preventivi, guasti, lavori, documenti, scadenze, numeri, movimenti).
// I dati sono pochi (un condominio piccolo): si caricano una volta e si filtrano sul telefono.
import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { CampoRicerca, corrisponde } from '@/components/CampoRicerca';
import { Pagina } from '@/components/Pagina';
import { IconaTonda, Nota, Riquadro, Titoletto, Vuoto } from '@/components/ui';
import { apriFile } from '@/lib/file';
import { data, euro } from '@/lib/formato';
import type { NomeTinta } from '@/lib/guasti';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import { useDati } from '@/lib/useDati';

type Risultato = {
  chiave: string;
  sezione: string;
  icona: string;
  tinta: NomeTinta;
  titolo: string;
  dettaglio: string;
  testo: string; // tutto il testo in cui cercare
  link?: Href;
  apri?: () => void; // per i documenti: apre direttamente il file
};

type Riga = Record<string, unknown>;
const t = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const giorno = (v: unknown) => (t(v) ? data(t(v).length === 10 ? `${t(v)}T12:00:00` : t(v)) : '');

export default function Cerca() {
  const tema = useTheme();
  const tinte = useTinte();
  const [cerca, setCerca] = useState('');

  const leggi = useCallback(async () => {
    // Ogni sezione è indipendente: se una tabella manca (file SQL non eseguito) si salta
    const leggiTabella = async (tabella: string, colonne: string) => {
      const { data: righe, error } = await supabase.from(tabella).select(colonne);
      return error ? [] : ((righe ?? []) as unknown as Riga[]);
    };
    const [avvisi, assemblee, sondaggi, guasti, lavori, documenti, scadenze, numeri, movimenti] = await Promise.all([
      leggiTabella('avvisi', 'id, titolo, testo, creato_il, avvisi_allegati(nome_file)'),
      leggiTabella('assemblee', '*, assemblee_allegati(nome_file)'),
      leggiTabella('sondaggi', 'id, domanda, descrizione, creato_il, sondaggi_opzioni!sondaggi_opzioni_sondaggio_id_fkey(*)'),
      leggiTabella('guasti', 'id, titolo, descrizione, nota_admin, stato, creato_il'),
      leggiTabella('lavori', 'id, titolo, descrizione, ditta, data_lavoro, lavori_allegati(nome_file)'),
      leggiTabella('documenti', 'id, titolo, cartella, nome_file, percorso, creato_il'),
      leggiTabella('scadenze', 'id, titolo, categoria, note, data'),
      leggiTabella('numeri_utili', 'id, nome, categoria, telefono, email, note'),
      leggiTabella('movimenti', 'id, descrizione, categoria, tipo, importo, data'),
    ]);
    const nomi = (v: unknown, campo: string) =>
      Array.isArray(v) ? (v as Riga[]).map((x) => `${t(x[campo])} ${t(x.ditta)}`).join(' ') : '';

    const risultati: Risultato[] = [
      ...avvisi.map((x) => ({
        chiave: `avviso-${t(x.id)}`,
        sezione: 'Avvisi',
        icona: 'bullhorn-outline',
        tinta: 'blu' as NomeTinta,
        titolo: t(x.titolo),
        dettaglio: giorno(x.creato_il),
        testo: `${t(x.titolo)} ${t(x.testo)} ${nomi(x.avvisi_allegati, 'nome_file')}`,
        link: '/avvisi' as Href,
      })),
      ...assemblee.map((x) => ({
        chiave: `assemblea-${t(x.id)}`,
        sezione: 'Assemblee',
        icona: 'calendar-account-outline',
        tinta: 'verde' as NomeTinta,
        titolo: t(x.titolo),
        dettaglio: giorno(x.data_ora),
        testo: `${t(x.titolo)} ${t(x.tipo)} ${t(x.luogo)} ${t(x.ordine_del_giorno)} ${t(x.testo)} ${nomi(x.assemblee_allegati, 'nome_file')}`,
        link: `/assemblee/${t(x.id)}` as Href,
      })),
      ...sondaggi.map((x) => ({
        chiave: `sondaggio-${t(x.id)}`,
        sezione: 'Sondaggi e preventivi',
        icona: 'vote-outline',
        tinta: 'viola' as NomeTinta,
        titolo: t(x.domanda),
        dettaglio: giorno(x.creato_il),
        testo: `${t(x.domanda)} ${t(x.descrizione)} ${nomi(x.sondaggi_opzioni, 'testo')}`,
        link: `/sondaggi/${t(x.id)}` as Href,
      })),
      ...guasti.map((x) => ({
        chiave: `guasto-${t(x.id)}`,
        sezione: 'Guasti',
        icona: 'tools',
        tinta: 'arancio' as NomeTinta,
        titolo: t(x.titolo),
        dettaglio: `${giorno(x.creato_il)} · ${x.stato === 'chiuso' ? 'risolto' : x.stato === 'in_lavorazione' ? 'in lavorazione' : 'aperto'}`,
        testo: `${t(x.titolo)} ${t(x.descrizione)} ${t(x.nota_admin)}`,
        link: `/guasti/${t(x.id)}` as Href,
      })),
      ...lavori.map((x) => ({
        chiave: `lavoro-${t(x.id)}`,
        sezione: 'Storico lavori',
        icona: 'hammer-wrench',
        tinta: 'arancio' as NomeTinta,
        titolo: t(x.titolo),
        dettaglio: `${giorno(x.data_lavoro)}${x.ditta ? ` · ${t(x.ditta)}` : ''}`,
        testo: `${t(x.titolo)} ${t(x.descrizione)} ${t(x.ditta)} ${nomi(x.lavori_allegati, 'nome_file')}`,
        link: `/lavori/${t(x.id)}` as Href,
      })),
      ...documenti.map((x) => ({
        chiave: `documento-${t(x.id)}`,
        sezione: 'Documenti',
        icona: 'file-document-outline',
        tinta: 'blu' as NomeTinta,
        titolo: t(x.titolo),
        dettaglio: `${t(x.cartella)} · ${giorno(x.creato_il)}`,
        testo: `${t(x.titolo)} ${t(x.cartella)} ${t(x.nome_file)}`,
        apri: () => apriFile('documenti', t(x.percorso)),
      })),
      ...scadenze.map((x) => ({
        chiave: `scadenza-${t(x.id)}`,
        sezione: 'Scadenze',
        icona: 'calendar-alert',
        tinta: 'rosso' as NomeTinta,
        titolo: t(x.titolo),
        dettaglio: `${giorno(x.data)} · ${t(x.categoria)}`,
        testo: `${t(x.titolo)} ${t(x.categoria)} ${t(x.note)}`,
        link: '/scadenze' as Href,
      })),
      ...numeri.map((x) => ({
        chiave: `numero-${t(x.id)}`,
        sezione: 'Numeri utili',
        icona: 'phone-outline',
        tinta: 'verde' as NomeTinta,
        titolo: t(x.nome),
        dettaglio: `${t(x.categoria)}${x.telefono ? ` · ${t(x.telefono)}` : ''}`,
        testo: `${t(x.nome)} ${t(x.categoria)} ${t(x.telefono)} ${t(x.email)} ${t(x.note)}`,
        link: '/numeri' as Href,
      })),
      ...movimenti.map((x) => ({
        chiave: `movimento-${t(x.id)}`,
        sezione: 'Conto spese',
        icona: x.tipo === 'entrata' ? 'arrow-bottom-left' : 'arrow-top-right',
        tinta: (x.tipo === 'entrata' ? 'verde' : 'rosso') as NomeTinta,
        titolo: t(x.descrizione),
        dettaglio: `${giorno(x.data)} · ${x.tipo === 'entrata' ? '+' : '−'}${euro(Number(x.importo))}`,
        testo: `${t(x.descrizione)} ${t(x.categoria)}`,
        link: '/spese' as Href,
      })),
    ];
    return { data: risultati, error: null };
  }, []);
  const { dati } = useDati(leggi);

  const trovati = cerca.trim() ? (dati ?? []).filter((r) => corrisponde(cerca, r.testo)) : [];
  const sezioni = [...new Set(trovati.map((r) => r.sezione))];

  return (
    <Pagina titolo="Cerca" sottotitolo="In avvisi, assemblee, sondaggi, guasti, lavori, documenti e altro">
      <CampoRicerca valore={cerca} onCambia={setCerca} segnaposto="Cosa cerchi? (es. tetto, caldaia, verbale)" autoFocus />
      {dati === null && <ActivityIndicator style={styles.caricamento} />}
      {dati && !cerca.trim() && <Nota style={styles.centro}>Scrivi una o più parole: cerco in tutte le sezioni.</Nota>}
      {dati && !!cerca.trim() && trovati.length === 0 && (
        <Vuoto icona="magnify-close" titolo="Nessun risultato" testo="Prova con un’altra parola o con meno parole." />
      )}
      {sezioni.map((sez) => (
        <View key={sez} style={styles.gruppo}>
          <Titoletto>{`${sez} (${trovati.filter((r) => r.sezione === sez).length})`}</Titoletto>
          {trovati
            .filter((r) => r.sezione === sez)
            .map((r) => (
              <Riquadro key={r.chiave} onPress={r.apri ?? (() => r.link && router.push(r.link))} style={styles.riga}>
                <IconaTonda icona={r.icona} tinta={tinte[r.tinta]} dimensione={36} />
                <View style={styles.flex}>
                  <Text variant="titleSmall" numberOfLines={2}>
                    {r.titolo}
                  </Text>
                  <Nota>{r.dettaglio}</Nota>
                </View>
                <Icon source={r.apri ? 'open-in-new' : 'chevron-right'} size={18} color={tema.colors.onSurfaceVariant} />
              </Riquadro>
            ))}
        </View>
      ))}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  centro: { alignSelf: 'center', marginTop: 16 },
  gruppo: { gap: 10 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
});
