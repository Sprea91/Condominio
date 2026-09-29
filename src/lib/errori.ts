// Traduce in italiano i messaggi di errore più comuni di Supabase Auth.
import type { AuthError } from '@supabase/supabase-js';

const MESSAGGI: Record<string, string> = {
  invalid_credentials: 'Email o password errati.',
  email_not_confirmed: "Email non ancora confermata: apri il link che ti abbiamo inviato.",
  user_already_exists: 'Esiste già un utente con questa email.',
  weak_password: 'Password troppo debole: usa almeno 6 caratteri.',
  over_email_send_rate_limit: 'Troppe email inviate: riprova tra qualche minuto.',
  over_request_rate_limit: 'Troppi tentativi: riprova tra qualche minuto.',
  validation_failed: 'Controlla i dati inseriti.',
};

export function messaggioErrore(errore: AuthError): string {
  return (errore.code && MESSAGGI[errore.code]) || `Errore: ${errore.message}`;
}
