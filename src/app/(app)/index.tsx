// Home: dati dell'utente e menu delle sezioni.
import { router, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Avatar, Button, Card, Text } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { useAuth } from '@/lib/auth';
import { millesimi } from '@/lib/formato';

const SEZIONI: { titolo: string; descrizione: string; icona: string; link: Href }[] = [
  { titolo: 'Bacheca avvisi', descrizione: 'Comunicazioni ufficiali', icona: 'bulletin-board', link: '/avvisi' },
  { titolo: 'Guasti', descrizione: 'Segnala un problema e seguine lo stato', icona: 'tools', link: '/guasti' },
  { titolo: 'Sondaggi', descrizione: 'Vota le decisioni comuni', icona: 'vote', link: '/sondaggi' },
  { titolo: 'Conto spese', descrizione: 'Saldo, entrate e uscite', icona: 'cash-multiple', link: '/spese' },
];

export default function Home() {
  const { profilo, esci } = useAuth();
  const admin = profilo?.ruolo === 'amministratore';

  return (
    <Pagina>
      <Text variant="headlineMedium">Condominio</Text>
      <Text variant="bodyMedium">
        {profilo?.nome ?? profilo?.email}
        {profilo?.appartamento ? ` · app. ${profilo.appartamento}` : ''}
        {profilo ? ` · ${millesimi(profilo.millesimi)} millesimi` : ''}
        {admin ? ' · Amministratore' : ''}
      </Text>

      {SEZIONI.map((s) => (
        <Card key={s.titolo} mode="elevated" onPress={() => router.push(s.link)}>
          <Card.Title
            title={s.titolo}
            subtitle={s.descrizione}
            left={(p) => <Avatar.Icon {...p} icon={s.icona} />}
          />
        </Card>
      ))}

      {admin && (
        <Card mode="outlined" onPress={() => router.push('/condomini')}>
          <Card.Title
            title="Gestione condòmini"
            subtitle="Approva registrazioni, appartamenti e millesimi"
            left={(p) => <Avatar.Icon {...p} icon="account-group" />}
          />
        </Card>
      )}

      <Button mode="text" onPress={esci} style={styles.esci}>
        Esci
      </Button>
    </Pagina>
  );
}

const styles = StyleSheet.create({
  esci: { marginTop: 8 },
});
