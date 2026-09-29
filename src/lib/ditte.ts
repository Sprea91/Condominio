// Rubrica automatica delle ditte: i nomi già usati in tutta l'app
// (numeri utili, lavori, preventivi, sondaggi, guasti, movimenti), senza doppioni.
import { useCallback } from 'react';

import { supabase } from './supabase';
import { useDati } from './useDati';

// Stessa ditta anche se scritta con maiuscole/spazi diversi
export const chiaveDitta = (nome: string) => nome.trim().toLowerCase().replace(/\s+/g, ' ');

async function nomi(tabella: string, colonna: string): Promise<string[]> {
  const { data, error } = await supabase.from(tabella).select(colonna).not(colonna, 'is', null);
  if (error) return []; // colonna non ancora creata (file SQL non eseguito): si salta
  return ((data ?? []) as unknown as Record<string, string | null>[]).map((r) => r[colonna] ?? '').filter(Boolean);
}

export async function leggiDitte(): Promise<string[]> {
  const elenchi = await Promise.all([
    nomi('numeri_utili', 'nome'),
    nomi('lavori', 'ditta'),
    nomi('preventivi', 'ditta'),
    nomi('sondaggi_opzioni', 'ditta'),
    nomi('guasti', 'ditta'),
    nomi('movimenti', 'ditta'),
  ]);
  // Per ogni ditta si tiene la grafia usata più spesso
  const conteggi = new Map<string, Map<string, number>>();
  for (const nome of elenchi.flat()) {
    const k = chiaveDitta(nome);
    if (!k) continue;
    const varianti = conteggi.get(k) ?? new Map<string, number>();
    varianti.set(nome.trim(), (varianti.get(nome.trim()) ?? 0) + 1);
    conteggi.set(k, varianti);
  }
  return [...conteggi.values()]
    .map((v) => [...v.entries()].sort((a, b) => b[1] - a[1])[0]![0])
    .sort((a, b) => a.localeCompare(b, 'it'));
}

export function useDitte() {
  const leggi = useCallback(async () => ({ data: await leggiDitte(), error: null }), []);
  return useDati(leggi).dati ?? [];
}
