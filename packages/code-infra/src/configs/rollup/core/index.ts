import fs from 'node:fs';
import path from 'node:path';
import module from 'node:module';

import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import resolveCommonjs from '@rollup/plugin-commonjs';

import esbuild from 'rollup-plugin-esbuild';
import jsNoEmit from 'rollup-plugin-no-emit';

import { extractPackageName } from '../utils';
import { BUILD_ASSETS_DIR, BUILD_DIR, BUILD_JS_DIR, TS_BUILD_CONFIG_FILE } from '#/constants/config';

import type rollup from 'rollup';
import type { BundleType, ConfigMeta } from '#/types/rollupConfig';

export function createRollupInput(
  configMeta: ConfigMeta,
  inputPathList: Record<string, string>,
): Record<string, string> {
  const { packagePath } = configMeta;

  return Object.fromEntries(
    Object.entries(inputPathList).map(([key, keyPath]) => [key.slice(2) || 'index', path.join(packagePath, keyPath)]),
  );
}

export function createRollupExternal(
  configMeta: ConfigMeta,
  options: { additional?: string[]; includeBuiltins?: boolean } = {},
) {
  const { packagePath } = configMeta;
  const { additional, includeBuiltins } = options;

  let builtins = new Set();
  const pkgPath = path.join(packagePath, 'package.json');
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

export function createRollupPlugins(
  configMeta: ConfigMeta,
  options: { needTerser?: boolean; hasAssets?: boolean; additional?: rollup.Plugin[] } = {},
) {
  const { packagePath } = configMeta;
  const { needTerser, additional, hasAssets = false } = options;

  const basePlugins = [
    nodeResolve(),
    resolveCommonjs(),
    json(),
    esbuild({ tsconfig: path.join(packagePath, TS_BUILD_CONFIG_FILE) }),
  ];

  if (needTerser) basePlugins.push(terser());
  if (hasAssets) basePlugins.push(jsNoEmit({ match: (_fileName, output) => output.type === 'chunk' }));
  if (additional) basePlugins.push(...additional);

  return basePlugins;
}

export function createRollupOutput(
  configMeta: ConfigMeta,
  options: { isAsset?: boolean; directory?: string; isSourceMap?: boolean } = {},
) {
  const { packagePath } = configMeta;
  const { directory, isAsset, isSourceMap } = options;

  const bundleList: { bundleType: BundleType; bundleOutputDir: string; isAsset?: boolean }[] =
    configMeta.bundleTypes.map((bundleType) => ({
      bundleType,
      bundleOutputDir: isAsset
        ? path.join(packagePath, ...(directory ? [directory] : [BUILD_DIR, BUILD_ASSETS_DIR]))
        : path.join(packagePath, ...(directory ? [directory] : [BUILD_DIR, BUILD_JS_DIR, bundleType])),
    }));

  return bundleList.map(({ bundleType, bundleOutputDir }) => ({
    dir: bundleOutputDir,
    format: bundleType,
    sourcemap: isSourceMap,
    preserveModules: true,
    preserveModulesRoot: 'src',
  }));
}
