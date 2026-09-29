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

// Nome e appartamento di chi ha scritto qualcosa (letti con una "join" su profili)
export type Autore = { nome: string | null; appartamento: string | null } | null;

export type AllegatoAvviso = {
  id: string;
  percorso: string;
  nome_file: string;
  tipo_mime: string;
};

export type Avviso = {
  id: string;
  titolo: string;
  testo: string;
  creato_il: string;
  in_evidenza?: boolean; // colonna aggiunta da supabase/04-migliorie.sql
  autore: Autore;
  avvisi_allegati: AllegatoAvviso[];
};

export type StatoGuasto = 'aperto' | 'in_lavorazione' | 'chiuso';

export type Guasto = {
  id: string;
  titolo: string;
  descrizione: string;
  stato: StatoGuasto;
  nota_admin: string | null;
  autore_id: string | null;
  creato_il: string;
  aggiornato_il: string;
  autore: Autore;
  guasti_foto: { id: string; percorso: string }[];
};

export type ModalitaVoto = 'testa' | 'millesimi';

export type Sondaggio = {
  id: string;
  domanda: string;
  descrizione: string | null;
  modalita: ModalitaVoto;
  scadenza: string | null;
  chiuso: boolean;
  creato_il: string;
  sondaggi_opzioni: { id: string; testo: string; ordine: number }[];
};

export type RisultatoOpzione = {
  opzione_id: string;
  testo: string;
  voti_testa: number;
  voti_millesimi: number;
};

export type Movimento = {
  id: string;
  data: string;
  descrizione: string;
  categoria: string | null;
  tipo: 'entrata' | 'uscita';
  importo: number;
  giustificativo_path: string | null;
};
