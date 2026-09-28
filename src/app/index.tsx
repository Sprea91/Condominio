// Schermata provvisoria: serve solo a verificare che l'app si apra su Expo Go.
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Condominio</Text>
      <Text variant="bodyMedium">L'app funziona!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
});
