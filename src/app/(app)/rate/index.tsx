// Le mie rate: quanto devo, entro quando, cosa ho già pagato, e come pagare (IBAN).
// L'amministratore vede in più l'elenco delle rate emesse con l'incassato.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, Text, TextInput, useTheme } from 'react-native-paper';

import { BottoneConferma } from '@/components/BottoneConferma';
import { Pagina } from '@/components/Pagina';
import { SceltaFile } from '@/components/SceltaFile';
import { BottoneNuovo, Errore, Etichetta, IconaTonda, Nota, Riquadro, Titoletto, Vuoto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { copia } from '@/lib/copia';
import { apriFile, caricaFile, eliminaFile, TIPI_IMMAGINE_PDF, type FileScelto } from '@/lib/file';
import { data, euro } from '@/lib/formato';
import { causaleBonifico, statoRata } from '@/lib/rate';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { EmissioneRate, Rata } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

type Dati = {
  mie: (Rata & { emissione: EmissioneRate })[];
  emissioni: (EmissioneRate & { rate: { importo: number; pagata_il: string | null; segnalata_il?: string | null }[] })[];
  iban: string;
  intestatario: string;
};

function ModificaIban({ iban, intestatario, onSalvato }: { iban: string; intestatario: string; onSalvato: () => void }) {
  const [nuovoIban, setNuovoIban] = useState(iban);
  const [nuovoIntestatario, setNuovoIntestatario] = useState(intestatario);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    setInCorso(true);
    const { error } = await supabase.from('impostazioni').upsert([
      { chiave: 'iban', valore: nuovoIban.replace(/\s/g, '').toUpperCase() || null },
      { chiave: 'intestatario', valore: nuovoIntestatario.trim() || null },
    ]);
    setInCorso(false);
    if (error) setErrore(`Errore: ${error.message}`);
    else onSalvato();
  }

  return (
    <Riquadro evidenziato>
      <Text variant="titleSmall">Dati per il pagamento</Text>
      <TextInput label="IBAN del condominio" mode="outlined" value={nuovoIban} onChangeText={setNuovoIban} autoCapitalize="characters" />
      <TextInput label="Intestato a" mode="outlined" value={nuovoIntestatario} onChangeText={setNuovoIntestatario} />
      <Errore testo={errore} />
      <Button mode="contained" onPress={salva} loading={inCorso} disabled={inCorso}>
        Salva
      </Button>
    </Riquadro>
  );
}

