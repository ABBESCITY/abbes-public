import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { execa } from 'execa';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { watch: { type: 'boolean', short: 'w', default: false } },
  strict: false,
  allowPositionals: true,
});

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const tsdownArgs = ['exec', 'tsdown'];
if (values.watch) {
  tsdownArgs.push('--watch');
}

// tsdown reads the package's tsdown.config.ts and writes the executable and
// library bundles into dist/bin and dist/lib respectively.
await execa('pnpm', tsdownArgs, { cwd: packageRoot, stdio: 'inherit' });
