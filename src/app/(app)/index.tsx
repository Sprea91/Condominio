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
import { data, dataOra, euro, millesimi, ora, traQuanto } from '@/lib/formato';
import { ultimaVisita } from '@/lib/letti';
import type { NomeTinta } from '@/lib/guasti';
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
  // sondaggi aperti che scadono entro GIORNI_SONDAGGIO_IMMINENTE giorni
  sondaggiInScadenza: { id: string; domanda: string; scadenza: string; votato: boolean }[];
  inAttesa: number;
  prossimaAssemblea: { id: string; titolo: string; data_ora: string; luogo: string | null } | null;
  miaRisposta: RispostaPresenza | null;
  rateDaPagare: { totale: number; inRitardo: number; prossima: string | null };
  scadenzeVicine: number;
  pagamentiDaConfermare: number;
};

const ALTRE: { titolo: string; dettaglio: string; icona: string; tinta: NomeTinta; link: Href }[] = [
  { titolo: 'Le mie rate', dettaglio: 'Quanto devo, cosa ho pagato, IBAN', icona: 'cash-multiple', tinta: 'viola', link: '/rate' },
  { titolo: 'Scadenze', dettaglio: 'Revisioni, polizze, manutenzioni', icona: 'calendar-alert', tinta: 'rosso', link: '/scadenze' },
  { titolo: 'Documenti', dettaglio: 'Regolamento, polizze, contratti', icona: 'folder-outline', tinta: 'blu', link: '/documenti' },
  { titolo: 'Storico lavori', dettaglio: 'Interventi, fatture e garanzie', icona: 'hammer-wrench', tinta: 'arancio', link: '/lavori' },
  { titolo: 'Guida', dettaglio: 'Come installare e usare l’app', icona: 'help-circle-outline', tinta: 'grigio', link: '/guida' },
  { titolo: 'Numeri utili', dettaglio: 'Idraulico, elettricista, emergenze', icona: 'phone-outline', tinta: 'verde', link: '/numeri' },
];

