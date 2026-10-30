import fs from 'node:fs';
import path from 'node:path';
import module from 'node:module';

import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import resolveCommonjs from '@rollup/plugin-commonjs';
import jsNoEmit from 'rollup-plugin-no-emit';

import { BUILD_ASSETS_DIR, BUILD_DIR, BUILD_JS_DIR, SOURCE_DIR } from '@/constants/config';

import { extractPackageName } from '../utils';
import { getChildDirectories } from '@/utils/path';

import type rollup from 'rollup';
import type { BundleType } from '@/types/rollupConfig';

export function createRollupInput(options: {
  packagePath: string;
  entryType?: 'single' | 'multiple';
  multiExclude?: string[];
}): string[] {
  const { packagePath, entryType = 'single', multiExclude = ['types'] } = options;
  const baseDirectory = `${packagePath}${SOURCE_DIR}`;

  if (entryType === 'single') {
    return [`${baseDirectory}/index.ts`];
  } else {
    return getChildDirectories(baseDirectory, multiExclude).map((dir) => `${dir}/index.ts`);
  }
}

export function createRollupExternal(options: {
  packagePath: string;
  additional?: string[];
  includeBuiltins?: boolean;
}) {
  const { packagePath, additional, includeBuiltins } = options;

  let builtins = new Set();
  const pkgPath = path.resolve(packagePath, 'package.json');
  const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const externals = new Set<string>([
    ...Object.keys(pkgContent.dependencies ?? {}),
    ...Object.keys(pkgContent.peerDependencies ?? {}),
    ...(additional ?? []),
  ]);

  if (includeBuiltins) {
    builtins = new Set(module.builtinModules.flatMap((m) => [m, `node:${m}`]));
  }

  return (id: string): boolean => {
    if (includeBuiltins && (builtins.has(id) || id.startsWith('node:'))) return true;
    if (externals.has(id)) return true;
    const pkg = extractPackageName(id);
    return pkg !== null && externals.has(pkg);
  };
}

export function createRollupPlugins(options: {
  needTerser: boolean;
  hasAssets: boolean;
  additional?: rollup.Plugin[];
}) {
  const { needTerser, additional, hasAssets = false } = options;

  const basePlugins = [nodeResolve(), resolveCommonjs(), json()];

  if (needTerser) basePlugins.push(terser());
  if (hasAssets) basePlugins.push(jsNoEmit());
  if (additional) basePlugins.concat(additional);

  return basePlugins;
}

export function createRollupOutput(options: {
  packagePath: string;
  isAsset?: boolean;
  bundles?: BundleType | BundleType[];
  directory?: string;
  isSourceMap?: boolean;
}) {
  const { isAsset, bundles = 'esm', packagePath, isSourceMap, directory } = options;

  const bundleList: { bundleType: BundleType; bundleOutputDir: string; isAsset?: boolean }[] = (
    Array.isArray(bundles) ? bundles : [bundles]
  ).map((bundle) => ({
    bundleType: bundle,
    bundleOutputDir: isAsset
      ? (directory ?? `${packagePath}${BUILD_DIR}/${BUILD_ASSETS_DIR}`)
      : (directory ?? `${packagePath}${BUILD_DIR}/${BUILD_JS_DIR}/${bundle}`),
  }));

  return bundleList.map(({ bundleType, bundleOutputDir }) => ({
    dir: bundleOutputDir,
    format: bundleType,
    sourceMap: isSourceMap,
    preserveModules: true,
    preserveModulesRoot: SOURCE_DIR,
    assetFileName: () => {},
  }));
}