// Rata da pagare con il pulsante "Ho pagato" (nota facoltativa + ricevuta facoltativa)
function RataDaPagare({
  rata,
  inRitardo,
  onSegnalata,
}: {
  rata: Rata & { emissione: EmissioneRate };
  inRitardo: boolean;
  onSegnalata: () => void;
}) {
  const { session, profilo } = useAuth();
  const tinte = useTinte();
  const tema = useTheme();
  const [aperto, setAperto] = useState(false);
  const [copiata, setCopiata] = useState(false);
  const causale = causaleBonifico(rata.emissione.causale, rata.emissione.titolo, profilo);

  async function copiaCausale() {
    if (await copia(causale)) {
      setCopiata(true);
      setTimeout(() => setCopiata(false), 2000);
    }
  }
  const [nota, setNota] = useState('');
  const [ricevuta, setRicevuta] = useState<FileScelto[]>([]);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function segnala() {
    setErrore('');
    setInCorso(true);
    try {
      const f = ricevuta[0];
      const percorso = f ? await caricaFile('ricevute', `${session!.user.id}/${rata.id}`, f) : null;
      const { error } = await supabase.rpc('segnala_pagamento', {
        p_rata: rata.id,
        p_nota: nota.trim() || null,
        p_ricevuta_path: percorso,
        p_ricevuta_nome: f?.nome ?? null,
      });
      if (error)
        throw new Error(
          error.code === 'PGRST202'
            ? 'Funzione non ancora attiva: l’amministratore deve eseguire supabase/10-...sql.'
            : error.message,
        );
      onSegnalata();
    } catch (e) {
      setErrore(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Riquadro>
      <View style={styles.riga}>
        <IconaTonda
          icona={inRitardo ? 'alert-circle-outline' : 'calendar-clock'}
          tinta={inRitardo ? tinte.rosso : tinte.arancio}
          dimensione={40}
        />
        <View style={styles.flex}>
          <Text variant="titleSmall">{rata.emissione.titolo}</Text>
          <Nota>
            {inRitardo ? 'Scaduta il ' : 'Entro il '}
            {data(rata.emissione.scadenza)}
          </Nota>
        </View>
        <Text variant="titleMedium">{euro(rata.importo)}</Text>
      </View>
      <View style={[styles.causale, { backgroundColor: tema.colors.surfaceVariant }]}>
        <View style={styles.flex}>
          <Nota>Causale del bonifico</Nota>
          <Text variant="bodyMedium" selectable>
            {causale}
          </Text>
        </View>
        <Button compact icon={copiata ? 'check' : 'content-copy'} onPress={copiaCausale}>
          {copiata ? 'Copiata' : 'Copia'}
        </Button>
      </View>
      {!aperto ? (
        <Button mode="contained-tonal" icon="check" onPress={() => setAperto(true)}>
          Ho pagato
        </Button>
      ) : (
        <>
          <Nota>L’amministratore riceverà la tua segnalazione e confermerà il pagamento.</Nota>
          <TextInput
            label="Nota (facoltativa, es. bonifico del 12/03, CRO...)"
            mode="outlined"
            dense
            value={nota}
            onChangeText={setNota}
          />
          <SceltaFile
            file={ricevuta}
            onCambia={setRicevuta}
            tipi={TIPI_IMMAGINE_PDF}
            etichetta="Allega la ricevuta (facoltativa)"
            multipli={false}
          />
          <Errore testo={errore} />
          <View style={styles.azioni}>
            <Button onPress={() => setAperto(false)} disabled={inCorso}>
              Annulla
            </Button>
            <Button mode="contained" onPress={segnala} loading={inCorso} disabled={inCorso}>
              Invia segnalazione
            </Button>
          </View>
        </>
      )}
    </Riquadro>
  );
}

// Rata segnalata come pagata, in attesa che l'amministratore confermi
function RataInVerifica({ rata, onAnnullata }: { rata: Rata & { emissione: EmissioneRate }; onAnnullata: () => void }) {
  const tinte = useTinte();
  async function annulla() {
    await supabase.rpc('annulla_segnalazione', { p_rata: rata.id });
    if (rata.ricevuta_path) await eliminaFile('ricevute', [rata.ricevuta_path]);
    onAnnullata();
  }
  return (
    <Riquadro>
      <View style={styles.riga}>
        <IconaTonda icona="timer-sand" tinta={tinte.blu} dimensione={40} />
        <View style={styles.flex}>
          <Text variant="titleSmall">{rata.emissione.titolo}</Text>
          <Nota>Segnalata il {data(rata.segnalata_il!)} · in attesa di conferma</Nota>
          {!!rata.segnalata_nota && <Nota>{rata.segnalata_nota}</Nota>}
        </View>
        <Text variant="titleMedium">{euro(rata.importo)}</Text>
      </View>
      <View style={styles.azioni}>
        {rata.ricevuta_path && (
          <Button compact icon="receipt" onPress={() => apriFile('ricevute', rata.ricevuta_path!)}>
            Ricevuta
          </Button>
        )}
        <BottoneConferma etichetta="Ritira segnalazione" conferma="Ritira" onConferma={annulla} />
      </View>
    </Riquadro>
  );
}

export default function Rate() {
  const { profilo } = useAuth();
  const tema = useTheme();
  const tinte = useTinte();
  const admin = profilo?.ruolo === 'amministratore';
  const [modificaIban, setModificaIban] = useState(false);
  const [copiato, setCopiato] = useState(false);

  const leggi = useCallback(async () => {
    const [m, e, imp] = await Promise.all([
      supabase.from('rate').select('*, emissione:rate_emissioni(*)').eq('utente_id', profilo?.id ?? ''),
      admin
        ? supabase.from('rate_emissioni').select('*, rate(*)').order('scadenza', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase.from('impostazioni').select('chiave, valore'),
    ]);
    const error = m.error ?? e.error ?? imp.error;
    if (error) return { data: null, error };
    const valore = (k: string) => (imp.data ?? []).find((x) => x.chiave === k)?.valore ?? '';
    const dati: Dati = {
      mie: ((m.data ?? []) as Dati['mie']).sort((a, b) => b.emissione.scadenza.localeCompare(a.emissione.scadenza)),
      emissioni: (e.data ?? []) as Dati['emissioni'],
      iban: valore('iban'),
      intestatario: valore('intestatario'),
    };
    return { data: dati, error: null };
  }, [profilo?.id, admin]);
  const { dati, errore, ricarica, aggiorna, aggiornamento } = useDati(leggi);

  const conStato = (dati?.mie ?? []).map((r) => ({
    ...r,
    stato: statoRata({ pagata_il: r.pagata_il, segnalata_il: r.segnalata_il, scadenza: r.emissione.scadenza }),
  }));
  // "da pagare" = non pagate e non ancora segnalate; quelle segnalate aspettano la conferma
  const daPagare = conStato
    .filter((r) => r.stato === 'da_pagare' || r.stato === 'in_ritardo')
    .sort((a, b) => a.emissione.scadenza.localeCompare(b.emissione.scadenza));
  const inVerifica = conStato.filter((r) => r.stato === 'in_verifica');
  const pagate = conStato.filter((r) => r.stato === 'pagata');
  const totaleDovuto = daPagare.reduce((t, r) => t + Number(r.importo), 0);
  const inRitardo = daPagare.filter((r) => r.stato === 'in_ritardo').length;

  async function copiaIban() {
    if (dati?.iban && (await copia(dati.iban))) {
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    }
  }

  return (
    <Pagina
      titolo="Le mie rate"
      onAggiorna={aggiorna}
      aggiornamento={aggiornamento}
      fisso={admin && <BottoneNuovo etichetta="Nuova rata" onPress={() => router.push('/rate/nuova')} />}
    >
      <Errore testo={errore} />
      {dati === null && !errore && <ActivityIndicator style={styles.caricamento} />}

      {dati && (
        <>
          {/* Riepilogo */}
          <Riquadro
            style={{
              backgroundColor: (inRitardo ? tinte.rosso : totaleDovuto ? tinte.arancio : tinte.verde).sfondo,
              borderColor: (inRitardo ? tinte.rosso : totaleDovuto ? tinte.arancio : tinte.verde).sfondo,
            }}
          >
            {(() => {
              const t = inRitardo ? tinte.rosso : totaleDovuto ? tinte.arancio : tinte.verde;
              return (
                <>
                  <Text variant="labelLarge" style={{ color: t.testo }}>
                    {totaleDovuto ? 'Da pagare' : 'Sei in regola'}
                  </Text>
                  <Text variant="displaySmall" style={{ color: t.testo }}>
                    {euro(totaleDovuto)}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: t.testo }}>
                    {inRitardo
                      ? `${inRitardo} rat${inRitardo === 1 ? 'a' : 'e'} in ritardo`
                      : !daPagare.length && inVerifica.length
                        ? `${inVerifica.length} pagament${inVerifica.length === 1 ? 'o' : 'i'} in attesa di conferma`
                      : daPagare[0]
                        ? `Prossima scadenza: ${data(daPagare[0].emissione.scadenza)}`
                        : 'Nessuna rata da pagare'}
                  </Text>
                </>
              );
            })()}
          </Riquadro>

          {/* Come pagare */}
          {(dati.iban || admin) && !modificaIban && (
            <Riquadro>
              <View style={styles.riga}>
                <IconaTonda icona="bank-outline" tinta={tinte.blu} dimensione={40} />
                <View style={styles.flex}>
                  <Nota>Paga con bonifico a{dati.intestatario ? ` ${dati.intestatario}` : ''}</Nota>
                  <Text variant="titleSmall" selectable>
                    {dati.iban ? dati.iban.replace(/(.{4})/g, '$1 ').trim() : 'IBAN non ancora inserito'}
                  </Text>
                </View>
              </View>
              <View style={styles.azioni}>
                {admin && (
                  <Button compact icon="pencil-outline" onPress={() => setModificaIban(true)}>
                    Modifica
                  </Button>
                )}
                {!!dati.iban && (
                  <Button compact mode="contained-tonal" icon={copiato ? 'check' : 'content-copy'} onPress={copiaIban}>
                    {copiato ? 'Copiato' : 'Copia IBAN'}
                  </Button>
                )}
              </View>
            </Riquadro>
          )}
          {modificaIban && (
            <ModificaIban
              iban={dati.iban}
              intestatario={dati.intestatario}
              onSalvato={() => {
                setModificaIban(false);
                ricarica();
              }}
            />
          )}

          {conStato.length === 0 && (
            <Vuoto icona="cash-check" titolo="Nessuna rata" testo="Quando l’amministratore emetterà una rata la troverai qui." />
          )}

          {daPagare.length > 0 && <Titoletto>Da pagare</Titoletto>}
          {daPagare.map((r) => (
            <RataDaPagare key={r.id} rata={r} inRitardo={r.stato === 'in_ritardo'} onSegnalata={ricarica} />
          ))}

          {inVerifica.length > 0 && <Titoletto>In attesa di conferma</Titoletto>}
          {inVerifica.map((r) => (
            <RataInVerifica key={r.id} rata={r} onAnnullata={ricarica} />
          ))}

          {pagate.length > 0 && <Titoletto>Pagate</Titoletto>}
          {pagate.map((r) => (
            <Riquadro key={r.id} style={styles.riga}>
              <IconaTonda icona="check-circle-outline" tinta={tinte.verde} dimensione={40} />
              <View style={styles.flex}>
                <Text variant="titleSmall">{r.emissione.titolo}</Text>
                <Nota>Pagata il {data(r.pagata_il!)}</Nota>
              </View>
              <Text variant="titleMedium" style={{ color: tinte.verde.testo }}>
                {euro(r.importo)}
              </Text>
            </Riquadro>
          ))}

          {/* Gestione (amministratore) */}
          {admin && (
            <>
              <Titoletto>Gestione rate emesse</Titoletto>
              {dati.emissioni.length === 0 && <Nota>Nessuna rata emessa. Usa “Nuova rata” in basso.</Nota>}
              {dati.emissioni.map((e) => {
                const incassato = e.rate.filter((r) => r.pagata_il).reduce((t, r) => t + Number(r.importo), 0);
                const pagati = e.rate.filter((r) => r.pagata_il).length;
                const quota = Number(e.totale) > 0 ? incassato / Number(e.totale) : 0;
                const completa = pagati === e.rate.length && e.rate.length > 0;
                const daConfermare = e.rate.filter((r) => !r.pagata_il && r.segnalata_il).length;
                return (
                  <Riquadro key={e.id} onPress={() => router.push(`/rate/${e.id}`)}>
                    <View style={styles.riga}>
                      <View style={styles.flex}>
                        <Text variant="titleSmall">{e.titolo}</Text>
                        <Nota>Scadenza {data(e.scadenza)}</Nota>
                      </View>
                      {daConfermare > 0 && <Etichetta testo={`${daConfermare} da confermare`} tinta={tinte.blu} icona="timer-sand" />}
                      <Etichetta
                        testo={`${pagati}/${e.rate.length} pagate`}
                        tinta={completa ? tinte.verde : e.scadenza < new Date().toISOString().slice(0, 10) ? tinte.rosso : tinte.arancio}
                      />
                      <Icon source="chevron-right" size={20} color={tema.colors.onSurfaceVariant} />
                    </View>
                    <View style={[styles.barra, { backgroundColor: tema.colors.surfaceVariant }]}>
                      <View style={[styles.riempimento, { width: `${Math.round(quota * 100)}%`, backgroundColor: tinte.verde.testo }]} />
                    </View>
                    <Nota>
                      Incassati {euro(incassato)} su {euro(e.totale)}
                    </Nota>
                  </Riquadro>
                );
              })}
            </>
          )}
        </>
      )}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 2 },
  azioni: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  causale: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10 },
  riempimento: { height: '100%', borderRadius: 4 },
});
