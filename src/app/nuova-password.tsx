// Mostrata a chi arriva dal link "password dimenticata": sceglie la nuova password.
import { useState } from 'react';
import { Button } from 'react-native-paper';

import { Benvenuto, CampoPassword } from '@/components/Benvenuto';
import { Errore } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { messaggioErrore } from '@/lib/errori';
import { supabase } from '@/lib/supabase';

export default function NuovaPassword() {
  const { fineRecupero, esci } = useAuth();
  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    if (password.length < 6) {
      setErrore('La password deve avere almeno 6 caratteri.');
      return;
    }
    if (password !== conferma) {
      setErrore('Le due password non coincidono.');
      return;
    }
    setInCorso(true);
    const { error } = await supabase.auth.updateUser({ password });
    setInCorso(false);
    if (error) setErrore(messaggioErrore(error));
    else fineRecupero(); // la navigazione porta da sola alla Home
  }

  return (
    <Benvenuto titolo="Nuova password" testo="Scegli la password che userai da ora in poi.">
      <CampoPassword label="Nuova password" value={password} onChangeText={setPassword} nuova />
      <CampoPassword label="Ripeti la password" value={conferma} onChangeText={setConferma} onSubmitEditing={salva} nuova />
      <Errore testo={errore} />
      <Button mode="contained" onPress={salva} loading={inCorso} disabled={inCorso} contentStyle={{ height: 48 }}>
        Salva password
      </Button>
      <Button mode="text" onPress={esci}>
        Annulla
      </Button>
    </Benvenuto>
  );
}
