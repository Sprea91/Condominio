// Regole comuni dei sondaggi.
import type { Sondaggio } from './tipi';

// Si può votare se il sondaggio non è stato chiuso e non è scaduto
export function aperto(s: Sondaggio) {
  return !s.chiuso && (!s.scadenza || new Date(s.scadenza) > new Date());
}
