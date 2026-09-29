// Genera le icone PNG dell'app (per "Aggiungi a schermata Home") partendo da public/icona.svg.
// Si esegue su GitHub Actions dopo "expo export": i PNG non passano mai dal PC,
// dove la sincronizzazione aziendale aggiungerebbe l'etichetta di riservatezza.
// Uso: node scripts/icone.mjs <cartella di destinazione>
import sharp from 'sharp';

const destinazione = process.argv[2] ?? 'dist';
const svg = 'public/icona.svg';

const icone = [
  ['icona-192.png', 192],
  ['icona-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
];

for (const [nome, lato] of icone) {
  await sharp(svg, { density: 300 }).resize(lato, lato).png().toFile(`${destinazione}/${nome}`);
  console.log(`creata ${destinazione}/${nome}`);
}
