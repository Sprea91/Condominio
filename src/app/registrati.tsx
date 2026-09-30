// Registrazione di un nuovo condòmino.
// Nome e appartamento vengono salvati nel profilo (vedi crea_profilo in supabase/02-...sql);
// l'account resta "in attesa" finché l'amministratore non lo approva.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Checkbox, Text, TextInput, useTheme } from 'react-native-paper';

import { Benvenuto, CampoPassword } from '@/components/Benvenuto';
import { Errore } from '@/components/ui';
import { messaggioErrore } from '@/lib/errori';
import { INDIRIZZO_SITO } from '@/lib/recupero';
import { supabase } from '@/lib/supabase';

export default function Registrati() {
  const tema = useTheme();
  const [nome, setNome] = useState('');
  const [appartamento, setAppartamento] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cellulare, setCellulare] = useState('');
  const [emergenzaNome, setEmergenzaNome] = useState('');
  const [emergenzaTelefono, setEmergenzaTelefono] = useState('');
  const [consenso, setConsenso] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');
  const [inviata, setInviata] = useState(false);

  async function registrati() {
    setErrore('');
    if (!nome.trim() || !appartamento.trim() || !email.trim() || !cellulare.trim() || !password) {
      setErrore('Compila tutti i campi obbligatori.');
      return;
    }
    if (cellulare.replace(/[^\d]/g, '').length < 8) {
      setErrore('Controlla il numero di cellulare.');
      return;
    }
    if (!consenso) {
      setErrore('Per registrarti devi accettare il trattamento dei dati.');
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
      // Questi dati li salva il database in automatico (funzione crea_profilo in supabase/05-...sql);
      // cellulare ed emergenza finiscono nella tabella riservata che vede solo l'amministratore
      options: {
        // dopo la conferma dell'email si torna sull'app (deve essere tra i "Redirect URLs" di Supabase)
        emailRedirectTo: INDIRIZZO_SITO,
        data: {
          nome: nome.trim(),
          appartamento: appartamento.trim(),
          cellulare: cellulare.trim(),
          emergenza_nome: emergenzaNome.trim(),
          emergenza_telefono: emergenzaTelefono.trim(),
          consenso_privacy: 'true',
        },
      },
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
      <TextInput
        label="Cellulare"
        mode="outlined"
        value={cellulare}
        onChangeText={setCellulare}
        keyboardType="phone-pad"
        autoComplete="tel"
        left={<TextInput.Icon icon="cellphone" />}
      />
      <CampoPassword
        label="Password (almeno 6 caratteri)"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={registrati}
        nuova
      />

      <View style={styles.sezione}>
        <Text variant="titleSmall">Contatto di emergenza (facoltativo)</Text>
        <Text variant="bodySmall" style={{ color: tema.colors.onSurfaceVariant }}>
          Una persona da avvisare se succede qualcosa in tua assenza (es. perdita d’acqua).
        </Text>
      </View>
      <TextInput
        label="Nome"
        mode="outlined"
        value={emergenzaNome}
        onChangeText={setEmergenzaNome}
        left={<TextInput.Icon icon="account-heart-outline" />}
      />
      <TextInput
        label="Telefono"
        mode="outlined"
        value={emergenzaTelefono}
        onChangeText={setEmergenzaTelefono}
        keyboardType="phone-pad"
        left={<TextInput.Icon icon="phone-outline" />}
      />

      <Pressable style={styles.consenso} onPress={() => setConsenso(!consenso)}>
        <Checkbox.Android status={consenso ? 'checked' : 'unchecked'} onPress={() => setConsenso(!consenso)} />
        <Text variant="bodySmall" style={styles.flex}>
          Acconsento al trattamento dei miei dati per la gestione del condominio. Nome e appartamento sono
          visibili agli altri condòmini; cellulare e contatto di emergenza solo all’amministratore.
        </Text>
      </Pressable>
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
  sezione: { gap: 2, marginTop: 8 },
  consenso: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
});
