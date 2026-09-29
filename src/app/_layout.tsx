// Contenitore principale: font, tema grafico (chiaro/scuro), stato di login e navigazione.
// Stack.Protected mostra solo le schermate permesse:
//   - non collegato            -> accedi, registrati, recupera-password
//   - arrivato dal link email  -> nuova-password
//   - collegato, in attesa     -> in-attesa
//   - collegato e approvato    -> le schermate in (app)/ (vedi (app)/_layout.tsx)
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, PaperProvider, useTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { useTemaDiSistema } from '@/lib/tema';

function Navigazione() {
  const { session, profilo, caricamento, recupero } = useAuth();
  const tema = useTheme();

  if (caricamento) {
    return (
      <View style={[styles.attesa, { backgroundColor: tema.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const collegato = !!session;
  const approvato = collegato && !!profilo?.approvato;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.colors.background } }}>
      <Stack.Protected guard={collegato && recupero}>
        <Stack.Screen name="nuova-password" />
      </Stack.Protected>

      <Stack.Protected guard={approvato && !recupero}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={collegato && !approvato && !recupero}>
        <Stack.Screen name="in-attesa" />
      </Stack.Protected>

      <Stack.Protected guard={!collegato}>
        <Stack.Screen name="accedi" />
        <Stack.Screen name="registrati" />
        <Stack.Screen name="recupera-password" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const tema = useTemaDiSistema();
  const [fontPronti] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  return (
    <SafeAreaProvider>
      <PaperProvider theme={tema}>
        <StatusBar style={tema.dark ? 'light' : 'dark'} />
        {fontPronti ? (
          <AuthProvider>
            <Navigazione />
          </AuthProvider>
        ) : (
          <View style={[styles.attesa, { backgroundColor: tema.colors.background }]} />
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  attesa: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
