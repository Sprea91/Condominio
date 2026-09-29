// Esportazione del rendiconto annuale:
// - CSV che si apre con Excel (separatore ";" e virgola decimale, come vuole Excel in italiano)
// - pagina stampabile: si apre in una nuova scheda e con "Stampa > Salva come PDF" diventa un PDF
// Funziona nel browser (è lì che si usa l'app).
import { Platform } from 'react-native';

import { data, euro, millesimi } from './formato';
import type { Movimento } from './tipi';

export type DatiRendiconto = {
  anno: number;
  movimenti: Movimento[]; // tutti, anche degli anni precedenti (servono per il saldo iniziale)
  condomini: { nome: string | null; appartamento: string | null; millesimi: number }[];
};

const somma = (lista: Movimento[]) => lista.reduce((t, m) => t + Number(m.importo), 0);
const netto = (lista: Movimento[]) =>
  somma(lista.filter((m) => m.tipo === 'entrata')) - somma(lista.filter((m) => m.tipo === 'uscita'));

function calcola({ anno, movimenti }: DatiRendiconto) {
  const inizio = `${anno}-01-01`;
  const fine = `${anno}-12-31`;
  const precedenti = movimenti.filter((m) => m.data < inizio);
  const dellAnno = movimenti.filter((m) => m.data >= inizio && m.data <= fine).sort((a, b) => a.data.localeCompare(b.data));
  const entrate = somma(dellAnno.filter((m) => m.tipo === 'entrata'));
  const uscite = somma(dellAnno.filter((m) => m.tipo === 'uscita'));
  const saldoIniziale = netto(precedenti);
  const perCategoria = (tipo: 'entrata' | 'uscita') =>
    Object.entries(
      dellAnno
        .filter((m) => m.tipo === tipo)
        .reduce<Record<string, number>>((acc, m) => {
          const c = m.categoria?.trim() || 'Altro';
          acc[c] = (acc[c] ?? 0) + Number(m.importo);
          return acc;
        }, {}),
    ).sort((a, b) => b[1] - a[1]);
  return { dellAnno, entrate, uscite, saldoIniziale, saldoFinale: saldoIniziale + entrate - uscite, perCategoria };
}

