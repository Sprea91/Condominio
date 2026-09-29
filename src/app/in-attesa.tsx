// Mostrata a chi si è registrato ma non è ancora stato approvato dall'amministratore.
import { useState } from 'react';
import { Button, Text } from 'react-native-paper';

import { Benvenuto } from '@/components/Benvenuto';
import { useAuth } from '@/lib/auth';

export default function InAttesa() {
  const { profilo, ricaricaProfilo, esci } = useAuth();
  const [inCorso, setInCorso] = useState(false);

  async function controlla() {
    setInCorso(true);
    await ricaricaProfilo();
    setInCorso(false);
  }

  return (
    <Benvenuto titolo="Quasi fatto!" testo={`Ciao${profilo?.nome ? ` ${profilo.nome}` : ''}, la tua registrazione è arrivata.`}>
      <Text variant="bodyMedium">
        L’amministratore deve approvarla prima che tu possa usare l’app. Riprova più tardi.
      </Text>
      <Button mode="contained" icon="refresh" onPress={controlla} loading={inCorso} disabled={inCorso}>
        Controlla di nuovo
      </Button>
      <Button mode="text" onPress={esci}>
        Esci
      </Button>
    </Benvenuto>
  );
}
