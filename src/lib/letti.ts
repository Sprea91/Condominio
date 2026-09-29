// Ricorda sul dispositivo quando l'utente ha aperto la bacheca l'ultima volta,
// per segnare come "nuovi" gli avvisi arrivati dopo.
function chiave(utente: string) {
  return `avvisi-visti-${utente}`;
}

export function ultimaVisita(utente: string): string | null {
  try {
    return globalThis.localStorage?.getItem(chiave(utente)) ?? null;
  } catch {
    return null;
  }
}

export function segnaVisitati(utente: string) {
  try {
    globalThis.localStorage?.setItem(chiave(utente), new Date().toISOString());
  } catch {
    // se il browser blocca la memoria locale, pazienza: niente badge "nuovo"
  }
}
