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

// Un'opzione può essere anche un preventivo (ditta, importo, file) — colonne di supabase/06-...sql
export type OpzioneSondaggio = {
  id: string;
  testo: string;
  ordine: number;
  ditta?: string | null;
  importo?: number | null;
  preventivo_path?: string | null;
  preventivo_nome?: string | null;
};

export type Sondaggio = {
  id: string;
  domanda: string;
  descrizione: string | null;
  modalita: ModalitaVoto;
  scadenza: string | null;
  chiuso: boolean;
  creato_il: string;
  sondaggi_opzioni: OpzioneSondaggio[];
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

// Dati riservati: li vedono solo l'interessato e l'amministratore (supabase/05-...sql)
export type Contatti = {
  id: string;
  cellulare: string | null;
  emergenza_nome: string | null;
  emergenza_telefono: string | null;
  consenso_privacy_il: string | null;
};

export type CategoriaAllegato = 'convocazione' | 'verbale' | 'altro';

export type AllegatoAssemblea = {
  id: string;
  categoria: CategoriaAllegato;
  percorso: string;
  nome_file: string;
  tipo_mime: string;
};

export type Assemblea = {
  id: string;
  titolo: string;
  data_ora: string;
  luogo: string | null;
  link_online: string | null;
  ordine_del_giorno: string | null;
  testo: string | null;
  creato_il: string;
  assemblee_allegati: AllegatoAssemblea[];
};

export type RispostaPresenza = 'presente' | 'assente' | 'delega';

export type Presenza = {
  assemblea_id: string;
  utente_id: string;
  risposta: RispostaPresenza;
  delegato: string | null;
  profilo?: { nome: string | null; appartamento: string | null } | null;
};

export type Documento = {
  id: string;
  titolo: string;
  cartella: string;
  percorso: string;
  nome_file: string;
  tipo_mime: string;
  creato_il: string;
};

export type CategoriaAllegatoLavoro = 'fattura' | 'garanzia' | 'foto' | 'altro';

export type Lavoro = {
  id: string;
  titolo: string;
  descrizione: string | null;
  data_lavoro: string;
  ditta: string | null;
  importo: number | null;
  garanzia_fino: string | null;
  lavori_allegati: { id: string; categoria: CategoriaAllegatoLavoro; percorso: string; nome_file: string; tipo_mime: string }[];
};

export type NumeroUtile = {
  id: string;
  nome: string;
  categoria: string;
  telefono: string | null;
  email: string | null;
  note: string | null;
};

export type Commento = {
  id: string;
  autore_id: string | null;
  testo: string;
  creato_il: string;
  autore: Autore;
};
