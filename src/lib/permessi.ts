// Permessi condivisi: l'amministratore decide quali azioni possono fare tutti i condòmini
// (tabella "impostazioni", chiavi permesso_*; vedi supabase/08-permessi-condivisi.sql).
// Il database controlla comunque tutto: qui serve solo a mostrare o nascondere i pulsanti.
import { useCallback } from 'react';

import { useAuth } from './auth';
import { supabase } from './supabase';
import { useDati } from './useDati';

export type Azione = 'guasti_stato' | 'numeri' | 'documenti' | 'lavori' | 'scadenze';

export const AZIONI: { azione: Azione; titolo: string; descrizione: string }[] = [
  { azione: 'guasti_stato', titolo: 'Stato dei guasti', descrizione: 'Segnare un guasto in lavorazione o risolto e scrivere la nota' },
  { azione: 'numeri', titolo: 'Numeri utili', descrizione: 'Aggiungere e modificare i numeri utili' },
  { azione: 'documenti', titolo: 'Documenti', descrizione: 'Caricare documenti nell’archivio' },
  { azione: 'lavori', titolo: 'Storico lavori', descrizione: 'Registrare lavori, cambiarne lo stato, allegare fatture' },
  { azione: 'scadenze', titolo: 'Scadenze', descrizione: 'Aggiungere scadenze e segnarle come fatte' },
];

export function usePermessi() {
  const { profilo } = useAuth();
  const admin = profilo?.ruolo === 'amministratore';
  const leggi = useCallback(
    () => supabase.from('impostazioni').select('chiave, valore').like('chiave', 'permesso_%'),
    [],
  );
  const { dati, ricarica } = useDati(leggi);
  const aperta = (a: Azione) => (dati ?? []).some((x) => x.chiave === `permesso_${a}` && x.valore === 'tutti');
  return {
    // può fare l'azione? (l'amministratore sempre)
    puo: (a: Azione) => admin || aperta(a),
    aperta,
    ricarica,
  };
}
