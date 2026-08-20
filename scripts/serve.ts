/**
 * Lance `ng serve` sur le port du worktree courant.
 *
 * Chaque worktree ouvert par `npm run ticket` porte un `.worktree-port` (gitignoré) : ce wrapper
 * le lit et le passe à `ng serve`, si bien que `npm start` sert le bon port sans rien à retenir.
 * À la racine du dépôt, où ce fichier n'existe pas, on retombe sur le 4200 habituel.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePortFile } from './ticket-lib';

const PORT_PAR_DEFAUT = 4200;

const [projet, ...reste] = process.argv.slice(2);
if (!projet) throw new Error('Usage : tsx scripts/serve.ts <projet> [options ng serve]');

const fichierPort = join(process.cwd(), '.worktree-port');
const port =
  parsePortFile(existsSync(fichierPort) ? readFileSync(fichierPort, 'utf8') : null) ??
  PORT_PAR_DEFAUT;

const enfant = spawn('ng', ['serve', projet, '--port', String(port), ...reste], {
  stdio: 'inherit',
  shell: true,
});

enfant.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
