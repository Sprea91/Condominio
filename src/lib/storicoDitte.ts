// Storico delle ditte: per ogni ditta raccoglie contatti, lavori, preventivi, guasti e movimenti
// in cui compare (il nome si confronta senza badare a maiuscole e spazi).
import { chiaveDitta } from './ditte';
import { supabase } from './supabase';

export type VoceDitta = {
  chiave: string;
  nome: string;
  contatto: { id: string; categoria: string; telefono: string | null; email: string | null; note: string | null } | null;
  lavori: { id: string; titolo: string; data_lavoro: string; importo: number | null }[];
  preventivi: { id: string; richiesta_id: string; titolo: string; importo: number | null; stato: string; creato_il: string }[];
  guasti: { id: string; titolo: string; stato: string; creato_il: string }[];
  movimenti: { id: string; descrizione: string; tipo: string; importo: number; data: string }[];
  totalePagato: number; // uscite del conto registrate con questa ditta
};

type Riga = Record<string, unknown>;

async function leggi(tabella: string, colonne: string): Promise<Riga[]> {
  const { data, error } = await supabase.from(tabella).select(colonne);
  return error ? [] : ((data ?? []) as unknown as Riga[]);
}

export async function leggiStoricoDitte(): Promise<VoceDitta[]> {
  const [numeri, lavori, preventivi, guasti, movimenti] = await Promise.all([
    leggi('numeri_utili', 'id, nome, categoria, telefono, email, note'),
    leggi('lavori', 'id, titolo, ditta, data_lavoro, importo'),
    leggi('preventivi', 'id, richiesta_id, ditta, importo, stato, creato_il, richiesta:preventivi_richieste(titolo)'),
    leggi('guasti', 'id, titolo, ditta, stato, creato_il'),
    leggi('movimenti', 'id, descrizione, ditta, tipo, importo, data'),
  ]);

  const mappa = new Map<string, VoceDitta>();
  const voce = (nome: unknown) => {
    const n = typeof nome === 'string' ? nome.trim() : '';
    if (!n) return null;
    const k = chiaveDitta(n);
    let v = mappa.get(k);
    if (!v) {
      v = { chiave: k, nome: n, contatto: null, lavori: [], preventivi: [], guasti: [], movimenti: [], totalePagato: 0 };
      mappa.set(k, v);
    }
    return v;
  };

  for (const r of numeri) {
    const v = voce(r.nome);
    if (v) {
      v.nome = String(r.nome).trim(); // il nome della rubrica è quello "ufficiale"
      v.contatto = {
        id: String(r.id),
        categoria: String(r.categoria ?? ''),
        telefono: (r.telefono as string | null) ?? null,
        email: (r.email as string | null) ?? null,
        note: (r.note as string | null) ?? null,
      };
    }
  }
  for (const r of lavori) {
    voce(r.ditta)?.lavori.push({
      id: String(r.id),
      titolo: String(r.titolo),
      data_lavoro: String(r.data_lavoro),
      importo: r.importo == null ? null : Number(r.importo),
    });
  }
  for (const r of preventivi) {
    voce(r.ditta)?.preventivi.push({
      id: String(r.id),
      richiesta_id: String(r.richiesta_id),
      titolo: String((r.richiesta as { titolo?: string } | null)?.titolo ?? 'Preventivo'),
      importo: r.importo == null ? null : Number(r.importo),
      stato: String(r.stato),
      creato_il: String(r.creato_il),
    });
  }
  for (const r of guasti) {
    voce(r.ditta)?.guasti.push({ id: String(r.id), titolo: String(r.titolo), stato: String(r.stato), creato_il: String(r.creato_il) });
  }
  for (const r of movimenti) {
    const v = voce(r.ditta);
    if (!v) continue;
    v.movimenti.push({
      id: String(r.id),
      descrizione: String(r.descrizione),
      tipo: String(r.tipo),
      importo: Number(r.importo),
      data: String(r.data),
    });
    if (r.tipo === 'uscita') v.totalePagato += Number(r.importo);
  }
  return [...mappa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}
