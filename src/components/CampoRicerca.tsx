// Casella "Cerca" riutilizzata negli elenchi, con la X per svuotarla.
import { TextInput } from 'react-native-paper';

export function CampoRicerca({
  valore,
  onCambia,
  segnaposto = 'Cerca',
  autoFocus = false,
}: {
  valore: string;
  onCambia: (t: string) => void;
  segnaposto?: string;
  autoFocus?: boolean;
}) {
  return (
    <TextInput
      mode="outlined"
      dense
      placeholder={segnaposto}
      value={valore}
      onChangeText={onCambia}
      autoFocus={autoFocus}
      autoCapitalize="none"
      left={<TextInput.Icon icon="magnify" />}
      right={valore ? <TextInput.Icon icon="close" onPress={() => onCambia('')} /> : undefined}
    />
  );
}

// true se tutte le parole cercate compaiono in almeno uno dei campi (maiuscole e accenti non contano)
export function corrisponde(cerca: string, ...campi: (string | null | undefined)[]) {
  const norm = (t: string) =>
    t
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  const parole = norm(cerca).split(/\s+/).filter(Boolean);
  if (!parole.length) return true;
  const testo = norm(campi.filter(Boolean).join(' '));
  return parole.every((p) => testo.includes(p));
}
