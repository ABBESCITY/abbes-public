import { cp, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';

const packageRoot = dirname(fileURLToPath(import.meta.url));
const distRoot = resolve(packageRoot, 'dist');

async function syncDistFiles() {
  await Promise.all([
    cp(resolve(packageRoot, 'README.md'), resolve(distRoot, 'README.md')),
    (async () => {
      const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8')) as Record<
        string,
        unknown
      >;

      packageJson.bin = { 'code-infra': './bin/index.mjs' };
      packageJson.exports = { '.': { types: './lib/index.d.mts', import: './lib/index.mjs' } };
      packageJson.types = './lib/index.d.mts';

      await writeFile(resolve(distRoot, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
    })(),
  ]);
}

export default defineConfig({
  entry: { 'bin/index': 'src/bin.ts', 'lib/index': 'src/index.ts' },
  outDir: 'dist',
  format: ['esm'],
  dts: true,
  clean: true,
  outputOptions: { chunkFileNames: 'shared/[name]-[hash].js' },
  onSuccess: async () => {
    await syncDistFiles();
  },
});
