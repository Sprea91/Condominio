// Etichette, icone e colori degli stati dei guasti.
import type { StatoGuasto } from './tipi';

export type NomeTinta = 'verde' | 'rosso' | 'arancio' | 'blu' | 'viola' | 'grigio';

export const STATI: { valore: StatoGuasto; etichetta: string; tinta: NomeTinta; icona: string }[] = [
  { valore: 'aperto', etichetta: 'Aperto', tinta: 'rosso', icona: 'alert-circle-outline' },
  { valore: 'in_lavorazione', etichetta: 'In lavorazione', tinta: 'arancio', icona: 'progress-wrench' },
  { valore: 'chiuso', etichetta: 'Risolto', tinta: 'verde', icona: 'check-circle-outline' },
];

export function stato(valore: StatoGuasto) {
  return STATI.find((s) => s.valore === valore) ?? STATI[0];
}
