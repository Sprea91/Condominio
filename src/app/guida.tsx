// Guida semplice: come installare l'app e come funziona ogni sezione.
// Si apre sia da "Accedi" (anche senza account) sia dalla Home. Il capitolo per l'amministratore
// compare solo a chi è amministratore.
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, List, Text, useTheme } from 'react-native-paper';

import { Pagina } from '@/components/Pagina';
import { Nota, Riquadro, Titoletto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { eGiaInstallata, installa, puoInstallare, quandoCambia, sistema } from '@/lib/installa';
import { INDIRIZZO_SITO } from '@/lib/recupero';

// Passaggi numerati
function Passi({ passi }: { passi: ReactNode[] }) {
  const tema = useTheme();
  return (
    <View style={styles.passi}>
      {passi.map((p, i) => (
        <View key={i} style={styles.passo}>
          <View style={[styles.numero, { backgroundColor: tema.colors.primaryContainer }]}>
            <Text variant="labelLarge" style={{ color: tema.colors.onPrimaryContainer }}>
              {i + 1}
            </Text>
          </View>
          <Text variant="bodyLarge" style={styles.flex}>
            {p}
          </Text>
        </View>
      ))}
    </View>
  );
}

function B({ children }: { children: ReactNode }) {
  return <Text style={styles.grassetto}>{children}</Text>;
}

// Capitolo che si apre e si chiude con un tocco
function Capitolo({ titolo, icona, children, aperto = false }: { titolo: string; icona: string; children: ReactNode; aperto?: boolean }) {
  const [espanso, setEspanso] = useState(aperto);
  const tema = useTheme();
  return (
    <Riquadro style={styles.capitolo}>
      <List.Accordion
        title={titolo}
        titleStyle={styles.titoloCapitolo}
        titleNumberOfLines={2}
        left={(p) => <List.Icon {...p} icon={icona} color={tema.colors.primary} />}
        expanded={espanso}
        onPress={() => setEspanso(!espanso)}
        style={{ backgroundColor: tema.colors.surface }}
      >
        <View style={styles.contenuto}>{children}</View>
      </List.Accordion>
    </Riquadro>
  );
}

function Sezione({ icona, titolo, children }: { icona: string; titolo: string; children: ReactNode }) {
  const tema = useTheme();
  return (
    <View style={styles.sezione}>
      <View style={styles.rigaSezione}>
        <Icon source={icona} size={20} color={tema.colors.primary} />
        <Text variant="titleSmall">{titolo}</Text>
      </View>
      <Text variant="bodyMedium" style={styles.testo}>
        {children}
      </Text>
    </View>
  );
}

export default function Guida() {
  const { profilo } = useAuth();
  const admin = profilo?.ruolo === 'amministratore';
  const mioSistema = sistema();
  const [installabile, setInstallabile] = useState(puoInstallare());
  const [installata, setInstallata] = useState(eGiaInstallata());

  useEffect(() => quandoCambia(() => setInstallabile(puoInstallare())), []);

  async function installaOra() {
    if (await installa()) setInstallata(true);
  }

  return (
    <Pagina titolo="Guida" sottotitolo="Come installare e usare l’app">
      {/* Installazione rapida */}
      {installata ? (
        <Riquadro style={styles.riga}>
          <Icon source="check-circle" size={24} color="#15803D" />
          <Text variant="bodyMedium" style={styles.flex}>
            Stai già usando l’app installata. Ottimo!
          </Text>
        </Riquadro>
      ) : installabile ? (
        <Riquadro evidenziato>
          <Text variant="titleMedium">Installa l’app con un tocco</Text>
          <Nota>Comparirà sulla schermata Home come le altre app.</Nota>
          <Button mode="contained" icon="download" onPress={installaOra}>
            Installa l’app
          </Button>
        </Riquadro>
      ) : null}

      <Titoletto>Installazione</Titoletto>
      <Nota>
        Non serve nessuno store: l’app si apre dal sito {INDIRIZZO_SITO.replace('https://', '')} e si aggiunge alla schermata
        Home.
      </Nota>

      <Capitolo titolo="iPhone e iPad" icona="apple" aperto={mioSistema === 'ios'}>
        <Passi
          passi={[
            <>
              Apri <B>Safari</B> (con altri browser su iPhone non funziona) e vai al sito del condominio.
            </>,
            <>
              Tocca il pulsante <B>Condividi</B> (il quadrato con la freccia verso l’alto, in basso al centro).
            </>,
            <>
              Scorri e tocca <B>Aggiungi alla schermata Home</B>.
            </>,
            <>
              Tocca <B>Aggiungi</B> in alto a destra. Ora trovi l’icona “Condominio” tra le tue app.
            </>,
          ]}
        />
      </Capitolo>

      <Capitolo titolo="Android" icona="android" aperto={mioSistema === 'android'}>
        <Passi
          passi={[
            <>
              Apri <B>Chrome</B> e vai al sito del condominio.
            </>,
            <>
              Tocca i <B>tre puntini ⋮</B> in alto a destra.
            </>,
            <>
              Tocca <B>Installa app</B> (oppure <B>Aggiungi a schermata Home</B>) e conferma.
            </>,
            <>L’icona “Condominio” compare tra le tue app.</>,
          ]}
        />
        <Nota>Se in questa pagina vedi il pulsante “Installa l’app”, basta premere quello.</Nota>
      </Capitolo>

      <Capitolo titolo="Computer" icona="monitor" aperto={mioSistema === 'pc'}>
        <Passi
          passi={[
            <>
              Con <B>Chrome</B> o <B>Edge</B>: nella barra dell’indirizzo tocca l’icona <B>Installa</B> (un monitor con la
              freccia) oppure usa il menu ⋮ → <B>Installa Condominio</B>.
            </>,
            <>Se preferisci, puoi anche usarla semplicemente dal browser, salvando il sito tra i preferiti.</>,
          ]}
        />
      </Capitolo>

      <Titoletto>Primi passi</Titoletto>
      <Capitolo titolo="Registrazione e accesso" icona="account-plus-outline">
        <Passi
          passi={[
            <>
              Nella schermata di accesso tocca <B>Registrati</B> e inserisci nome, appartamento, email, cellulare e una password.
            </>,
            <>
              Apri l’<B>email di conferma</B> che ricevi e tocca il link (se non la trovi guarda nella posta indesiderata).
            </>,
            <>
              Vedrai “<B>Quasi fatto!</B>”: l’amministratore deve approvarti. Quando l’ha fatto, tocca “Controlla di nuovo”.
            </>,
            <>
              Hai dimenticato la password? Nella schermata di accesso tocca <B>Password dimenticata?</B> e segui l’email.
            </>,
          ]}
        />
        <Nota>Il cellulare e il contatto di emergenza li vede solo l’amministratore.</Nota>
      </Capitolo>

      <Titoletto>Le sezioni</Titoletto>
      <Capitolo titolo="Cosa trovi nell’app" icona="view-grid-outline">
        <Sezione icona="home-outline" titolo="Home">
          Gli appuntamenti in arrivo (es. il sopralluogo dell’idraulico), gli avvisi importanti, la prossima assemblea, i
          sondaggi in scadenza, le rate da pagare e il saldo del condominio. In alto c’è la ricerca che cerca in tutte le
          sezioni.
        </Sezione>
        <Sezione icona="bullhorn-outline" titolo="Avvisi">
          Le comunicazioni ufficiali, con eventuali PDF o foto. Quelli nuovi hanno l’etichetta “Nuovo”. Se un avviso ha un
          appuntamento (giorno e ora), lo vedi in arancione e con l’icona del calendario lo salvi sul telefono.
        </Sezione>
        <Sezione icona="tools" titolo="Guasti">
          Hai notato un problema? Tocca “Segnala guasto”, descrivilo e aggiungi una foto. Puoi seguirne lo stato (aperto, in
          lavorazione, risolto) e commentare, per esempio “anche da me”.
        </Sezione>
        <Sezione icona="vote-outline" titolo="Sondaggi">
          Vota le decisioni comuni. Prima di votare puoi aprire i documenti allegati (relazioni, preventivi in PDF). Alcuni si
          contano per testa, altri per millesimi; alcuni permettono più scelte. Puoi cambiare voto finché il sondaggio è
          aperto. I risultati si vedono dopo aver votato.
        </Sezione>
        <Sezione icona="calendar-account-outline" titolo="Assemblee">
          Data, ora, luogo, ordine del giorno e documenti. Rispondi “Ci sarò / Non ci sarò / Delego” e salvala nel
          calendario del telefono. Dopo l’assemblea trovi qui il verbale.
        </Sezione>
        <Sezione icona="cash-multiple" titolo="Le mie rate">
          Quanto devi pagare e entro quando, con l’IBAN e la causale del bonifico da copiare. Dopo il bonifico tocca “Ho
          pagato” (puoi allegare la ricevuta): l’amministratore confermerà. Le tue rate le vedi solo tu.
        </Sezione>
        <Sezione icona="wallet-outline" titolo="Conto spese">
          Il saldo, le entrate e le uscite con le fatture, la tua quota in base ai millesimi e il rendiconto scaricabile in Excel
          o PDF.
        </Sezione>
        <Sezione icona="folder-outline" titolo="Documenti, Preventivi, Storico lavori, Scadenze, Numeri utili">
          Regolamento e polizze; i preventivi delle ditte a confronto (chiunque può aggiungerne); i lavori fatti con fatture e garanzie; le scadenze da ricordare; i numeri dell’idraulico,
          dell’elettricista e delle emergenze (un tocco e parte la chiamata; con la matita si correggono).
        </Sezione>
        <Sezione icona="domain" titolo="Ditte e fornitori">
          L’elenco delle ditte che hanno lavorato per il condominio, con contatti, lavori, preventivi, guasti seguiti e quanto
          sono state pagate. Quando scrivi il nome di una ditta, l’app ti suggerisce quelle già conosciute.
        </Sezione>
        <Sezione icona="account-circle-outline" titolo="Il mio profilo">
          Tocca il cerchio con le tue iniziali in alto a destra nella Home: puoi cambiare nome, cellulare, contatto di
          emergenza e password, oppure uscire.
        </Sezione>
      </Capitolo>

      <Capitolo titolo="Domande frequenti" icona="help-circle-outline">
        <Sezione icona="refresh" titolo="Non vedo le novità">
          Trascina la pagina verso il basso per aggiornarla. Quando esce una nuova versione dell’app compare in basso il
          messaggio “È disponibile una nuova versione”: tocca Aggiorna. Se non basta, chiudi e riapri l’app.
        </Sezione>
        <Sezione icona="shield-lock-outline" titolo="Chi vede i miei dati?">
          Nome e appartamento li vedono gli altri condòmini. Cellulare, contatto di emergenza e le tue rate solo tu e
          l’amministratore. Nessuno vede cosa hai votato.
        </Sezione>
        <Sezione icona="cellphone-off" titolo="Serve internet?">
          Sì, l’app legge i dati dal server del condominio: senza connessione non si aggiorna.
        </Sezione>
      </Capitolo>

      {admin && (
        <>
          <Titoletto>Per l’amministratore</Titoletto>
          <Capitolo titolo="Cosa puoi fare in più" icona="shield-crown-outline">
            <Sezione icona="account-group-outline" titolo="Gestione condòmini">
              Dalla Home. Approvi le registrazioni (assegnando appartamento e millesimi), vedi cellulari e contatti di
              emergenza, nomini altri amministratori. In fondo c’è il pannello Permessi.
            </Sezione>
            <Sezione icona="toggle-switch-outline" titolo="Permessi">
              Decidi quali azioni possono fare tutti: stato dei guasti, numeri utili, documenti, storico lavori, scadenze.
              Eliminare resta a te o a chi ha inserito la cosa.
            </Sezione>
            <Sezione icona="bullhorn-outline" titolo="Avvisi, sondaggi, assemblee">
              Con il pulsante “+” in basso a destra di ogni sezione. Un avviso “in evidenza” compare in cima alla Home di tutti;
              se aggiungi giorno e ora diventa un appuntamento ben visibile nella Home. I sondaggi possono essere per testa o
              millesimi, a scelta multipla, con documenti da consultare o un confronto tra preventivi; con “Modifica” li correggi
              (le opzioni solo finché nessuno ha votato). Le assemblee possono essere ordinarie o straordinarie.
            </Sezione>
            <Sezione icona="file-compare" titolo="Preventivi">
              Crea una richiesta (es. “Rifacimento tetto”) e raccogli i preventivi delle ditte. Con “Metti ai voti” nasce il
              sondaggio di confronto; quando uno è accettato, “Registra nello storico lavori” compila il lavoro da solo.
            </Sezione>
            <Sezione icona="cash-check" titolo="Rate">
              “Nuova rata”: totale, scadenza, divisione (millesimi, parti uguali, a mano) e causale del bonifico. Quando un
              condòmino segnala “Ho pagato” lo vedi nella Home: apri la rata, guarda la ricevuta e premi Conferma o Rifiuta.
              Con “Modifica rata” correggi titolo, scadenza e importi non ancora pagati; in fondo trovi chi ha pagato, chi no e
              lo storico di tutto. Chi è stato approvato dopo l’emissione compare in “Condòmini senza questa rata”: lo aggiungi con un tocco. L’IBAN si inserisce in “Le mie rate”.
            </Sezione>
            <Sezione icona="wallet-plus-outline" titolo="Conto spese">
              Aggiungi entrate e uscite con la fattura allegata. Il rendiconto annuale si scarica in Excel o PDF.
            </Sezione>
          </Capitolo>
        </>
      )}
    </Pagina>
  );
}

const styles = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  capitolo: { padding: 0, overflow: 'hidden' },
  titoloCapitolo: { fontWeight: '600' },
  contenuto: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  passi: { gap: 12 },
  passo: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  numero: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  grassetto: { fontWeight: 'bold' },
  sezione: { gap: 4 },
  rigaSezione: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testo: { lineHeight: 21 },
});
