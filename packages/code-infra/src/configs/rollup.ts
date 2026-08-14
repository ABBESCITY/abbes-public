import path from 'path';
import { defu } from 'defu';
import rollup, { defineConfig } from 'rollup';
import type { InputOption, OutputOptions } from 'rollup';

// Rollup plugins
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';

import type { BundleOption, BundleType } from '../types/rollup';

export const DEFAULT_INPUT = 'src/index.ts';
export const DEFAULT_BUNDLE_ROOT_DIR = 'build';

export function createRollupInput(inputEntry: string, entryType: 'directory' | 'file'): InputOption {
  if (entryType === 'directory') {
    const resolvedPath = path.resolve(inputEntry);
  }
  return inputEntry;
}

export function createRollupOutput(
  bundles: BundleType | BundleType[] = 'esm',
  bundleOption: BundleOption = {},
): OutputOptions | OutputOptions[] {
  if (Array.isArray(bundles)) {
    return bundles.map((bundle) => ({
      dir: `${DEFAULT_BUNDLE_ROOT_DIR}/${bundle}`,
      format: bundle,
      preserveModules: true,
      ...bundleOption,
    }));
  } else {
    return {
      dir: `${DEFAULT_BUNDLE_ROOT_DIR}/${bundles}`,
      format: bundles,
      preserveModules: true,
      ...bundleOption,
    };
  }
}

export function createBaseRollupConfig(customConfig: rollup.RollupOptions): rollup.RollupOptions {
  return defu(
    defineConfig({
      input: DEFAULT_INPUT,
      plugins: [resolve(), commonjs(), esbuild()],
      output: createRollupOutput('esm', {}),
    }),
    customConfig,
  );
}
