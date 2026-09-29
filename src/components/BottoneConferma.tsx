// Pulsante per azioni irreversibili (es. Elimina): al primo tocco chiede conferma.
// (Gli avvisi di sistema "Alert" non funzionano nel browser, per questo si fa così.)
import { useState } from 'react';
import { Button, useTheme } from 'react-native-paper';

type Props = {
  etichetta: string;
  conferma?: string;
  onConferma: () => Promise<void> | void;
};

export function BottoneConferma({ etichetta, conferma = 'Conferma', onConferma }: Props) {
  const tema = useTheme();
  const [chiedi, setChiedi] = useState(false);
  const [inCorso, setInCorso] = useState(false);

  if (!chiedi) {
    return (
      <Button textColor={tema.colors.error} icon="trash-can-outline" onPress={() => setChiedi(true)}>
        {etichetta}
      </Button>
    );
  }

  async function esegui() {
    setInCorso(true);
    try {
      await onConferma();
    } finally {
      setInCorso(false);
      setChiedi(false);
    }
  }

  return (
    <>
      <Button onPress={() => setChiedi(false)} disabled={inCorso}>
        Annulla
      </Button>
      <Button mode="contained" buttonColor={tema.colors.error} textColor={tema.colors.onError} onPress={esegui} loading={inCorso} disabled={inCorso}>
        {conferma}
      </Button>
    </>
  );
}
