// Tiene traccia di chi è collegato (sessione Supabase) e del suo profilo.
// Si usa nelle schermate con: const { session, profilo } = useAuth();
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';
import type { Profilo } from './tipi';

type StatoAuth = {
  session: Session | null;
  profilo: Profilo | null;
  caricamento: boolean;
  ricaricaProfilo: () => Promise<void>;
  esci: () => Promise<void>;
};

const AuthContext = createContext<StatoAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [sessioneLetta, setSessioneLetta] = useState(false);
  const [profiloLetto, setProfiloLetto] = useState(false);

  // 1. Legge la sessione salvata e resta in ascolto di login/logout
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessioneLetta(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nuovaSessione) => {
      setSession(nuovaSessione);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const ricaricaProfilo = useCallback(async () => {
    if (!userId) {
      setProfilo(null);
      setProfiloLetto(true);
      return;
    }
    const { data } = await supabase.from('profili').select('*').eq('id', userId).maybeSingle();
    setProfilo((data as Profilo | null) ?? null);
    setProfiloLetto(true);
  }, [userId]);

  // 2. Quando cambia l'utente collegato, rilegge il suo profilo
  useEffect(() => {
    setProfiloLetto(false);
    ricaricaProfilo();
  }, [ricaricaProfilo]);

  const esci = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const caricamento = !sessioneLetta || !profiloLetto;

  return (
    <AuthContext.Provider value={{ session, profilo, caricamento, ricaricaProfilo, esci }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const stato = useContext(AuthContext);
  if (!stato) throw new Error('useAuth va usato dentro <AuthProvider>');
  return stato;
}
