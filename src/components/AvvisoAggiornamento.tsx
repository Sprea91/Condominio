// Barra in basso "È disponibile una nuova versione – Aggiorna".
// Controlla all'apertura, ogni 10 minuti e quando si torna sull'app.
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Snackbar } from 'react-native-paper';

import { aggiorna, ceNuovaVersione } from '@/lib/aggiornamenti';

export function AvvisoAggiornamento() {
  const [nuova, setNuova] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let attivo = true;
    const controlla = () =>
      ceNuovaVersione().then((c) => {
        if (attivo && c) setNuova(true);
      });
    controlla();
    const ogni10minuti = setInterval(controlla, 10 * 60 * 1000);
    const ritorno = AppState.addEventListener('change', (s) => {
      if (s === 'active') controlla();
    });
    return () => {
      attivo = false;
      clearInterval(ogni10minuti);
      ritorno.remove();
    };
  }, []);

  return (
    <Snackbar
      visible={nuova}
      onDismiss={() => setNuova(false)}
      duration={Number.MAX_SAFE_INTEGER}
      action={{ label: 'Aggiorna', onPress: aggiorna }}
    >
      È disponibile una nuova versione dell’app.
    </Snackbar>
  );
}
