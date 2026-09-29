// Contenitore principale: tema React Native Paper, stato di login e navigazione.
// Stack.Protected mostra solo le schermate permesse:
//   - non collegato          -> accedi, registrati
//   - collegato, in attesa   -> in-attesa
//   - collegato e approvato  -> tutte le schermate dell'app
//   - amministratore         -> in più le schermate di gestione
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';

function Navigazione() {
  const { session, profilo, caricamento } = useAuth();

  if (caricamento) {
    return (
      <View style={styles.attesa}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const collegato = !!session;
  const approvato = collegato && !!profilo?.approvato;
  const admin = approvato && profilo?.ruolo === 'amministratore';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={approvato}>
        <Stack.Screen name="index" />
      </Stack.Protected>

      <Stack.Protected guard={admin}>
        <Stack.Screen name="condomini" />
      </Stack.Protected>

      <Stack.Protected guard={collegato && !approvato}>
        <Stack.Screen name="in-attesa" />
      </Stack.Protected>

      <Stack.Protected guard={!collegato}>
        <Stack.Screen name="accedi" />
        <Stack.Screen name="registrati" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <Navigazione />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  attesa: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
