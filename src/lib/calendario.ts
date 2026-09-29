// "Aggiungi al calendario" per le assemblee:
// - file .ics (standard dei calendari: iPhone, Outlook, e anche Android con l'app Calendario)
// - link a Google Calendar (comodo su Android)
import { Linking, Platform } from 'react-native';

import type { Assemblea } from './tipi';

const DURATA_ORE = 2; // durata indicativa dell'assemblea nel calendario

// 2026-10-05T18:30:00Z -> 20261005T183000Z
function formatoIcs(data: Date) {
  return data.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Nel formato .ics virgole, punti e virgola e a capo vanno "protetti"
function testoIcs(testo: string) {
  return testo.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function descrizione(a: Assemblea) {
  const parti: string[] = [];
  if (a.ordine_del_giorno?.trim()) {
    parti.push('Ordine del giorno:');
    a.ordine_del_giorno
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean)
      .forEach((r, i) => parti.push(`${i + 1}. ${r}`));
  }
  if (a.link_online) parti.push('', `Collegamento: ${a.link_online}`);
  return parti.join('\n');
}

function orari(a: Assemblea) {
  const inizio = new Date(a.data_ora);
  const fine = new Date(inizio.getTime() + DURATA_ORE * 60 * 60 * 1000);
  return { inizio, fine };
}

export function scaricaIcs(a: Assemblea) {
  const { inizio, fine } = orari(a);
  const righe = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Condominio//Assemblee//IT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:assemblea-${a.id}@condominio`,
    `DTSTAMP:${formatoIcs(new Date())}`,
    `DTSTART:${formatoIcs(inizio)}`,
    `DTEND:${formatoIcs(fine)}`,
    `SUMMARY:${testoIcs(a.titolo)}`,
    a.luogo ? `LOCATION:${testoIcs(a.luogo)}` : '',
    `DESCRIPTION:${testoIcs(descrizione(a))}`,
    // promemoria il giorno prima
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${testoIcs(a.titolo)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  const contenuto = righe.join('\r\n');

  if (Platform.OS === 'web') {
    const blob = new Blob([contenuto], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'assemblea.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  } else {
    Linking.openURL(`data:text/calendar;charset=utf-8,${encodeURIComponent(contenuto)}`);
  }
}

export function apriGoogleCalendar(a: Assemblea) {
  const { inizio, fine } = orari(a);
  const parametri = new URLSearchParams({
    action: 'TEMPLATE',
    text: a.titolo,
    dates: `${formatoIcs(inizio)}/${formatoIcs(fine)}`,
    details: descrizione(a),
    location: a.luogo ?? '',
  });
  Linking.openURL(`https://calendar.google.com/calendar/render?${parametri.toString()}`);
}
