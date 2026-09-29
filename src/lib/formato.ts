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

// "lunedì 5 ottobre 2026"
export function dataLunga(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// "18:30"
export function ora(iso: string) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// Per il riquadro a forma di calendario: { giorno: "5", mese: "OTT" }
export function giornoMese(iso: string) {
  const d = new Date(iso);
  return {
    giorno: String(d.getDate()),
    mese: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '').toUpperCase(),
  };
}

// "18:30" o "18.30" -> "18:30" (null se non valida)
export function leggiOra(testo: string): string | null {
  const m = testo.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const [, h, min] = m;
  if (Number(h) > 23 || Number(min) > 59) return null;
  return `${h.padStart(2, '0')}:${min}`;
}

// Tra quanto tempo: "oggi", "domani", "tra 5 giorni"
export function traQuanto(iso: string) {
  const inizioGiorno = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const giorni = Math.round((inizioGiorno(new Date(iso)) - inizioGiorno(new Date())) / 86_400_000);
  if (giorni === 0) return 'oggi';
  if (giorni === 1) return 'domani';
  if (giorni > 1) return `tra ${giorni} giorni`;
  return giorni === -1 ? 'ieri' : `${-giorni} giorni fa`;
}
