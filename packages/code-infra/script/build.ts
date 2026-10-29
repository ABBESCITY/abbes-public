import { cp, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = resolve(packageRoot, 'dist');

// tsdown reads the package's tsdown.config.ts and writes the executable and
// library bundles into dist/bin and dist/lib respectively.
await execa('pnpm', ['exec', 'tsdown'], { cwd: packageRoot, stdio: 'inherit' });

await Promise.all([
  cp(resolve(packageRoot, 'README.md'), resolve(distRoot, 'README.md')),
  (async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(packageRoot, 'package.json'), 'utf8'),
    ) as Record<string, unknown>;

    packageJson.bin = { 'code-infra': './bin/index.mjs' };
    packageJson.exports = {
      '.': {
        types: './lib/index.d.mts',
        import: './lib/index.mjs',
      },
    };
    packageJson.types = './lib/index.d.mts';

    await writeFile(
      resolve(distRoot, 'package.json'),
      `${JSON.stringify(packageJson, null, 2)}\n`,
    );
  })(),
]);
