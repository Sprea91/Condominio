// Ditte e fornitori: tutte le ditte che compaiono nell'app, con quante volte e quanto è stato pagato.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { CampoRicerca, corrisponde } from '@/components/CampoRicerca';
import { Pagina } from '@/components/Pagina';
import { IconaTonda, Nota, Riquadro, Vuoto } from '@/components/ui';
import { euro } from '@/lib/formato';
import { leggiStoricoDitte } from '@/lib/storicoDitte';
import { useTinte } from '@/lib/tema';
import { useDati } from '@/lib/useDati';

export default function Ditte() {
  const tema = useTheme();
  const tinte = useTinte();
  const [cerca, setCerca] = useState('');
  const leggi = useCallback(async () => ({ data: await leggiStoricoDitte(), error: null }), []);
  const { dati, aggiorna, aggiornamento } = useDati(leggi);
  const trovate = (dati ?? []).filter((d) => corrisponde(cerca, d.nome, d.contatto?.categoria));

  return (
    <Pagina titolo="Ditte e fornitori" sottotitolo="Chi ha lavorato per il condominio" onAggiorna={aggiorna} aggiornamento={aggiornamento}>
      <CampoRicerca valore={cerca} onCambia={setCerca} segnaposto="Cerca una ditta" />
      {dati === null && <ActivityIndicator style={styles.caricamento} />}
      {dati?.length === 0 && (
        <Vuoto
          icona="domain"
          titolo="Nessuna ditta"
          testo="Le ditte compaiono qui da sole quando le scrivi in un preventivo, un lavoro, un guasto, una spesa o nei numeri utili."
        />
      )}
      {trovate.map((d) => {
        const parti = [
          d.lavori.length && `${d.lavori.length} lavor${d.lavori.length === 1 ? 'o' : 'i'}`,
          d.preventivi.length && `${d.preventivi.length} preventiv${d.preventivi.length === 1 ? 'o' : 'i'}`,
          d.guasti.length && `${d.guasti.length} guast${d.guasti.length === 1 ? 'o' : 'i'}`,
        ].filter(Boolean);
        return (
          <Riquadro key={d.chiave} onPress={() => router.push(`/ditte/${encodeURIComponent(d.chiave)}`)} style={styles.riga}>
            <IconaTonda icona="domain" tinta={d.contatto ? tinte.verde : tinte.blu} dimensione={40} />
            <View style={styles.flex}>
              <Text variant="titleMedium">{d.nome}</Text>
              <Nota>
                {[d.contatto?.categoria, ...parti].filter(Boolean).join(' · ') || 'Nessun dettaglio'}
              </Nota>
              {d.totalePagato > 0 && <Nota>Pagato in totale: {euro(d.totalePagato)}</Nota>}
            </View>
            <Icon source="chevron-right" size={20} color={tema.colors.onSurfaceVariant} />
          </Riquadro>
        );
      })}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
});
