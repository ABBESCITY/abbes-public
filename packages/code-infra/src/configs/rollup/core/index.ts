import fs from 'node:fs';
import path from 'node:path';
import module from 'node:module';

import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import resolveCommonjs from '@rollup/plugin-commonjs';

import esbuild from 'rollup-plugin-esbuild';
import preserveDirectives from 'rollup-plugin-preserve-directives';

import { extractPackageName } from '../utils';
import { getInputByPackageJson } from '#/utils/packageJson';
import { BUILD_ASSETS_DIR, SOURCE_DIR, TS_BUILD_CONFIG_FILE } from '#/constants/config';

import type rollup from 'rollup';
import type { ConfigContext } from '#/types/rollupConfig';
import type { PackageJson } from 'type-fest';

export function createRollupInput(configCtx: ConfigContext): Record<string, string> {
  const { inputType, packageJson, packagePath } = configCtx;

  if (inputType === 'single') {
    return { index: path.join(packagePath, SOURCE_DIR, 'index.ts') };
  } else {
    const inputPathList = getInputByPackageJson(packageJson as PackageJson);
    return Object.fromEntries(
      Object.entries(inputPathList).map(([key, keyPath]) => [key, path.join(packagePath, keyPath)]),
    );
  }
}

export function createRollupExternal(
  configCtx: ConfigContext,
  options: { additional?: string[]; includeBuiltins?: boolean } = {},
) {
  const { packagePath } = configCtx;
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
  configCtx: ConfigContext,
  options: { needTerser?: boolean; additional?: rollup.Plugin[] } = {},
) {
  const { packagePath } = configCtx;
  const { needTerser, additional } = options;

  const basePlugins = [
    nodeResolve(),
    resolveCommonjs(),
    json(),
    esbuild({ tsconfig: path.join(packagePath, TS_BUILD_CONFIG_FILE), sourceMap: false }),
    preserveDirectives(),
  ];

  if (needTerser) basePlugins.push(terser());
  if (additional) basePlugins.push(...additional);

  return basePlugins;
}

export function createRollupOutput(configCtx: ConfigContext, options: { isSourceMap?: boolean } = {}) {
  const { isSourceMap } = options;
  const { packagePath, outputDir: outputDir } = configCtx;

  return configCtx.bundleTypes.map((bundleType) => ({
    dir: path.join(packagePath, outputDir.base),
    format: bundleType,
    sourcemap: isSourceMap,
    preserveModules: true,
    preserveModulesRoot: 'src',
    entryFileNames: `${outputDir.js}/${bundleType}/[name].${bundleType === 'cjs' ? 'cjs' : 'mjs'}`,
    assetFileNames: (assetInfo: any) => {
      const originalFileName = assetInfo.originalFileNames?.[0];
      const relativePath = path.relative('src', originalFileName);
      return path.join(BUILD_ASSETS_DIR, relativePath);
    },
  }));
}
