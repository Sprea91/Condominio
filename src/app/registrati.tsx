// Registrazione di un nuovo condòmino.
// Nome e appartamento vengono salvati nel profilo (vedi crea_profilo in supabase/02-...sql);
// l'account resta "in attesa" finché l'amministratore non lo approva.
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { messaggioErrore } from '@/lib/errori';
import { supabase } from '@/lib/supabase';

export default function Registrati() {
  const [nome, setNome] = useState('');
  const [appartamento, setAppartamento] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');
  const [inviata, setInviata] = useState(false);

  async function registrati() {
    setErrore('');
    if (!nome.trim() || !appartamento.trim() || !email.trim() || !password) {
      setErrore('Compila tutti i campi.');
      return;
    }
    if (password.length < 6) {
      setErrore('La password deve avere almeno 6 caratteri.');
      return;
    }
    setInCorso(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nome: nome.trim(), appartamento: appartamento.trim() } },
    });
    setInCorso(false);
    if (error) {
      setErrore(messaggioErrore(error));
      return;
    }
    setInviata(true);
  }

  if (inviata) {
    return (
      <Pagina centrata>
        <Text variant="headlineSmall">Controlla la tua email</Text>
        <Text variant="bodyMedium">
          Ti abbiamo inviato un link a {email.trim()}. Aprilo per confermare l’indirizzo, poi
          accedi. Se non trovi l’email, guarda anche nella posta indesiderata.
        </Text>
        <Button mode="contained" onPress={() => router.replace('/accedi')}>Vai all’accesso</Button>
      </Pagina>
    );
  }

  return (
    <Pagina centrata>
      <Text variant="headlineMedium">Registrati</Text>
      <Text variant="bodyMedium">
        Dopo la registrazione l’amministratore dovrà approvare il tuo account.
      </Text>

      <TextInput label="Nome e cognome" mode="outlined" value={nome} onChangeText={setNome} autoComplete="name" />
      <TextInput
        label="Numero appartamento"
        mode="outlined"
        value={appartamento}
        onChangeText={setAppartamento}
      />
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
        label="Password (almeno 6 caratteri)"
        mode="outlined"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        onSubmitEditing={registrati}
      />
      <HelperText type="error" visible={!!errore}>
        {errore}
      </HelperText>

      <Button mode="contained" onPress={registrati} loading={inCorso} disabled={inCorso}>
        Registrati
      </Button>
      <Button mode="text" onPress={() => router.replace('/accedi')}>Hai già un account? Accedi</Button>
    </Pagina>
  );
}
