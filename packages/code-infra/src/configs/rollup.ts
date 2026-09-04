import path from 'path';
import { defu } from 'defu';
import rollup, { defineConfig } from 'rollup';

// Rollup plugins
import styles from 'rollup-plugin-styles';
import esbuild from 'rollup-plugin-esbuild';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

import extractCssFromBundle from '../plugins/extractCssFromBundle';

import {
  ROLLUP_DEFAULT_SOURCE_ROOT_DIR,
  ROLLUP_DEFAULT_OUTPUT_ROOT_DIR,
  ROLLUP_DEFAULT_ENTRY_FILE,
  ROLLUP_DEFAULT_OUTPUT_ASSETS_DIR,
} from '../constants/config';

import type { InputOption } from 'rollup';
import type { BundleOption, BundleType, CusOutputOptions } from '../types/rollup';

export function createRollupInput(inputEntry: string, entryType: 'directory' | 'file'): InputOption {
  if (entryType === 'directory') {
    const resolvedPath = path.resolve(inputEntry);
  }
  return inputEntry;
}

export function createRollupAssetOutput(assetsDir: string = ROLLUP_DEFAULT_OUTPUT_ASSETS_DIR): CusOutputOptions {
  return {
    dir: assetsDir,
    format: 'esm',
    outputType: 'asset',
    assetFileNames: assetsDir,
  };
}

export function createRollupJsOutput(
  bundles: BundleType | BundleType[] = 'esm',
  bundleOption: BundleOption = {},
): CusOutputOptions[] {
  if (Array.isArray(bundles)) {
    return bundles.map((bundle) => ({
      dir: `${ROLLUP_DEFAULT_OUTPUT_ROOT_DIR}/${bundle}`,
      format: bundle,
      outputType: 'js',
      preserveModules: true,
      preserveModulesRoot: ROLLUP_DEFAULT_SOURCE_ROOT_DIR,
      ...bundleOption,
    }));
  } else {
    return [
      {
        dir: `${ROLLUP_DEFAULT_OUTPUT_ROOT_DIR}/${bundles}`,
        format: bundles,
        outputType: 'js',
        preserveModules: true,
        preserveModulesRoot: ROLLUP_DEFAULT_SOURCE_ROOT_DIR,
        ...bundleOption,
      },
    ];
  }
}

export function createBaseRollupConfig(customConfig: rollup.RollupOptions): rollup.RollupOptions {
  const assetOutput = createRollupAssetOutput();

  return defu(
    defineConfig({
      input: ROLLUP_DEFAULT_ENTRY_FILE,
      plugins: [resolve(), commonjs(), esbuild(), styles({ mode: 'emit' }), extractCssFromBundle()],
      output: [assetOutput, ...createRollupJsOutput('esm')],
    }),
    customConfig,
  );
}
