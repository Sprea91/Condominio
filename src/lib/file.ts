// Scelta, caricamento e apertura dei file (foto e PDF) salvati in Supabase Storage.
// Le cartelle (bucket) sono private: per aprire un file si crea un link temporaneo.
import * as DocumentPicker from 'expo-document-picker';
import { Linking } from 'react-native';

import { supabase } from './supabase';

export type Bucket = 'avvisi' | 'guasti' | 'giustificativi';

export type FileScelto = {
  uri: string;
  nome: string;
  tipo: string;
  file?: File; // presente solo nel browser
};

export const TIPI_IMMAGINE = ['image/jpeg', 'image/png', 'image/webp'];
export const TIPI_IMMAGINE_PDF = [...TIPI_IMMAGINE, 'application/pdf'];
const LIMITE_BYTE = 10 * 1024 * 1024; // 10 MB, come impostato nei bucket

// Apre la scelta file del telefono/PC. Restituisce [] se l'utente annulla.
export async function scegliFile(tipi: string[], multipli = true): Promise<FileScelto[]> {
  const risultato = await DocumentPicker.getDocumentAsync({ type: tipi, multiple: multipli });
  if (risultato.canceled) return [];
  return risultato.assets.map((a) => ({
    uri: a.uri,
    nome: a.name,
    tipo: a.mimeType ?? 'application/octet-stream',
    file: a.file,
  }));
}

// Controlla tipo e dimensione prima del caricamento; restituisce un messaggio d'errore o null.
export function controllaFile(f: FileScelto, tipi: string[]): string | null {
  if (!tipi.includes(f.tipo)) return `"${f.nome}": formato non ammesso (solo JPG, PNG, WEBP${tipi.includes('application/pdf') ? ', PDF' : ''}).`;
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
