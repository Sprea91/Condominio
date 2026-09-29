// Tipi dei dati letti dal database (devono corrispondere a supabase/*.sql).

export type Ruolo = 'amministratore' | 'condomino';

export type Profilo = {
  id: string;
  email: string;
  nome: string | null;
  appartamento: string | null;
  appartamento_richiesto: string | null;
  millesimi: number;
  ruolo: Ruolo;
  approvato: boolean;
};
