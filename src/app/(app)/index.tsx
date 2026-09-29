// Home: saluto, saldo del condominio, sezioni con i contatori delle novità, ultimo avviso.
import { router, type Href } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Badge, Icon, Text, useTheme } from 'react-native-paper';

import { CardSaldo } from '@/components/CardSaldo';
import { DataCalendario } from '@/components/DataCalendario';
import { Pagina } from '@/components/Pagina';
import { Etichetta, IconaTonda, Nota, Riquadro, Titoletto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { dataOra, euro, millesimi, ora, traQuanto } from '@/lib/formato';
import { ultimaVisita } from '@/lib/letti';
import { RISPOSTE } from '@/lib/presenze';
import { aperto } from '@/lib/sondaggi';
import { supabase } from '@/lib/supabase';
import { useTinte, type Tinta } from '@/lib/tema';
import type { RispostaPresenza, Sondaggio } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type AvvisoBreve = { id: string; titolo: string; testo: string; creato_il: string; in_evidenza?: boolean };

type Riepilogo = {
  saldo: number;
  avvisiNuovi: number;
  ultimoAvviso: AvvisoBreve | null;
  inEvidenza: AvvisoBreve[];
  guastiAperti: number;
  sondaggiDaVotare: number;
  inAttesa: number;
  prossimaAssemblea: { id: string; titolo: string; data_ora: string; luogo: string | null } | null;
  miaRisposta: RispostaPresenza | null;
};

function saluto() {
  const ora = new Date().getHours();
  if (ora < 13) return 'Buongiorno';
  if (ora < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

function iniziali(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function TesseraSezione({
  titolo,
  dettaglio,
  icona,
  tinta,
  conteggio,
  link,
}: {
  titolo: string;
  dettaglio: string;
  icona: string;
  tinta: Tinta;
  conteggio?: number;
  link: Href;
}) {
  return (
    <Riquadro style={styles.tessera} onPress={() => router.push(link)}>
      <View style={styles.rigaTessera}>
        <IconaTonda icona={icona} tinta={tinta} />
        {!!conteggio && <Badge size={24}>{conteggio}</Badge>}
      </View>
      <View>
        <Text variant="titleMedium">{titolo}</Text>
        <Nota>{dettaglio}</Nota>
      </View>
    </Riquadro>
  );
}

export default function Home() {
  const { profilo } = useAuth();
  const tema = useTheme();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';

  const leggi = useCallback(async () => {
    const id = profilo?.id ?? '';
    const [s, a, g, so, v, p, asm, pr] = await Promise.all([
      supabase.from('saldo').select('saldo').maybeSingle(),
      supabase.from('avvisi').select('*').order('creato_il', { ascending: false }),
      supabase.from('guasti').select('stato').neq('stato', 'chiuso'),
      supabase.from('sondaggi').select('id, chiuso, scadenza'),
      supabase.from('voti').select('sondaggio_id').eq('utente_id', id),
      supabase.from('profili').select('id', { count: 'exact', head: true }).eq('approvato', false),
      supabase
        .from('assemblee')
        .select('id, titolo, data_ora, luogo')
        .gte('data_ora', new Date().toISOString())
        .order('data_ora', { ascending: true })
        .limit(1),
      supabase.from('presenze').select('assemblea_id, risposta').eq('utente_id', id),
    ]);
    // Le assemblee arrivano con supabase/05-...sql: se non c'è ancora, la Home funziona lo stesso
    const error = s.error ?? a.error ?? g.error ?? so.error ?? v.error;
    if (error) return { data: null, error };
    const visita = ultimaVisita(id);
    const votati = new Set((v.data ?? []).map((x) => x.sondaggio_id));
    const dati: Riepilogo = {
      saldo: Number(s.data?.saldo ?? 0),
      avvisiNuovi: (a.data ?? []).filter((x) => !visita || x.creato_il > visita).length,
      ultimoAvviso: (a.data?.[0] as AvvisoBreve | undefined) ?? null,
      inEvidenza: ((a.data ?? []) as AvvisoBreve[]).filter((x) => x.in_evidenza),
      guastiAperti: g.data?.length ?? 0,
      sondaggiDaVotare: ((so.data ?? []) as Sondaggio[]).filter((x) => aperto(x) && !votati.has(x.id)).length,
      inAttesa: p.count ?? 0,
      prossimaAssemblea: asm.error ? null : (asm.data?.[0] ?? null),
      miaRisposta: null,
    };
    if (dati.prossimaAssemblea && !pr.error) {
      const r = (pr.data ?? []).find((x) => x.assemblea_id === dati.prossimaAssemblea!.id);
      dati.miaRisposta = (r?.risposta as RispostaPresenza | undefined) ?? null;
    }
    return { data: dati, error: null };
  }, [profilo?.id]);
  const { dati, aggiorna, aggiornamento } = useDati(leggi);

  const nome = profilo?.nome ?? profilo?.email ?? '';

  return (
    <Pagina onAggiorna={aggiorna} aggiornamento={aggiornamento}>
      {/* Saluto e profilo */}
      <View style={styles.testa}>
        <View style={styles.flex}>
          <Nota>{saluto()},</Nota>
          <Text variant="headlineMedium" numberOfLines={1}>
            {profilo?.nome?.split(' ')[0] ?? 'benvenuto'}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/profilo')} accessibilityLabel="Il mio profilo">
          <Avatar.Text size={48} label={iniziali(nome) || '?'} />
        </Pressable>
      </View>

      {/* Avvisi in evidenza (li sceglie l'amministratore dalla bacheca) */}
      {dati?.inEvidenza.map((a) => (
        <Riquadro
          key={a.id}
          onPress={() => router.push('/avvisi')}
          style={{ backgroundColor: tinte.blu.sfondo, borderColor: tinte.blu.sfondo }}
        >
          <View style={styles.rigaAvviso}>
            <Icon source="pin" size={18} color={tinte.blu.testo} />
            <Text variant="labelLarge" style={[styles.flex, styles.maiuscolo, { color: tinte.blu.testo }]}>
              In evidenza
            </Text>
            <Text variant="labelSmall" style={{ color: tinte.blu.testo }}>
              {dataOra(a.creato_il)}
            </Text>
          </View>
          <Text variant="titleLarge" style={{ color: tinte.blu.testo }}>
            {a.titolo}
          </Text>
          <Text variant="bodyMedium" numberOfLines={3} style={{ color: tinte.blu.testo }}>
            {a.testo}
          </Text>
          <Text variant="labelLarge" style={{ color: tinte.blu.testo }}>
            Leggi tutto ›
          </Text>
        </Riquadro>
      ))}

      {/* Prossima assemblea */}
      {dati?.prossimaAssemblea && (
        <Riquadro onPress={() => router.push(`/assemblee/${dati.prossimaAssemblea!.id}`)} style={styles.rigaAvviso}>
          <DataCalendario iso={dati.prossimaAssemblea.data_ora} />
          <View style={styles.flex}>
            <Nota>Prossima assemblea · {traQuanto(dati.prossimaAssemblea.data_ora)}</Nota>
            <Text variant="titleMedium" numberOfLines={2}>
              {dati.prossimaAssemblea.titolo}
            </Text>
            <Nota>
              ore {ora(dati.prossimaAssemblea.data_ora)}
              {dati.prossimaAssemblea.luogo ? ` · ${dati.prossimaAssemblea.luogo}` : ''}
            </Nota>
            <View style={styles.sotto}>
              {(() => {
                const r = RISPOSTE.find((x) => x.valore === dati.miaRisposta);
                return r ? (
                  <Etichetta testo={r.breve} tinta={tinte[r.tinta]} icona={r.icona} />
                ) : (
                  <Etichetta testo="Conferma la presenza" tinta={tinte.arancio} icona="help-circle-outline" />
                );
              })()}
            </View>
          </View>
          <Icon source="chevron-right" size={20} color={tema.colors.onSurfaceVariant} />
        </Riquadro>
      )}

      {/* Saldo: porta al conto spese */}
      <CardSaldo
        etichetta="Saldo del condominio"
        importo={dati ? euro(dati.saldo) : '—'}
        sotto={`${profilo?.appartamento ? `Appartamento ${profilo.appartamento} · ` : ''}${profilo ? `${millesimi(profilo.millesimi)} millesimi` : ''}`}
        onPress={() => router.push('/spese')}
      />

      {/* Richieste da approvare (solo amministratore) */}
      {admin && !!dati?.inAttesa && (
        <Riquadro onPress={() => router.push('/condomini')} style={[styles.rigaAvviso, { backgroundColor: tinte.arancio.sfondo, borderColor: tinte.arancio.sfondo }]}>
          <Icon source="account-clock-outline" size={22} color={tinte.arancio.testo} />
          <Text variant="titleSmall" style={[styles.flex, { color: tinte.arancio.testo }]}>
            {dati.inAttesa === 1 ? '1 registrazione da approvare' : `${dati.inAttesa} registrazioni da approvare`}
          </Text>
          <Icon source="chevron-right" size={20} color={tinte.arancio.testo} />
        </Riquadro>
      )}

      {/* Sezioni */}
      <View style={styles.griglia}>
        <TesseraSezione
          titolo="Avvisi"
          dettaglio={dati?.avvisiNuovi ? `${dati.avvisiNuovi} da leggere` : 'Bacheca'}
          icona="bullhorn-outline"
          tinta={tinte.blu}
          conteggio={dati?.avvisiNuovi}
          link="/avvisi"
        />
        <TesseraSezione
          titolo="Guasti"
          dettaglio={dati?.guastiAperti ? `${dati.guastiAperti} da risolvere` : 'Tutto ok'}
          icona="tools"
          tinta={tinte.arancio}
          link="/guasti"
        />
        <TesseraSezione
          titolo="Sondaggi"
          dettaglio={dati?.sondaggiDaVotare ? `${dati.sondaggiDaVotare} da votare` : 'Votazioni'}
          icona="vote-outline"
          tinta={tinte.viola}
          conteggio={dati?.sondaggiDaVotare}
          link="/sondaggi"
        />
        <TesseraSezione
          titolo="Assemblee"
          dettaglio={dati?.prossimaAssemblea ? traQuanto(dati.prossimaAssemblea.data_ora) : 'Convocazioni'}
          icona="calendar-account-outline"
          tinta={tinte.verde}
          link="/assemblee"
        />
      </View>

      {/* Ultimo avviso (se non è già mostrato in evidenza) */}
      {dati?.ultimoAvviso && !dati.ultimoAvviso.in_evidenza && (
        <>
          <Titoletto>Ultimo avviso</Titoletto>
          <Riquadro onPress={() => router.push('/avvisi')}>
            <Text variant="titleMedium">{dati.ultimoAvviso.titolo}</Text>
            <Nota>{dataOra(dati.ultimoAvviso.creato_il)}</Nota>
          </Riquadro>
        </>
      )}

      {admin && (
        <>
          <Titoletto>Amministrazione</Titoletto>
          <Riquadro onPress={() => router.push('/condomini')} style={styles.rigaAvviso}>
            <IconaTonda icona="account-group-outline" tinta={tinte.grigio} dimensione={40} />
            <View style={styles.flex}>
              <Text variant="titleMedium">Gestione condòmini</Text>
              <Nota>Approvazioni, appartamenti e millesimi</Nota>
            </View>
            <Icon source="chevron-right" size={20} color={tema.colors.onSurfaceVariant} />
          </Riquadro>
        </>
      )}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  testa: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  flex: { flex: 1 },
  rigaAvviso: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tessera: { flexBasis: '46%', flexGrow: 1, gap: 14 },
  sotto: { flexDirection: 'row', marginTop: 6 },
  maiuscolo: { textTransform: 'uppercase', letterSpacing: 0.8 },
  rigaTessera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
