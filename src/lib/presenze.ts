// Risposte possibili alla convocazione di un'assemblea.
import type { NomeTinta } from './guasti';
import type { RispostaPresenza } from './tipi';

export const RISPOSTE: { valore: RispostaPresenza; etichetta: string; breve: string; icona: string; tinta: NomeTinta }[] = [
  { valore: 'presente', etichetta: 'Ci sarò', breve: 'Ci sarai', icona: 'check-circle-outline', tinta: 'verde' },
  { valore: 'delega', etichetta: 'Delego qualcuno', breve: 'Hai delegato', icona: 'account-arrow-right-outline', tinta: 'blu' },
  { valore: 'assente', etichetta: 'Non ci sarò', breve: 'Assente', icona: 'close-circle-outline', tinta: 'grigio' },
];
