// Mostrata a chi si è registrato ma non è ancora stato approvato dall'amministratore.
// Controlla da sola ogni 20 secondi e quando si torna sull'app: appena approvato, si entra
// automaticamente (la navigazione cambia schermata da sola quando il profilo risulta approvato).
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { Benvenuto } from '@/components/Benvenuto';
import { Nota } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function InAttesa() {
  const { profilo, ricaricaProfilo, esci } = useAuth();
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    const ogni20secondi = setInterval(ricaricaProfilo, 20_000);
    const ritorno = AppState.addEventListener('change', (s) => {
      if (s === 'active') ricaricaProfilo();
    });
    return () => {
      clearInterval(ogni20secondi);
      ritorno.remove();
    };
  }, [ricaricaProfilo]);

  async function controlla() {
    setInCorso(true);
    await ricaricaProfilo();
    setInCorso(false);
  }

  return (
    <Benvenuto titolo="Quasi fatto!" testo={`Ciao${profilo?.nome ? ` ${profilo.nome}` : ''}, la tua registrazione è arrivata.`}>
      <Text variant="bodyMedium">
        L’amministratore la vede nella sua app e deve approvarla prima che tu possa entrare.
      </Text>
      <Nota>
        Non serve fare altro: appena sarai approvato, questa pagina si aprirà da sola. Puoi anche chiudere l’app e
        riaprirla più tardi.
      </Nota>
      <Button mode="contained" icon="refresh" onPress={controlla} loading={inCorso} disabled={inCorso}>
        Controlla adesso
      </Button>
      <Button mode="text" onPress={esci}>
        Esci
      </Button>
    </Benvenuto>
  );
}
