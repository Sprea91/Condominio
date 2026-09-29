// Regole comuni dello storico lavori.
import type { CategoriaAllegatoLavoro, Lavoro } from './tipi';

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
