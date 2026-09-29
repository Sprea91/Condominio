// Home provvisoria per gli utenti approvati: qui arriveranno le sezioni dell'app.
import { Button, Card, Text } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { profilo, esci } = useAuth();
  const admin = profilo?.ruolo === 'amministratore';

  return (
    <Pagina>
      <Text variant="headlineMedium">Condominio</Text>
      <Card>
        <Card.Title title={profilo?.nome ?? profilo?.email} subtitle={admin ? 'Amministratore' : 'Condòmino'} />
        <Card.Content>
          <Text variant="bodyMedium">Appartamento: {profilo?.appartamento ?? 'non assegnato'}</Text>
          <Text variant="bodyMedium">Millesimi: {profilo?.millesimi}</Text>
        </Card.Content>
      </Card>
      <Text variant="bodyMedium">Le sezioni (avvisi, guasti, sondaggi, spese) arriveranno qui.</Text>
      <Button mode="outlined" onPress={esci}>
        Esci
      </Button>
    </Pagina>
  );
}