// Un sondaggio "sta per scadere" se mancano meno di questi giorni
const GIORNI_SONDAGGIO_IMMINENTE = 3;

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
    const oggi = new Date().toISOString().slice(0, 10);
    const tra30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const [s, a, g, so, v, p, asm, pr, ra, sc, pc] = await Promise.all([
      supabase.from('saldo').select('saldo').maybeSingle(),
      supabase.from('avvisi').select('*').order('creato_il', { ascending: false }),
      supabase.from('guasti').select('stato').neq('stato', 'chiuso'),
      supabase.from('sondaggi').select('id, domanda, chiuso, scadenza'),
      supabase.from('voti').select('sondaggio_id').eq('utente_id', id),
      supabase.from('profili').select('id', { count: 'exact', head: true }).eq('approvato', false),
      supabase
        .from('assemblee')
        .select('id, titolo, data_ora, luogo')
        .gte('data_ora', new Date().toISOString())
        .order('data_ora', { ascending: true })
        .limit(1),
      supabase.from('presenze').select('assemblea_id, risposta').eq('utente_id', id),
      // da pagare = non pagate e non ancora segnalate con "Ho pagato"
      supabase
        .from('rate')
        .select('importo, emissione:rate_emissioni(scadenza)')
        .eq('utente_id', id)
        .is('pagata_il', null)
        .is('segnalata_il', null),
      supabase.from('scadenze').select('id', { count: 'exact', head: true }).lte('data', tra30),
      // per l'amministratore: segnalazioni "Ho pagato" da confermare (gli altri vedono solo le proprie)
      supabase.from('rate').select('id', { count: 'exact', head: true }).is('pagata_il', null).not('segnalata_il', 'is', null),
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
      sondaggiInScadenza: ((so.data ?? []) as Sondaggio[])
        .filter(
          (x) =>
            aperto(x) &&
            !!x.scadenza &&
            new Date(x.scadenza).getTime() - Date.now() < GIORNI_SONDAGGIO_IMMINENTE * 86_400_000,
        )
        .sort((a, b) => a.scadenza!.localeCompare(b.scadenza!))
        .map((x) => ({ id: x.id, domanda: x.domanda, scadenza: x.scadenza!, votato: votati.has(x.id) })),
      inAttesa: p.count ?? 0,
      prossimaAssemblea: asm.error ? null : (asm.data?.[0] ?? null),
      miaRisposta: null,
      rateDaPagare: { totale: 0, inRitardo: 0, prossima: null },
      // Rate e scadenze arrivano con supabase/07-...sql: se mancano si ignorano
      scadenzeVicine: sc.error ? 0 : (sc.count ?? 0),
      pagamentiDaConfermare: pc.error ? 0 : (pc.count ?? 0),
    };
    if (!ra.error) {
      const rate = (ra.data ?? []) as unknown as { importo: number; emissione: { scadenza: string } | null }[];
      const scadenze = rate.map((r) => r.emissione?.scadenza ?? '').filter(Boolean).sort();
      dati.rateDaPagare = {
        totale: rate.reduce((t, r) => t + Number(r.importo), 0),
        inRitardo: scadenze.filter((x) => x < oggi).length,
        prossima: scadenze.find((x) => x >= oggi) ?? null,
      };
    }
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

      {/* Ricerca generale */}
      <Pressable
        onPress={() => router.push('/cerca')}
        style={[styles.cerca, { backgroundColor: tema.colors.surface, borderColor: tema.colors.outlineVariant }]}
        accessibilityLabel="Cerca in tutta l'app"
      >
        <Icon source="magnify" size={20} color={tema.colors.onSurfaceVariant} />
        <Text variant="bodyMedium" style={{ color: tema.colors.onSurfaceVariant }}>
          Cerca in avvisi, assemblee, lavori, documenti...
        </Text>
      </Pressable>

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

      {/* Sondaggi in scadenza */}
      {dati?.sondaggiInScadenza.map((so) => {
        const t = so.votato ? tinte.verde : tinte.viola;
        return (
          <Riquadro
            key={so.id}
            onPress={() => router.push(`/sondaggi/${so.id}`)}
            style={[styles.rigaAvviso, { backgroundColor: t.sfondo, borderColor: t.sfondo }]}
          >
            <Icon source={so.votato ? 'check-circle-outline' : 'vote-outline'} size={26} color={t.testo} />
            <View style={styles.flex}>
              <Text variant="labelMedium" style={{ color: t.testo }}>
                {`Sondaggio · scade ${traQuanto(so.scadenza)} alle ${ora(so.scadenza)}`}
              </Text>
              <Text variant="titleSmall" numberOfLines={2} style={{ color: t.testo }}>
                {so.domanda}
              </Text>
              <Text variant="labelLarge" style={{ color: t.testo }}>
                {so.votato ? 'Hai già votato' : 'Vota ora ›'}
              </Text>
            </View>
          </Riquadro>
        );
      })}

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

      {/* Rate da pagare */}
      {!!dati?.rateDaPagare.totale && (
        <Riquadro
          onPress={() => router.push('/rate')}
          style={[
            styles.rigaAvviso,
            {
              backgroundColor: (dati.rateDaPagare.inRitardo ? tinte.rosso : tinte.viola).sfondo,
              borderColor: (dati.rateDaPagare.inRitardo ? tinte.rosso : tinte.viola).sfondo,
            },
          ]}
        >
          <Icon source="cash-clock" size={24} color={(dati.rateDaPagare.inRitardo ? tinte.rosso : tinte.viola).testo} />
          <View style={styles.flex}>
            <Text variant="titleSmall" style={{ color: (dati.rateDaPagare.inRitardo ? tinte.rosso : tinte.viola).testo }}>
              {`Da pagare: ${euro(dati.rateDaPagare.totale)}`}
            </Text>
            <Text variant="bodySmall" style={{ color: (dati.rateDaPagare.inRitardo ? tinte.rosso : tinte.viola).testo }}>
              {dati.rateDaPagare.inRitardo
                ? `${dati.rateDaPagare.inRitardo} rat${dati.rateDaPagare.inRitardo === 1 ? 'a' : 'e'} in ritardo`
                : dati.rateDaPagare.prossima
                  ? `Entro il ${data(`${dati.rateDaPagare.prossima}T12:00:00`)}`
                  : ''}
            </Text>
          </View>
          <Icon source="chevron-right" size={20} color={(dati.rateDaPagare.inRitardo ? tinte.rosso : tinte.viola).testo} />
        </Riquadro>
      )}

      {/* Pagamenti da confermare (solo amministratore) */}
      {admin && !!dati?.pagamentiDaConfermare && (
        <Riquadro
          onPress={() => router.push('/rate')}
          style={[styles.rigaAvviso, { backgroundColor: tinte.blu.sfondo, borderColor: tinte.blu.sfondo }]}
        >
          <Icon source="cash-check" size={22} color={tinte.blu.testo} />
          <Text variant="titleSmall" style={[styles.flex, { color: tinte.blu.testo }]}>
            {dati.pagamentiDaConfermare === 1
              ? '1 pagamento da confermare'
              : `${dati.pagamentiDaConfermare} pagamenti da confermare`}
          </Text>
          <Icon source="chevron-right" size={20} color={tinte.blu.testo} />
        </Riquadro>
      )}

      {/* Scadenze vicine (solo amministratore) */}
      {admin && !!dati?.scadenzeVicine && (
        <Riquadro
          onPress={() => router.push('/scadenze')}
          style={[styles.rigaAvviso, { backgroundColor: tinte.rosso.sfondo, borderColor: tinte.rosso.sfondo }]}
        >
          <Icon source="calendar-alert" size={22} color={tinte.rosso.testo} />
          <Text variant="titleSmall" style={[styles.flex, { color: tinte.rosso.testo }]}>
            {dati.scadenzeVicine === 1 ? '1 scadenza entro 30 giorni' : `${dati.scadenzeVicine} scadenze entro 30 giorni`}
          </Text>
          <Icon source="chevron-right" size={20} color={tinte.rosso.testo} />
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

      {/* Altre sezioni */}
      <Titoletto>Il condominio</Titoletto>
      <Riquadro style={styles.elenco}>
        {ALTRE.map((v, i) => (
          <Pressable
            key={v.titolo}
            onPress={() => router.push(v.link)}
            style={({ pressed }) => [
              styles.voce,
              i > 0 && { borderTopWidth: 1, borderTopColor: tema.colors.outlineVariant },
              pressed && styles.premuto,
            ]}
          >
            <IconaTonda icona={v.icona} tinta={tinte[v.tinta]} dimensione={36} />
            <View style={styles.flex}>
              <Text variant="titleSmall">{v.titolo}</Text>
              <Nota>{v.dettaglio}</Nota>
            </View>
            <Icon source="chevron-right" size={20} color={tema.colors.onSurfaceVariant} />
          </Pressable>
        ))}
      </Riquadro>

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
  elenco: { padding: 0, gap: 0 },
  cerca: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  voce: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  premuto: { opacity: 0.7 },
  maiuscolo: { textTransform: 'uppercase', letterSpacing: 0.8 },
  rigaTessera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
