# Piano: restyling moderno + migliorie (2026-09-29)

## Stile
- [x] Tema Paper personalizzato chiaro/scuro (src/lib/tema.ts), font Inter, colori moderni, angoli arrotondati
- [x] Intestazione nuova (titolo grande, freccia), sfondo morbido, card con bordo leggero
- [x] Componenti: Vuoto (stato vuoto con icona), Tessera (numero + etichetta), Etichetta stato

## Home
- [x] Saluto + appartamento, card saldo, griglia sezioni con contatori (avvisi nuovi, guasti aperti, sondaggi da votare)
- [x] Anteprima ultimo avviso; per admin: registrazioni in attesa

## Nuove funzioni
- [x] Profilo: modifica nome, cambio password, esci
- [x] Password dimenticata (email di recupero + schermata nuova password)
- [x] Avvisi: "in evidenza" (fissati in alto) + badge "nuovo" su quelli non letti
- [x] Spese: filtro per anno, spese per categoria, "la tua quota" in base ai millesimi
- [x] PWA: manifest, colore tema, icona per "Aggiungi a Home" (icone generate in GitHub Actions da SVG)

## SQL
- [x] supabase/04-migliorie.sql: avvisi.in_evidenza, funzione aggiorna_mio_nome
- L'app deve funzionare anche se 04 non è ancora stato eseguito (ordinamento lato app)

## Regole
- Icone PNG locali ricevono etichetta MSIP "Confidential": mai committarle
- Verifica: tsc + lint + export web + anteprima locale con admin finto, poi push
