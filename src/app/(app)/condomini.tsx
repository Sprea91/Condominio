// Gestione condòmini (solo amministratore): approva le registrazioni,
// assegna appartamento e millesimi, controlla che il totale faccia 1000.
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';

import { PannelloPermessi } from '@/components/PannelloPermessi';
import { Pagina } from '@/components/Pagina';
import { SchedaCondomino } from '@/components/SchedaCondomino';
import { Errore, Nota, Riquadro, Titoletto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { millesimi as millesimiFmt } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import { useTinte } from '@/lib/tema';
import type { Contatti, Profilo } from '@/lib/tipi';

// Ordina "1, 2, 10" come numeri e non come testo ("1, 10, 2")
function perAppartamento(a: Profilo, b: Profilo) {
  return (a.appartamento ?? '').localeCompare(b.appartamento ?? '', 'it', { numeric: true });
}

export default function Condomini() {
  const { profilo: io, ricaricaProfilo } = useAuth();
  const tinte = useTinte();
  const [profili, setProfili] = useState<Profilo[] | null>(null);
  const [contatti, setContatti] = useState<Map<string, Contatti>>(new Map());
  const [errore, setErrore] = useState('');

  const carica = useCallback(async () => {
    const { data, error } = await supabase.from('profili').select('*');
    if (error) {
      setErrore(`Errore nel caricamento: ${error.message}`);
      return;
    }
    setProfili(((data ?? []) as Profilo[]).sort(perAppartamento));
    // Contatti riservati (tabella di supabase/05-...sql; se manca, semplicemente non si mostrano)
    const c = await supabase.from('profili_contatti').select('*');
    if (!c.error) setContatti(new Map(((c.data ?? []) as Contatti[]).map((x) => [x.id, x])));
  }, []);

  useEffect(() => {
    // Lettura dal database: lo stato cambia solo quando arrivano i dati (dopo l'await)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carica();
  }, [carica]);

  function dopoModifica() {
    carica();
    ricaricaProfilo(); // se ho modificato me stesso, aggiorna anche la Home
  }

  const inAttesa = profili?.filter((p) => !p.approvato) ?? [];
  const attivi = profili?.filter((p) => p.approvato) ?? [];
  const totaleMillesimi = attivi.reduce((somma, p) => somma + Number(p.millesimi), 0);
  const totaleOk = Math.abs(totaleMillesimi - 1000) < 0.001;

  return (
    <Pagina titolo="Gestione condòmini" sottotitolo={profili ? `${attivi.length} attivi · ${inAttesa.length} in attesa` : undefined}>
      <Errore testo={errore} />
      {profili === null && !errore && <ActivityIndicator style={styles.caricamento} />}

      {profili !== null && (
        <>
          <Titoletto>In attesa di approvazione</Titoletto>
          {inAttesa.length === 0 && <Nota>Nessuna richiesta in sospeso.</Nota>}
          {inAttesa.map((p) => (
            <SchedaCondomino key={p.id} profilo={p} sonoIo={p.id === io?.id} contatti={contatti.get(p.id)} onModificato={dopoModifica} />
          ))}

          <Titoletto>Condòmini attivi</Titoletto>
          <Riquadro
            style={[
              styles.riga,
              { backgroundColor: (totaleOk ? tinte.verde : tinte.arancio).sfondo, borderColor: (totaleOk ? tinte.verde : tinte.arancio).sfondo },
            ]}
          >
            <Icon
              source={totaleOk ? 'check-circle-outline' : 'alert-outline'}
              size={22}
              color={(totaleOk ? tinte.verde : tinte.arancio).testo}
            />
            <Text variant="titleSmall" style={[styles.flex, { color: (totaleOk ? tinte.verde : tinte.arancio).testo }]}>
              {totaleOk
                ? 'Totale millesimi: 1000'
                : `Totale millesimi: ${millesimiFmt(totaleMillesimi)} (dovrebbe essere 1000)`}
            </Text>
          </Riquadro>
          {attivi.map((p) => (
            <SchedaCondomino key={p.id} profilo={p} sonoIo={p.id === io?.id} contatti={contatti.get(p.id)} onModificato={dopoModifica} />
          ))}

          <PannelloPermessi />
        </>
      )}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  caricamento: { marginTop: 32 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
});
