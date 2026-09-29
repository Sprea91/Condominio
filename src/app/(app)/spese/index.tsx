// Conto spese: saldo totale, riepilogo dell'anno scelto (entrate, uscite, categorie,
// quota del proprio appartamento in base ai millesimi) e lista dei movimenti con i giustificativi.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, Icon, IconButton, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { BottoneConferma } from '@/components/BottoneConferma';
import { CardSaldo } from '@/components/CardSaldo';
import { Pagina } from '@/components/Pagina';
import { BottoneNuovo, Errore, IconaTonda, Nota, Riquadro, Titoletto, Vuoto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { apriFile, eliminaFile } from '@/lib/file';
import { data, euro, millesimi } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { Movimento } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type Filtro = 'tutti' | 'entrata' | 'uscita';

const somma = (lista: Movimento[]) => lista.reduce((t, m) => t + Number(m.importo), 0);

export default function Spese() {
  const { profilo } = useAuth();
  const tema = useTheme();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';
  const [filtro, setFiltro] = useState<Filtro>('tutti');
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [aperto, setAperto] = useState<string | null>(null);

  const leggi = useCallback(
    () =>
      supabase
        .from('movimenti')
        .select('*')
        .order('data', { ascending: false })
        .order('creato_il', { ascending: false })
        .returns<Movimento[]>(),
    [],
  );
  const { dati, errore, ricarica, aggiorna, aggiornamento } = useDati(leggi);

  const tutti = dati ?? [];
  const saldo = somma(tutti.filter((m) => m.tipo === 'entrata')) - somma(tutti.filter((m) => m.tipo === 'uscita'));

  // Anni disponibili: quelli con movimenti + l'anno in corso
  const anni = [...new Set([new Date().getFullYear(), ...tutti.map((m) => Number(m.data.slice(0, 4)))])].sort((a, b) => b - a);
  const dellAnno = tutti.filter((m) => Number(m.data.slice(0, 4)) === anno);
  const entrate = somma(dellAnno.filter((m) => m.tipo === 'entrata'));
  const uscite = somma(dellAnno.filter((m) => m.tipo === 'uscita'));
  const miaQuota = profilo ? (uscite * Number(profilo.millesimi)) / 1000 : 0;

  // Uscite dell'anno raggruppate per categoria, dalla più alta
  const perCategoria = Object.entries(
    dellAnno
      .filter((m) => m.tipo === 'uscita')
      .reduce<Record<string, number>>((acc, m) => {
        const c = m.categoria?.trim() || 'Altro';
        acc[c] = (acc[c] ?? 0) + Number(m.importo);
        return acc;
      }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const visibili = dellAnno.filter((m) => filtro === 'tutti' || m.tipo === filtro);

  async function elimina(m: Movimento) {
    if (m.giustificativo_path) await eliminaFile('giustificativi', [m.giustificativo_path]);
    await supabase.from('movimenti').delete().eq('id', m.id);
    await ricarica();
  }

  return (
    <Pagina
      titolo="Conto spese"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={admin && <BottoneNuovo etichetta="Nuovo movimento" onPress={() => router.push('/spese/nuovo')} />}
    >
      <Errore testo={errore} />
      {dati === null && !errore && <ActivityIndicator style={styles.caricamento} />}

      {dati && (
        <>
          {/* Saldo totale */}
          <CardSaldo
            etichetta="Saldo attuale del condominio"
            importo={euro(saldo)}
            sotto={`${tutti.length} movimenti registrati`}
          />

          {/* Scelta dell'anno */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.anni}>
            {anni.map((a) => (
              <Chip key={a} selected={a === anno} showSelectedCheck={false} onPress={() => setAnno(a)} mode={a === anno ? 'flat' : 'outlined'}>
                {String(a)}
              </Chip>
            ))}
          </ScrollView>

          {/* Riepilogo dell'anno */}
          <View style={styles.coppia}>
            <Riquadro style={styles.metà}>
              <IconaTonda icona="arrow-bottom-left" tinta={tinte.verde} dimensione={36} />
              <Nota>Entrate {anno}</Nota>
              <Text variant="titleLarge" style={{ color: tinte.verde.testo }}>
                {euro(entrate)}
              </Text>
            </Riquadro>
            <Riquadro style={styles.metà}>
              <IconaTonda icona="arrow-top-right" tinta={tinte.rosso} dimensione={36} />
              <Nota>Uscite {anno}</Nota>
              <Text variant="titleLarge" style={{ color: tinte.rosso.testo }}>
                {euro(uscite)}
              </Text>
            </Riquadro>
          </View>

          {profilo && uscite > 0 && Number(profilo.millesimi) > 0 && (
            <Riquadro style={[styles.riga, { backgroundColor: tema.colors.primaryContainer, borderColor: tema.colors.primaryContainer }]}>
              <Icon source="home-account" size={28} color={tema.colors.onPrimaryContainer} />
              <View style={styles.flex}>
                <Text variant="labelLarge" style={{ color: tema.colors.onPrimaryContainer }}>
                  La tua quota delle spese {anno}
                </Text>
                <Text variant="bodySmall" style={{ color: tema.colors.onPrimaryContainer }}>
                  {millesimi(profilo.millesimi)} millesimi su 1000
                </Text>
              </View>
              <Text variant="titleLarge" style={{ color: tema.colors.onPrimaryContainer }}>
                {euro(miaQuota)}
              </Text>
            </Riquadro>
          )}

          {perCategoria.length > 0 && (
            <>
              <Titoletto>Uscite per categoria</Titoletto>
              <Riquadro style={styles.categorie}>
                {perCategoria.map(([nome, totale]) => (
                  <View key={nome} style={styles.categoria}>
                    <View style={styles.rigaCategoria}>
                      <Text variant="bodyMedium" style={styles.flex}>
                        {nome}
                      </Text>
                      <Text variant="titleSmall">{euro(totale)}</Text>
                    </View>
                    <View style={[styles.barra, { backgroundColor: tema.colors.surfaceVariant }]}>
                      <View
                        style={[
                          styles.riempimento,
                          { width: `${Math.round((totale / uscite) * 100)}%`, backgroundColor: tinte.rosso.testo },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </Riquadro>
            </>
          )}

          <Titoletto>Movimenti {anno}</Titoletto>
          <SegmentedButtons
            value={filtro}
            onValueChange={(v) => setFiltro(v as Filtro)}
            buttons={[
              { value: 'tutti', label: 'Tutti' },
              { value: 'entrata', label: 'Entrate' },
              { value: 'uscita', label: 'Uscite' },
            ]}
          />
          {visibili.length === 0 && <Vuoto icona="wallet-outline" titolo="Nessun movimento" testo={`Nessun movimento registrato nel ${anno}.`} />}

          {visibili.map((m) => {
            const entrata = m.tipo === 'entrata';
            const tinta = entrata ? tinte.verde : tinte.rosso;
            return (
              <Riquadro key={m.id} onPress={() => setAperto(aperto === m.id ? null : m.id)}>
                <View style={styles.riga}>
                  <IconaTonda icona={entrata ? 'arrow-bottom-left' : 'arrow-top-right'} tinta={tinta} dimensione={40} />
                  <View style={styles.flex}>
                    <Text variant="titleSmall" numberOfLines={2}>
                      {m.descrizione}
                    </Text>
                    <Nota>
                      {data(m.data)}
                      {m.categoria ? ` · ${m.categoria}` : ''}
                    </Nota>
                  </View>
                  {m.giustificativo_path && (
                    <IconButton
                      icon="paperclip"
                      size={18}
                      style={styles.graffetta}
                      onPress={() => apriFile('giustificativi', m.giustificativo_path!)}
                      accessibilityLabel="Apri giustificativo"
                    />
                  )}
                  <Text variant="titleMedium" style={{ color: tinta.testo }}>
                    {entrata ? '+' : '−'}
                    {euro(m.importo)}
                  </Text>
                </View>
                {aperto === m.id && (m.giustificativo_path || admin) && (
                  <View style={styles.azioni}>
                    {m.giustificativo_path && (
                      <Chip icon="file-document-outline" onPress={() => apriFile('giustificativi', m.giustificativo_path!)}>
                        Apri giustificativo
                      </Chip>
                    )}
                    {admin && <BottoneConferma etichetta="Elimina" conferma="Elimina movimento" onConferma={() => elimina(m)} />}
                  </View>
                )}
              </Riquadro>
            );
          })}
        </>
      )}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  anni: { gap: 8 },
  coppia: { flexDirection: 'row', gap: 12 },
  metà: { flex: 1, gap: 6 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  categorie: { gap: 14 },
  categoria: { gap: 6 },
  rigaCategoria: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  riempimento: { height: '100%', borderRadius: 4 },
  graffetta: { margin: 0 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
});