function scarica(nome: string, contenuto: string, tipo: string) {
  const blob = new Blob([contenuto], { type: tipo });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

// Numero con virgola decimale, senza simbolo €, per Excel
const numeroExcel = (n: number) => n.toFixed(2).replace('.', ',');
const cella = (t: string) => `"${t.replace(/"/g, '""')}"`;

export function esportaCsv(d: DatiRendiconto) {
  if (Platform.OS !== 'web') return;
  const r = calcola(d);
  const righe: string[] = [
    [cella(`Rendiconto ${d.anno}`)].join(';'),
    '',
    ['Data', 'Tipo', 'Descrizione', 'Categoria', 'Entrata', 'Uscita'].map(cella).join(';'),
    ...r.dellAnno.map((m) =>
      [
        cella(data(`${m.data}T12:00:00`)),
        cella(m.tipo === 'entrata' ? 'Entrata' : 'Uscita'),
        cella(m.descrizione),
        cella(m.categoria ?? ''),
        m.tipo === 'entrata' ? numeroExcel(Number(m.importo)) : '',
        m.tipo === 'uscita' ? numeroExcel(Number(m.importo)) : '',
      ].join(';'),
    ),
    '',
    [cella('Saldo inizio anno'), '', '', '', numeroExcel(r.saldoIniziale)].join(';'),
    [cella('Totale entrate'), '', '', '', numeroExcel(r.entrate)].join(';'),
    [cella('Totale uscite'), '', '', '', '', numeroExcel(r.uscite)].join(';'),
    [cella('Saldo fine anno'), '', '', '', numeroExcel(r.saldoFinale)].join(';'),
    '',
    [cella('Quota uscite per appartamento'), cella('Millesimi'), cella('Quota')].join(';'),
    ...d.condomini.map((c) =>
      [
        cella(`${c.appartamento ? `App. ${c.appartamento} – ` : ''}${c.nome ?? ''}`),
        numeroExcel(Number(c.millesimi)).replace(/,00$/, ''),
        numeroExcel((r.uscite * Number(c.millesimi)) / 1000),
      ].join(';'),
    ),
  ];
  // "﻿" all'inizio: fa capire a Excel che il file è in UTF-8 (accenti corretti)
  scarica(`rendiconto-${d.anno}.csv`, `﻿${righe.join('\r\n')}`, 'text/csv;charset=utf-8');
}

const html = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function stampaRendiconto(d: DatiRendiconto) {
  if (Platform.OS !== 'web') return;
  const r = calcola(d);
  const finestra = window.open('', '_blank');
  if (!finestra) return;
  const tabellaCategorie = (titolo: string, voci: [string, number][]) =>
    voci.length
      ? `<h3>${titolo}</h3><table>${voci.map(([c, v]) => `<tr><td>${html(c)}</td><td class="n">${euro(v)}</td></tr>`).join('')}</table>`
      : '';
  finestra.document.write(`<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>Rendiconto ${d.anno}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 32px; font-size: 12px; }
  h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 2px solid #4F46E5; padding-bottom: 4px; }
  h3 { font-size: 13px; margin: 14px 0 6px; }
  .sotto { color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #ddd; vertical-align: top; }
  th { background: #EEF0F6; }
  .n { text-align: right; white-space: nowrap; }
  .riepilogo td { font-size: 13px; } .riepilogo tr.tot td { font-weight: bold; border-top: 2px solid #111; }
  .verde { color: #15803D; } .rosso { color: #B91C1C; }
  .nota { color: #777; margin-top: 24px; font-size: 10px; }
  @media print { body { margin: 12mm; } .noprint { display: none; } }
  .noprint { margin-bottom: 16px; } .noprint button { font-size: 14px; padding: 8px 16px; cursor: pointer; }
</style></head><body>
<div class="noprint"><button onclick="window.print()">Stampa / Salva come PDF</button></div>
<h1>Rendiconto ${d.anno}</h1>
<div class="sotto">Generato il ${new Date().toLocaleDateString('it-IT')} dall'app Condominio</div>

<h2>Riepilogo</h2>
<table class="riepilogo">
  <tr><td>Saldo a inizio anno</td><td class="n">${euro(r.saldoIniziale)}</td></tr>
  <tr><td>Totale entrate</td><td class="n verde">+ ${euro(r.entrate)}</td></tr>
  <tr><td>Totale uscite</td><td class="n rosso">− ${euro(r.uscite)}</td></tr>
  <tr class="tot"><td>Saldo a fine anno</td><td class="n">${euro(r.saldoFinale)}</td></tr>
</table>

<h2>Per categoria</h2>
${tabellaCategorie('Uscite', r.perCategoria('uscita'))}
${tabellaCategorie('Entrate', r.perCategoria('entrata'))}

<h2>Quota delle uscite per appartamento</h2>
<table><tr><th>Appartamento</th><th>Condòmino</th><th class="n">Millesimi</th><th class="n">Quota</th></tr>
${d.condomini
  .map(
    (c) =>
      `<tr><td>${html(c.appartamento ?? '—')}</td><td>${html(c.nome ?? '—')}</td><td class="n">${millesimi(c.millesimi)}</td><td class="n">${euro(
        (r.uscite * Number(c.millesimi)) / 1000,
      )}</td></tr>`,
  )
  .join('')}
</table>

<h2>Movimenti</h2>
<table><tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th class="n">Entrata</th><th class="n">Uscita</th></tr>
${r.dellAnno
  .map(
    (m) =>
      `<tr><td>${data(`${m.data}T12:00:00`)}</td><td>${html(m.descrizione)}</td><td>${html(m.categoria ?? '')}</td><td class="n verde">${
        m.tipo === 'entrata' ? euro(m.importo) : ''
      }</td><td class="n rosso">${m.tipo === 'uscita' ? euro(m.importo) : ''}</td></tr>`,
  )
  .join('')}
</table>
${r.dellAnno.length === 0 ? '<p>Nessun movimento registrato in questo anno.</p>' : ''}
<p class="nota">I giustificativi dei singoli movimenti sono consultabili nell'app, sezione Conto spese.</p>
</body></html>`);
  finestra.document.close();
}
