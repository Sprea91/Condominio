// "Password dimenticata": invia un'email con il link per sceglierne una nuova.
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Text, TextInput } from 'react-native-paper';

import { Benvenuto } from '@/components/Benvenuto';
import { Errore } from '@/components/ui';
import { messaggioErrore } from '@/lib/errori';
import { INDIRIZZO_SITO } from '@/lib/recupero';
import { supabase } from '@/lib/supabase';

export default function RecuperaPassword() {
  const [email, setEmail] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');
  const [inviata, setInviata] = useState(false);

  async function invia() {
    setErrore('');
    if (!email.trim()) {
      setErrore('Inserisci la tua email.');
      return;
    }
    setInCorso(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: INDIRIZZO_SITO });
    setInCorso(false);
    if (error) setErrore(messaggioErrore(error));
    else setInviata(true);
  }

  if (inviata) {
    return (
      <Benvenuto titolo="Email inviata">
        <Text variant="bodyMedium">
          Se l’indirizzo è registrato, riceverai un link per scegliere una nuova password. Aprilo da questo
          dispositivo.
        </Text>
        <Button mode="contained" onPress={() => router.replace('/accedi')}>
          Torna all’accesso
        </Button>
      </Benvenuto>
    );
  }

  return (
    <Benvenuto titolo="Password dimenticata" testo="Ti mandiamo un link per sceglierne una nuova.">
      <TextInput
        label="Email"
        mode="outlined"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onSubmitEditing={invia}
        left={<TextInput.Icon icon="email-outline" />}
      />
      <Errore testo={errore} />
      <Button mode="contained" onPress={invia} loading={inCorso} disabled={inCorso} contentStyle={{ height: 48 }}>
        Invia link
      </Button>
      <Button mode="text" onPress={() => router.replace('/accedi')}>
        Torna all’accesso
      </Button>
    </Benvenuto>
  );
}
