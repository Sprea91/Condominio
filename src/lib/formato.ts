// Formattazione di date e importi in italiano.

export function data(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function dataOra(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function euro(importo: number) {
  return Number(importo).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

export function millesimi(valore: number) {
  return Number(valore).toLocaleString('it-IT', { maximumFractionDigits: 3 });
}

// "gg/mm/aaaa" -> "aaaa-mm-gg" (formato del database). null se non valida.
export function leggiData(testo: string): string | null {
  const m = testo.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const [, g, mese, anno] = m;
  const d = new Date(Number(anno), Number(mese) - 1, Number(g));
  if (d.getDate() !== Number(g) || d.getMonth() !== Number(mese) - 1) return null;
  return `${anno}-${mese.padStart(2, '0')}-${g.padStart(2, '0')}`;
}

export function oggi() {
  return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Accetta sia "95,5" sia "95.5" (e "1.250,50" all'italiana)
export function leggiNumero(testo: string): number | null {
  let t = testo.trim();
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return t !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

export function autore(a: { nome: string | null; appartamento: string | null } | null) {
  if (!a) return 'utente eliminato';
  return a.appartamento ? `${a.nome ?? '—'} (app. ${a.appartamento})` : (a.nome ?? '—');
}
