// Scelta, caricamento e apertura dei file (foto, PDF, email...) salvati in Supabase Storage.
// Le cartelle (bucket) sono private: per aprire un file si crea un link temporaneo.
import * as DocumentPicker from 'expo-document-picker';
import { Linking } from 'react-native';

import { supabase } from './supabase';

export type Bucket = 'avvisi' | 'guasti' | 'giustificativi' | 'assemblee' | 'documenti' | 'ricevute';

export type FileScelto = {
  uri: string;
  nome: string;
  tipo: string;
  file?: File; // presente solo nel browser
};

export const TIPI_IMMAGINE = ['image/jpeg', 'image/png', 'image/webp'];
export const TIPI_IMMAGINE_PDF = [...TIPI_IMMAGINE, 'application/pdf'];
// Per le assemblee: anche email salvate (.eml, .msg di Outlook), Word e testo
export const TIPI_ASSEMBLEA = [
  ...TIPI_IMMAGINE_PDF,
  'message/rfc822',
  'application/vnd.ms-outlook',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
// Archivio documenti e lavori: anche fogli Excel
export const TIPI_DOCUMENTO = [
  ...TIPI_ASSEMBLEA,
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Il browser a volte non riconosce il tipo di file (succede con .eml e .msg): lo si deduce dall'estensione
const TIPO_DA_ESTENSIONE: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  eml: 'message/rfc822',
  msg: 'application/vnd.ms-outlook',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function tipoFile(nome: string, tipoDichiarato?: string | null) {
  const estensione = nome.split('.').pop()?.toLowerCase() ?? '';
  const dedotto = TIPO_DA_ESTENSIONE[estensione];
  if (!tipoDichiarato || tipoDichiarato === 'application/octet-stream') return dedotto ?? 'application/octet-stream';
  // Alcuni sistemi chiamano le .msg "application/x-msg" o simili: vale quello dell'estensione
  const conosciuto = Object.values(TIPO_DA_ESTENSIONE).includes(tipoDichiarato);
  return dedotto && !conosciuto ? dedotto : tipoDichiarato;
}

// Estensioni da aggiungere alla scelta file del browser per i tipi che non riconosce da solo
function estensioni(tipi: string[]) {
  return Object.entries(TIPO_DA_ESTENSIONE)
    .filter(([, tipo]) => tipi.includes(tipo))
    .map(([est]) => `.${est}`);
}
const LIMITE_BYTE = 10 * 1024 * 1024; // 10 MB, come impostato nei bucket

// Apre la scelta file del telefono/PC. Restituisce [] se l'utente annulla.
export async function scegliFile(tipi: string[], multipli = true): Promise<FileScelto[]> {
  const risultato = await DocumentPicker.getDocumentAsync({ type: [...tipi, ...estensioni(tipi)], multiple: multipli });
  if (risultato.canceled) return [];
  return risultato.assets.map((a) => ({
    uri: a.uri,
    nome: a.name,
    tipo: tipoFile(a.name, a.mimeType),
    file: a.file,
  }));
}

// Controlla tipo e dimensione prima del caricamento; restituisce un messaggio d'errore o null.
export function controllaFile(f: FileScelto, tipi: string[]): string | null {
  if (!tipi.includes(f.tipo)) {
    const ammessi = estensioni(tipi).map((e) => e.slice(1).toUpperCase());
    return `"${f.nome}": formato non ammesso (solo ${[...new Set(ammessi)].join(', ')}).`;
  }
  if (f.file && f.file.size > LIMITE_BYTE) return `"${f.nome}": file troppo grande (massimo 10 MB).`;
  return null;
}

// Toglie accenti e caratteri strani dal nome, che Storage non accetta
function nomeSicuro(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Carica un file e restituisce il percorso salvato nel bucket.
export async function caricaFile(bucket: Bucket, cartella: string, f: FileScelto): Promise<string> {
  const percorso = `${cartella}/${Date.now()}-${nomeSicuro(f.nome)}`;
  const contenuto = f.file ?? (await (await fetch(f.uri)).arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(percorso, contenuto, { contentType: f.tipo });
  if (error) throw new Error(`Caricamento di "${f.nome}" non riuscito: ${error.message}`);
  return percorso;
}

// Link temporaneo (1 ora) per vedere un file privato
export async function linkFile(bucket: Bucket, percorso: string): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(percorso, 3600);
  return data?.signedUrl ?? null;
}

export async function apriFile(bucket: Bucket, percorso: string) {
  const link = await linkFile(bucket, percorso);
  if (link) await Linking.openURL(link);
}

export async function eliminaFile(bucket: Bucket, percorsi: string[]) {
  if (percorsi.length) await supabase.storage.from(bucket).remove(percorsi);
}
