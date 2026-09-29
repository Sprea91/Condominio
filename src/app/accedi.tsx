// Schermata di accesso con email e password.
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, TextInput } from 'react-native-paper';

import { Benvenuto, CampoPassword } from '@/components/Benvenuto';
import { Errore } from '@/components/ui';
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
    <Benvenuto titolo="Condominio" testo="Avvisi, guasti, sondaggi e conti del tuo condominio.">
      <TextInput
        label="Email"
        mode="outlined"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        left={<TextInput.Icon icon="email-outline" />}
      />
      <CampoPassword label="Password" value={password} onChangeText={setPassword} onSubmitEditing={accedi} />
      <Errore testo={errore} />
      <Button mode="contained" onPress={accedi} loading={inCorso} disabled={inCorso} contentStyle={{ height: 48 }}>
        Accedi
      </Button>
      <Button mode="text" compact onPress={() => router.push('/recupera-password')}>
        Password dimenticata?
      </Button>
      <Button mode="outlined" onPress={() => router.replace('/registrati')}>
        Non hai un account? Registrati
      </Button>
      <Button mode="text" icon="help-circle-outline" onPress={() => router.push('/guida')}>
        Come installare e usare l’app
      </Button>
    </Benvenuto>
  );
}
