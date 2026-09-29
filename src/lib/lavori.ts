// Regole comuni dello storico lavori.
import type { NomeTinta } from './guasti';
import type { CategoriaAllegatoLavoro, Lavoro, StatoLavoro } from './tipi';

export const STATI_LAVORO: { valore: StatoLavoro; etichetta: string; icona: string; tinta: NomeTinta }[] = [
  { valore: 'programmato', etichetta: 'In programma', icona: 'calendar-clock', tinta: 'blu' },
  { valore: 'in_corso', etichetta: 'In corso', icona: 'progress-wrench', tinta: 'arancio' },
  { valore: 'finito', etichetta: 'Finito', icona: 'check-circle-outline', tinta: 'verde' },
];

export function statoLavoro(valore: StatoLavoro | undefined) {
  return STATI_LAVORO.find((s) => s.valore === (valore ?? 'finito')) ?? STATI_LAVORO[2]!;
}

export const CATEGORIE_ALLEGATO: { valore: CategoriaAllegatoLavoro; etichetta: string }[] = [
  { valore: 'fattura', etichetta: 'Fattura' },
  { valore: 'garanzia', etichetta: 'Garanzia' },
  { valore: 'foto', etichetta: 'Foto' },
  { valore: 'altro', etichetta: 'Altro' },
];

// null se la garanzia non è indicata; "inScadenza" se mancano meno di 90 giorni
export function statoGaranzia(l: Pick<Lavoro, 'garanzia_fino'>) {
  if (!l.garanzia_fino) return null;
  const fine = new Date(`${l.garanzia_fino}T23:59:59`).getTime();
  const oggi = Date.now();
  return { valida: fine >= oggi, inScadenza: fine >= oggi && fine - oggi < 90 * 86_400_000 };
}
