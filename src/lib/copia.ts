// Copia un testo negli appunti (es. l'IBAN). Restituisce true se ci è riuscito.
import { Platform } from 'react-native';

export async function copia(testo: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && navigator.clipboard) {
      await navigator.clipboard.writeText(testo);
      return true;
    }
  } catch {
    // il browser può negare l'accesso agli appunti: il testo resta comunque selezionabile
  }
  return false;
}
