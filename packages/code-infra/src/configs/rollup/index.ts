import fs from 'node:fs';
import path from 'node:path';

import { getPackagePath } from '#/utils/path';
import { validatePackageJson } from '#/utils/packageJson';
import { createBaseRollupConfig } from './content/baseConfig';

import { BUILD_ASSETS_DIR, BUILD_JS_DIR, OUTPUT_DIR } from '#/constants/config';

import type { RollupOptions } from 'rollup';
import type { PackageJson } from 'type-fest';
import type { BundleType, ConfigContext } from '#/types/rollupConfig';

export interface CreateRollupConfigOptions {
  packageName: string;
  inputType?: 'single' | 'multiple';
  outputDir?: string;
  hasAssets?: boolean;
  bundleTypes?: BundleType[];
  needSourceMap?: boolean;
  needTerserPlugin?: boolean;
  externalAdditional?: string[];
  rollupConfig?: RollupOptions;
}

export function createRollupConfig({
  packageName,
  inputType = 'single',
  outputDir,
  hasAssets = false,
  bundleTypes = ['esm'],
  needSourceMap = false,
  needTerserPlugin = false,
  externalAdditional = [],
  rollupConfig,
}: CreateRollupConfigOptions) {
  const packagePath = getPackagePath(packageName);
  const packageJson = JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf-8')) as PackageJson;

  const validation = validatePackageJson(packageJson);
  if (!validation.valid) {
    throw new Error(`Validate package.json failed. errors: ${validation.errors?.[0]}`);
  }

  const baseOutputDir = outputDir ?? OUTPUT_DIR;

  const configContext: ConfigContext = {
    packageName,
    packagePath,
    packageJson,
    inputType,
    hasAssets,
    bundleTypes,
    needSourceMap,
    needTerserPlugin,
    outputDir: { base: baseOutputDir, js: BUILD_JS_DIR, asset: BUILD_ASSETS_DIR },
  };

  return createBaseRollupConfig(configContext, externalAdditional, rollupConfig);
}
