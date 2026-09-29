// Il link "reimposta password" arriva con "#...type=recovery" nell'indirizzo.
// Va letto PRIMA che Supabase lo elabori e lo cancelli: per questo il file
// viene importato in supabase.ts prima di creare il client.
import { Platform } from 'react-native';

export const arrivoDaRecupero =
  Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash.includes('type=recovery');

// Indirizzo a cui riporta il link nell'email di recupero (deve essere il "Site URL" di Supabase)
export const INDIRIZZO_SITO = 'https://sprea91.github.io/Condominio/';
