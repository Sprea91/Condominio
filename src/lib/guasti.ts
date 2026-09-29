// Etichette e colori degli stati dei guasti.
import type { StatoGuasto } from './tipi';

export const STATI: { valore: StatoGuasto; etichetta: string; colore: string }[] = [
  { valore: 'aperto', etichetta: 'Aperto', colore: '#C62828' },
  { valore: 'in_lavorazione', etichetta: 'In lavorazione', colore: '#EF6C00' },
  { valore: 'chiuso', etichetta: 'Chiuso', colore: '#2E7D32' },
];

export function stato(valore: StatoGuasto) {
  return STATI.find((s) => s.valore === valore) ?? STATI[0];
}
