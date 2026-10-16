import { defineConfig } from 'tsdown';

export default defineConfig([
  { entry: { index: 'src/bin.ts' }, outDir: 'dist/bin', format: ['esm'], dts: false, clean: true },
  { entry: { index: 'src/index.ts' }, outDir: 'dist/lib', format: ['esm'], dts: true, clean: true },
]);
