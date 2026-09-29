// Storico di una ditta: contatti, lavori, preventivi, guasti seguiti e pagamenti.
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, Text, useTheme } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { Errore, Nota, Riquadro, Titoletto } from '@/components/ui';
import { data, euro } from '@/lib/formato';
import { leggiStoricoDitte } from '@/lib/storicoDitte';
import { useDati } from '@/lib/useDati';

function Voce({ titolo, dettaglio, destra, link }: { titolo: string; dettaglio: string; destra?: string; link?: Href }) {
  const tema = useTheme();
  return (
    <Riquadro onPress={link ? () => router.push(link) : undefined} style={styles.riga}>
      <View style={styles.flex}>
        <Text variant="titleSmall">{titolo}</Text>
        <Nota>{dettaglio}</Nota>
      </View>
      {!!destra && <Text variant="titleSmall">{destra}</Text>}
      {link && <Icon source="chevron-right" size={18} color={tema.colors.onSurfaceVariant} />}
    </Riquadro>
  );
}

const statoPreventivo: Record<string, string> = { in_valutazione: 'in valutazione', accettato: 'accettato', scartato: 'scartato' };
const statoGuasto: Record<string, string> = { aperto: 'aperto', in_lavorazione: 'in lavorazione', chiuso: 'risolto' };

export default function DettaglioDitta() {
  const { nome } = useLocalSearchParams<{ nome: string }>();
  const chiave = decodeURIComponent(nome ?? '');
  const leggi = useCallback(async () => {
    const d = (await leggiStoricoDitte()).find((x) => x.chiave === chiave);
    return d ? { data: d, error: null } : { data: null, error: { message: 'Ditta non trovata.' } };
  }, [chiave]);
  const { dati: d, errore } = useDati(leggi);

  if (errore)
    return (
      <Pagina titolo="Ditta">
        <Errore testo={errore} />
      </Pagina>
    );
  if (!d)
    return (
      <Pagina titolo="Ditta">
        <ActivityIndicator style={styles.caricamento} />
      </Pagina>
    );

  const giorno = (v: string) => data(v.length === 10 ? `${v}T12:00:00` : v);

  return (
    <Pagina titolo={d.nome} sottotitolo={d.contatto?.categoria || 'Ditta / fornitore'}>
      <Riquadro>
        {d.contatto ? (
          <>
            {!!d.contatto.telefono && <Text variant="bodyLarge">{d.contatto.telefono}</Text>}
            {!!d.contatto.email && <Text variant="bodyMedium">{d.contatto.email}</Text>}
            {!!d.contatto.note && <Nota>{d.contatto.note}</Nota>}
            <View style={styles.azioni}>
              {!!d.contatto.email && (
                <Button compact icon="email-outline" onPress={() => Linking.openURL(`mailto:${d.contatto!.email}`)}>
                  Scrivi
                </Button>
              )}
              {!!d.contatto.telefono && (
                <Button
                  compact
                  mode="contained"
                  icon="phone"
                  onPress={() => Linking.openURL(`tel:${d.contatto!.telefono!.replace(/\s/g, '')}`)}
                >
                  Chiama
                </Button>
              )}
            </View>
          </>
        ) : (
          <Nota>Nessun contatto salvato: puoi aggiungerla nei Numeri utili con lo stesso nome.</Nota>
        )}
        {d.totalePagato > 0 && (
          <Text variant="titleSmall">Pagato in totale dal condominio: {euro(d.totalePagato)}</Text>
        )}
      </Riquadro>

      {d.lavori.length > 0 && <Titoletto>{`Lavori (${d.lavori.length})`}</Titoletto>}
      {d.lavori.map((l) => (
        <Voce
          key={l.id}
          titolo={l.titolo}
          dettaglio={giorno(l.data_lavoro)}
          destra={l.importo != null ? euro(l.importo) : undefined}
          link={`/lavori/${l.id}`}
        />
      ))}

      {d.preventivi.length > 0 && <Titoletto>{`Preventivi (${d.preventivi.length})`}</Titoletto>}
      {d.preventivi.map((p) => (
        <Voce
          key={p.id}
          titolo={p.titolo}
          dettaglio={`${giorno(p.creato_il)} · ${statoPreventivo[p.stato] ?? p.stato}`}
          destra={p.importo != null ? euro(p.importo) : undefined}
          link={`/preventivi/${p.richiesta_id}`}
        />
      ))}

      {d.guasti.length > 0 && <Titoletto>{`Guasti seguiti (${d.guasti.length})`}</Titoletto>}
      {d.guasti.map((g) => (
        <Voce key={g.id} titolo={g.titolo} dettaglio={`${giorno(g.creato_il)} · ${statoGuasto[g.stato] ?? g.stato}`} link={`/guasti/${g.id}`} />
      ))}

      {d.movimenti.length > 0 && <Titoletto>{`Movimenti del conto (${d.movimenti.length})`}</Titoletto>}
      {d.movimenti.map((m) => (
        <Voce
          key={m.id}
          titolo={m.descrizione}
          dettaglio={giorno(m.data)}
          destra={`${m.tipo === 'entrata' ? '+' : '−'}${euro(m.importo)}`}
          link="/spese"
        />
      ))}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1, gap: 2 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
