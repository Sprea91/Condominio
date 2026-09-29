// Schermata di accesso con email e password.
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { messaggioErrore } from '@/lib/errori';
import { supabase } from '@/lib/supabase';

export default function Accedi() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function accedi() {
    setErrore('');
    if (!email.trim() || !password) {
      setErrore('Inserisci email e password.');
      return;
    }
    setInCorso(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setInCorso(false);
    // Se va a buon fine non serve fare altro: la navigazione cambia schermata da sola.
    if (error) setErrore(messaggioErrore(error));
  }

  return (
    <Pagina centrata>
      <Text variant="headlineMedium">Condominio</Text>
      <Text variant="bodyMedium">Accedi con la tua email e password.</Text>

      <TextInput
        label="Email"
        mode="outlined"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <TextInput
        label="Password"
        mode="outlined"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        onSubmitEditing={accedi}
      />
      <HelperText type="error" visible={!!errore}>
        {errore}
      </HelperText>

      <Button mode="contained" onPress={accedi} loading={inCorso} disabled={inCorso}>
        Accedi
      </Button>
      <Button mode="text" onPress={() => router.replace('/registrati')}>Non hai un account? Registrati</Button>
    </Pagina>
  );
}
