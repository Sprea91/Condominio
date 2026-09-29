// Schermate dell'app vera e propria (solo utenti approvati, vedi ../_layout.tsx).
// Quelle di gestione sono visibili solo all'amministratore.
import { Stack } from 'expo-router';

import { useAuth } from '@/lib/auth';

export default function LayoutApp() {
  const { profilo } = useAuth();
  const admin = profilo?.ruolo === 'amministratore';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="avvisi/index" />
      <Stack.Screen name="guasti/index" />
      <Stack.Screen name="guasti/nuovo" />
      <Stack.Screen name="guasti/[id]" />
      <Stack.Screen name="sondaggi/index" />
      <Stack.Screen name="sondaggi/[id]" />
      <Stack.Screen name="spese/index" />

      <Stack.Protected guard={admin}>
        <Stack.Screen name="condomini" />
        <Stack.Screen name="avvisi/nuovo" />
        <Stack.Screen name="sondaggi/nuovo" />
        <Stack.Screen name="spese/nuovo" />
      </Stack.Protected>
    </Stack>
  );
}
