// Registrazione di un nuovo condòmino.
// Nome e appartamento vengono salvati nel profilo (vedi crea_profilo in supabase/02-...sql);
// l'account resta "in attesa" finché l'amministratore non lo approva.
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';

import { Benvenuto, CampoPassword } from '@/components/Benvenuto';
import { Errore } from '@/components/ui';
import { messaggioErrore } from '@/lib/errori';
import { supabase } from '@/lib/supabase';

export default function Registrati() {
  const tema = useTheme();
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
      <Benvenuto titolo="Controlla la tua email">
        <Text variant="bodyMedium">
          Ti abbiamo inviato un link a <Text style={styles.grassetto}>{email.trim()}</Text>. Aprilo per confermare
          l’indirizzo, poi accedi.
        </Text>
        <Text variant="bodySmall" style={{ color: tema.colors.onSurfaceVariant }}>
          Non la trovi? Guarda nella posta indesiderata.
        </Text>
        <Button mode="contained" onPress={() => router.replace('/accedi')}>
          Vai all’accesso
        </Button>
      </Benvenuto>
    );
  }

  return (
    <Benvenuto titolo="Crea il tuo account" testo="Dopo la registrazione l’amministratore dovrà approvarti.">
      <TextInput
        label="Nome e cognome"
        mode="outlined"
        value={nome}
        onChangeText={setNome}
        autoComplete="name"
        left={<TextInput.Icon icon="account-outline" />}
      />
      <TextInput
        label="Numero appartamento"
        mode="outlined"
        value={appartamento}
        onChangeText={setAppartamento}
        left={<TextInput.Icon icon="door" />}
      />
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
      <CampoPassword
        label="Password (almeno 6 caratteri)"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={registrati}
        nuova
      />
      <Errore testo={errore} />
      <Button mode="contained" onPress={registrati} loading={inCorso} disabled={inCorso} contentStyle={styles.alto}>
        Registrati
      </Button>
      <Button mode="text" onPress={() => router.replace('/accedi')}>
        Hai già un account? Accedi
      </Button>
    </Benvenuto>
  );
}

const styles = StyleSheet.create({
  grassetto: { fontWeight: 'bold' },
  alto: { height: 48 },
});
