// Installazione dell'app sulla schermata Home.
// Su Android (Chrome) e sul PC (Chrome/Edge) il browser permette un pulsante "Installa":
// l'evento "beforeinstallprompt" va catturato appena si apre la pagina, per usarlo dopo.
// Su iPhone non esiste: bisogna usare il menu Condividi di Safari (spiegato nella guida).
import { Platform } from 'react-native';

type EventoInstallazione = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let evento: EventoInstallazione | null = null;
const ascoltatori = new Set<() => void>();

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    evento = e as EventoInstallazione;
    ascoltatori.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    evento = null;
    ascoltatori.forEach((f) => f());
  });
}

export const puoInstallare = () => evento !== null;

export function quandoCambia(f: () => void) {
  ascoltatori.add(f);
  return () => {
    ascoltatori.delete(f);
  };
}

export async function installa() {
  if (!evento) return false;
  await evento.prompt();
  const scelta = await evento.userChoice;
  evento = null;
  ascoltatori.forEach((f) => f());
  return scelta.outcome === 'accepted';
}

// Già aperta come app installata (non dentro il browser)?
export function eGiaInstallata() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function sistema(): 'ios' | 'android' | 'pc' {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return Platform.OS === 'ios' ? 'ios' : 'android';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'pc';
}
