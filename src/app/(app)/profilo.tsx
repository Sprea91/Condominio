// Il mio profilo: dati, modifica del nome, cambio password, uscita.
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Divider, Text, TextInput, useTheme } from 'react-native-paper';

import { CampoPassword } from '@/components/Benvenuto';
import { Pagina } from '@/components/Pagina';
import { Errore, Nota, Riquadro, Titoletto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { messaggioErrore } from '@/lib/errori';
import { millesimi } from '@/lib/formato';
import { supabase } from '@/lib/supabase';
import type { Contatti as TipoContatti } from '@/lib/tipi';
import { useDati } from '@/lib/useDati';

// Cellulare e contatto di emergenza: tabella riservata (li vede solo l'amministratore)
function Contatti() {
  const { profilo } = useAuth();
  const leggi = useCallback(
    () => supabase.from('profili_contatti').select('*').eq('id', profilo?.id ?? '').maybeSingle<TipoContatti>(),
    [profilo?.id],
  );
  const { dati, errore } = useDati(leggi);
  // Se la tabella non esiste ancora (supabase/05-...sql non eseguito) la sezione non si mostra
  if (errore) return null;
  return <ModuloContatti key={dati?.id ?? 'nuovo'} iniziali={dati} />;
}

function ModuloContatti({ iniziali }: { iniziali: TipoContatti | null }) {
  const { profilo } = useAuth();
  const [cellulare, setCellulare] = useState(iniziali?.cellulare ?? '');
  const [emergenzaNome, setEmergenzaNome] = useState(iniziali?.emergenza_nome ?? '');
  const [emergenzaTelefono, setEmergenzaTelefono] = useState(iniziali?.emergenza_telefono ?? '');
  const [inCorso, setInCorso] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    setMessaggio('');
    setInCorso(true);
    const { error } = await supabase.from('profili_contatti').upsert({
      id: profilo!.id,
      cellulare: cellulare.trim() || null,
      emergenza_nome: emergenzaNome.trim() || null,
      emergenza_telefono: emergenzaTelefono.trim() || null,
    });
    setInCorso(false);
    if (error) setErrore(`Errore: ${error.message}`);
    else setMessaggio('Contatti salvati.');
  }

  return (
    <>
      <Titoletto>Contatti riservati</Titoletto>
      <Riquadro>
        <Nota>Li vede solo l’amministratore.</Nota>
        <TextInput
          label="Cellulare"
          mode="outlined"
          value={cellulare}
          onChangeText={setCellulare}
          keyboardType="phone-pad"
          left={<TextInput.Icon icon="cellphone" />}
        />
        <TextInput
          label="Contatto di emergenza: nome"
          mode="outlined"
          value={emergenzaNome}
          onChangeText={setEmergenzaNome}
          left={<TextInput.Icon icon="account-heart-outline" />}
        />
        <TextInput
          label="Contatto di emergenza: telefono"
          mode="outlined"
          value={emergenzaTelefono}
          onChangeText={setEmergenzaTelefono}
          keyboardType="phone-pad"
          left={<TextInput.Icon icon="phone-outline" />}
        />
        <Errore testo={errore} />
        {!!messaggio && <Nota>{messaggio}</Nota>}
        <Button mode="contained-tonal" onPress={salva} loading={inCorso} disabled={inCorso}>
          Salva contatti
        </Button>
      </Riquadro>
    </>
  );
}

function Riga({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <View style={styles.riga}>
      <Nota>{etichetta}</Nota>
      <Text variant="bodyLarge">{valore}</Text>
    </View>
  );
}

export default function Profilo() {
  const tema = useTheme();
  const { profilo, ricaricaProfilo, esci } = useAuth();
  const [nome, setNome] = useState(profilo?.nome ?? '');
  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [inCorso, setInCorso] = useState<'nome' | 'password' | null>(null);
  const [errore, setErrore] = useState('');
  const [messaggio, setMessaggio] = useState('');

  async function salvaNome() {
    setErrore('');
    setMessaggio('');
    if (!nome.trim()) {
      setErrore('Il nome non può essere vuoto.');
      return;
    }
    setInCorso('nome');
    const { error } = await supabase.rpc('aggiorna_mio_nome', { p_nome: nome.trim() });
    setInCorso(null);
    if (error) {
      setErrore(
        error.code === 'PGRST202'
          ? 'Funzione non ancora attiva: l’amministratore deve eseguire supabase/04-migliorie.sql.'
          : `Errore: ${error.message}`,
      );
      return;
    }
    await ricaricaProfilo();
    setMessaggio('Nome aggiornato.');
  }

  async function salvaPassword() {
    setErrore('');
    setMessaggio('');
    if (password.length < 6) {
      setErrore('La password deve avere almeno 6 caratteri.');
      return;
    }
    if (password !== conferma) {
      setErrore('Le due password non coincidono.');
      return;
    }
    setInCorso('password');
    const { error } = await supabase.auth.updateUser({ password });
    setInCorso(null);
    if (error) {
      setErrore(messaggioErrore(error));
      return;
    }
    setPassword('');
    setConferma('');
    setMessaggio('Password cambiata.');
  }

  const nomeVisibile = profilo?.nome ?? profilo?.email ?? '';

  return (
    <Pagina titolo="Il mio profilo">
      <Riquadro style={styles.centro}>
        <Avatar.Text
          size={72}
          label={nomeVisibile
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? '')
            .join('') || '?'}
        />
        <Text variant="titleLarge">{nomeVisibile}</Text>
        <Nota>{profilo?.ruolo === 'amministratore' ? 'Amministratore' : 'Condòmino'}</Nota>
        <Divider style={styles.divisore} />
        <View style={styles.dati}>
          <Riga etichetta="Appartamento" valore={profilo?.appartamento ?? 'non assegnato'} />
          <Riga etichetta="Millesimi" valore={profilo ? millesimi(profilo.millesimi) : '—'} />
          <Riga etichetta="Email" valore={profilo?.email ?? ''} />
        </View>
      </Riquadro>

      <Errore testo={errore} />
      {!!messaggio && (
        <Text variant="bodyMedium" style={{ color: tema.colors.primary }}>
          {messaggio}
        </Text>
      )}

      <Titoletto>Nome</Titoletto>
      <Riquadro>
        <TextInput label="Nome e cognome" mode="outlined" value={nome} onChangeText={setNome} />
        <Button mode="contained-tonal" onPress={salvaNome} loading={inCorso === 'nome'} disabled={!!inCorso}>
          Salva nome
        </Button>
      </Riquadro>

      <Contatti />

      <Titoletto>Cambia password</Titoletto>
      <Riquadro>
        <CampoPassword label="Nuova password" value={password} onChangeText={setPassword} nuova />
        <CampoPassword label="Ripeti la password" value={conferma} onChangeText={setConferma} nuova />
        <Button mode="contained-tonal" onPress={salvaPassword} loading={inCorso === 'password'} disabled={!!inCorso}>
          Cambia password
        </Button>
      </Riquadro>

      <Button mode="outlined" icon="logout" onPress={esci} textColor={tema.colors.error} style={styles.esci}>
        Esci
      </Button>
      <Nota style={styles.centroTesto}>
        Appartamento e millesimi li modifica l’amministratore.
      </Nota>
    </Pagina>
  );
}

const styles = StyleSheet.create({
  centro: { alignItems: 'center', gap: 6 },
  divisore: { alignSelf: 'stretch', marginVertical: 8 },
  dati: { alignSelf: 'stretch', gap: 10 },
  riga: { gap: 2 },
  esci: { marginTop: 8 },
  centroTesto: { alignSelf: 'center' },
});
