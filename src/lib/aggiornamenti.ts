// Controlla se è stata pubblicata una nuova versione dell'app (solo browser).
// Ogni pubblicazione cambia il nome del file JavaScript principale ("entry-XXXX.js"):
// si rilegge index.html dal sito e, se quel nome è diverso da quello in uso, c'è una versione nuova.
import { Platform } from 'react-native';

const SCRIPT = /_expo\/static\/js\/web\/entry-[\w]+\.js/;

function scriptInUso() {
  const tag = [...document.querySelectorAll('script[src]')].find((s) => SCRIPT.test((s as HTMLScriptElement).src));
  return tag ? ((tag as HTMLScriptElement).src.match(SCRIPT)?.[0] ?? null) : null;
}

export async function ceNuovaVersione(): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const attuale = scriptInUso();
  if (!attuale) return false; // in sviluppo (expo start) il nome non c'è: niente controllo
  try {
    const base = document.querySelector('base')?.href ?? `${location.origin}/Condominio/`;
    const risposta = await fetch(`${base.replace(/\/?$/, '/')}index.html?v=${Date.now()}`, { cache: 'no-store' });
    if (!risposta.ok) return false;
    const pubblicato = (await risposta.text()).match(SCRIPT)?.[0];
    return !!pubblicato && pubblicato !== attuale;
  } catch {
    return false; // senza connessione: si riprova più tardi
  }
}

export function aggiorna() {
  location.reload();
}
