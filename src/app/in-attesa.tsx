// Mostrata a chi si è registrato ma non è ancora stato approvato dall'amministratore.
import { useState } from 'react';
import { Button, Text } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
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
    <Pagina centrata>
      <Text variant="headlineSmall">In attesa di approvazione</Text>
      <Text variant="bodyMedium">
        Ciao{profilo?.nome ? ` ${profilo.nome}` : ''}, la tua registrazione è arrivata.
        L'amministratore deve approvarla prima che tu possa usare l'app.
      </Text>
      <Button mode="contained" onPress={controlla} loading={inCorso} disabled={inCorso}>
        Controlla di nuovo
      </Button>
      <Button mode="text" onPress={esci}>
        Esci
      </Button>
    </Pagina>
  );
}
