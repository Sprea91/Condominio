// Gestione condòmini (solo amministratore): approva le registrazioni,
// assegna appartamento e millesimi, controlla che il totale faccia 1000.
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Text } from 'react-native-paper';

import { Intestazione } from '@/components/Intestazione';
import { Pagina } from '@/components/Pagina';
import { SchedaCondomino } from '@/components/SchedaCondomino';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Profilo } from '@/lib/tipi';

// Ordina "1, 2, 10" come numeri e non come testo ("1, 10, 2")
function perAppartamento(a: Profilo, b: Profilo) {
  return (a.appartamento ?? '').localeCompare(b.appartamento ?? '', 'it', { numeric: true });
}

export default function Condomini() {
  const { profilo: io, ricaricaProfilo } = useAuth();
  const [profili, setProfili] = useState<Profilo[] | null>(null);
  const [errore, setErrore] = useState('');

  const carica = useCallback(async () => {
    const { data, error } = await supabase.from('profili').select('*');
    if (error) {
      setErrore(`Errore nel caricamento: ${error.message}`);
      return;
    }
    setProfili(((data ?? []) as Profilo[]).sort(perAppartamento));
  }, []);

  useEffect(() => {
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
    <View style={styles.fondo}>
      <Intestazione titolo="Gestione condòmini" />
      <Pagina>
        {!!errore && <Text style={styles.errore}>{errore}</Text>}
        {profili === null && !errore && <ActivityIndicator />}

        {profili !== null && (
          <>
            <Text variant="titleMedium">In attesa di approvazione ({inAttesa.length})</Text>
            {inAttesa.length === 0 && <Text variant="bodyMedium">Nessuna richiesta.</Text>}
            {inAttesa.map((p) => (
              <SchedaCondomino key={p.id} profilo={p} sonoIo={p.id === io?.id} onModificato={dopoModifica} />
            ))}

            <Text variant="titleMedium" style={styles.titolo}>
              Condòmini attivi ({attivi.length})
            </Text>
            <Banner visible={!totaleOk} icon="alert">
              {`Il totale dei millesimi è ${totaleMillesimi.toLocaleString('it-IT')} invece di 1000.`}
            </Banner>
            {totaleOk && <Text variant="bodyMedium">Totale millesimi: 1000 ✓</Text>}
            {attivi.map((p) => (
              <SchedaCondomino key={p.id} profilo={p} sonoIo={p.id === io?.id} onModificato={dopoModifica} />
            ))}
          </>
        )}
      </Pagina>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  titolo: { marginTop: 16 },
  errore: { color: '#B3261E' },
});
