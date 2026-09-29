// Client Supabase unico per tutta l'app (schema ufficiale della guida Expo).
// La sessione di login viene salvata in "localStorage" (vedi sessione.ts / sessione.native.ts).
import './sessione';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Nel browser il link di conferma email porta la sessione nell'indirizzo:
    // leggerla fa entrare l'utente senza dover rifare il login.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
