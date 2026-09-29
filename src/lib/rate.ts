// Calcoli delle rate condominiali.
import type { Rata, Ripartizione } from './tipi';

type Quota = { id: string; millesimi: number };

// Divide il totale tra i condòmini, in centesimi, in modo che la somma torni esatta:
// i centesimi di resto vanno a chi ha il resto più grande (metodo dei "resti maggiori").
export function ripartisci(totale: number, condomini: Quota[], modo: Exclude<Ripartizione, 'manuale'>): Map<string, number> {
  const centesimi = Math.round(totale * 100);
  const pesi = condomini.map((c) => (modo === 'uguale' ? 1 : Math.max(0, Number(c.millesimi))));
  const sommaPesi = pesi.reduce((t, p) => t + p, 0);
  const risultato = new Map<string, number>();
  if (!condomini.length || sommaPesi === 0) {
    condomini.forEach((c) => risultato.set(c.id, 0));
    return risultato;
  }
  const esatte = pesi.map((p) => (centesimi * p) / sommaPesi);
  const intere = esatte.map(Math.floor);
  let resto = centesimi - intere.reduce((t, x) => t + x, 0);
  const ordine = esatte.map((e, i) => ({ i, frazione: e - Math.floor(e) })).sort((a, b) => b.frazione - a.frazione);
  for (const { i } of ordine) {
    if (resto <= 0) break;
    intere[i] += 1;
    resto -= 1;
  }
  condomini.forEach((c, i) => risultato.set(c.id, intere[i] / 100));
  return risultato;
}

export const CAUSALE_PREDEFINITA = '{titolo} - App. {appartamento} - {nome}';

// Causale del bonifico per un condòmino.
// Senza modello: "titolo - App. X - Nome" (le parti mancanti si saltano).
// Con un modello scritto dall'amministratore: si sostituiscono {titolo}, {appartamento} e {nome}.
export function causaleBonifico(
  modello: string | null | undefined,
  titolo: string,
  profilo: { nome: string | null; appartamento: string | null } | null | undefined,
) {
  if (!modello?.trim() || modello.trim() === CAUSALE_PREDEFINITA) {
    return [titolo, profilo?.appartamento ? `App. ${profilo.appartamento}` : '', profilo?.nome ?? '']
      .map((x) => x.trim())
      .filter(Boolean)
      .join(' - ');
  }
  return modello
    .replace(/\{titolo\}/gi, titolo)
    .replace(/\{appartamento\}/gi, profilo?.appartamento ?? '')
    .replace(/\{nome\}/gi, profilo?.nome ?? '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export type StatoRata = 'pagata' | 'in_verifica' | 'in_ritardo' | 'da_pagare';

// in_verifica = il condòmino ha detto "Ho pagato", l'amministratore deve confermare
export function statoRata(r: Pick<Rata, 'pagata_il' | 'segnalata_il'> & { scadenza?: string }): StatoRata {
  if (r.pagata_il) return 'pagata';
  if (r.segnalata_il) return 'in_verifica';
  if (r.scadenza && r.scadenza < oggiIso()) return 'in_ritardo';
  return 'da_pagare';
}

// Data di oggi nel formato del database (aaaa-mm-gg), secondo l'ora del telefono
export function oggiIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
