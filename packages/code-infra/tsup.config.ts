import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    outDir: 'dist/lib',
    format: ['esm'],
    dts: true,
    clean: true,
    splitting: true,
  },
  {
    entry: { index: 'bin/index.ts' },
    outDir: 'dist/bin',
    format: ['esm'],
    dts: false,
    splitting: true,
  },
]);
