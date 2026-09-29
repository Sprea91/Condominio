// Schermate dell'app vera e propria (solo utenti approvati, vedi ../_layout.tsx).
// Quelle di gestione sono visibili solo all'amministratore.
import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { useAuth } from '@/lib/auth';

export default function LayoutApp() {
  const { profilo } = useAuth();
  const tema = useTheme();
  const admin = profilo?.ruolo === 'amministratore';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profilo" />
      <Stack.Screen name="cerca" />
      <Stack.Screen name="avvisi/index" />
      <Stack.Screen name="guasti/index" />
      <Stack.Screen name="guasti/nuovo" />
      <Stack.Screen name="guasti/[id]" />
      <Stack.Screen name="sondaggi/index" />
      <Stack.Screen name="sondaggi/[id]" />
      <Stack.Screen name="spese/index" />
      <Stack.Screen name="assemblee/index" />
      <Stack.Screen name="assemblee/[id]" />
      <Stack.Screen name="documenti" />
      <Stack.Screen name="numeri" />
      <Stack.Screen name="lavori/index" />
      <Stack.Screen name="lavori/[id]" />
      <Stack.Screen name="lavori/nuovo" />
      <Stack.Screen name="rate/index" />
      <Stack.Screen name="scadenze" />
      <Stack.Screen name="preventivi/index" />
      <Stack.Screen name="preventivi/nuova" />
      <Stack.Screen name="preventivi/[id]" />

      <Stack.Protected guard={admin}>
        <Stack.Screen name="condomini" />
        <Stack.Screen name="avvisi/nuovo" />
        <Stack.Screen name="sondaggi/nuovo" />
        <Stack.Screen name="spese/nuovo" />
        <Stack.Screen name="assemblee/nuova" />
        <Stack.Screen name="rate/nuova" />
        <Stack.Screen name="rate/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
