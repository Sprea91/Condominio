// Tiene traccia di chi è collegato (sessione Supabase) e del suo profilo.
// Si usa nelle schermate con: const { session, profilo } = useAuth();
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { arrivoDaRecupero } from './recupero';
import { supabase } from './supabase';
import type { Profilo } from './tipi';

type StatoAuth = {
  session: Session | null;
  profilo: Profilo | null;
  caricamento: boolean;
  // true se l'utente è arrivato dal link "password dimenticata" e deve sceglierne una nuova
  recupero: boolean;
  fineRecupero: () => void;
  ricaricaProfilo: () => Promise<void>;
  esci: () => Promise<void>;
};

const AuthContext = createContext<StatoAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profiloLetto, setProfiloLetto] = useState<Profilo | null>(null);
  // id dell'utente di cui è stato letto il profilo (serve a sapere se è ancora da caricare)
  const [profiloLettoPer, setProfiloLettoPer] = useState<string | null>(null);
  const [sessioneLetta, setSessioneLetta] = useState(false);
  const [recupero, setRecupero] = useState(arrivoDaRecupero);

  // 1. Legge la sessione salvata e resta in ascolto di login/logout
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessioneLetta(true);
    });
    const { data } = supabase.auth.onAuthStateChange((evento, nuovaSessione) => {
      setSession(nuovaSessione);
      if (evento === 'PASSWORD_RECOVERY') setRecupero(true);
      if (evento === 'SIGNED_OUT') setRecupero(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const ricaricaProfilo = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('profili').select('*').eq('id', userId).maybeSingle();
    setProfiloLetto((data as Profilo | null) ?? null);
    setProfiloLettoPer(userId);
  }, [userId]);

  // 2. Quando cambia l'utente collegato, rilegge il suo profilo
  useEffect(() => {
    // Lettura dal database: lo stato cambia solo quando arrivano i dati (dopo l'await)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    ricaricaProfilo();
  }, [ricaricaProfilo]);

  const esci = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Il profilo vale solo se appartiene all'utente collegato adesso
  const profilo = userId && profiloLettoPer === userId ? profiloLetto : null;
  const caricamento = !sessioneLetta || (!!userId && profiloLettoPer !== userId);

  return (
    <AuthContext.Provider
      value={{ session, profilo, caricamento, recupero, fineRecupero: () => setRecupero(false), ricaricaProfilo, esci }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const stato = useContext(AuthContext);
  if (!stato) throw new Error('useAuth va usato dentro <AuthProvider>');
  return stato;
}
