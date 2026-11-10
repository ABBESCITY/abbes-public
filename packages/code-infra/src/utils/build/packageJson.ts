import fs from 'node:fs';
import path from 'node:path';

import { PackageJson } from 'type-fest';
import { getRelativePath } from '../path';
import { isExtensionOf, isPathExists, RewritableValue, rewriteEntryValue } from '../other';

import { EXTENSION_JS, EXTENSION_TS } from '#/constants/extension';

import type { BuildContext } from '#/types/build';
import type { PackageOutputDir } from '#/types/packageJson';

export const BUNDLE_TYPE_EXPORT_MAP: Record<string, string> = { esm: 'import', cjs: 'require' };
export const BUNDLE_EXTENSION_EXPORT_MAP: Record<string, string> = { import: '.mjs', require: '.cjs', types: '.d.ts' };

/** Build the output path for a file based on its relative path and output directory. */
function buildOutPath(relativePath: string, outputDir: string, originalExt: string, newExt: string) {
  const dirPrefix = outputDir === '.' ? '' : `${outputDir}/`;
  const base = `./${dirPrefix}${relativePath}`;
  return newExt ? `${base.slice(0, base.length - originalExt.length)}${newExt}` : base;
}

/** Build the export conditions and their output directories for a source file. */
function createBundleMeta(
  ext: string,
  buildCtx: BuildContext,
  outputDir: PackageOutputDir,
): [keyof typeof BUNDLE_EXTENSION_EXPORT_MAP, string][] {
  const bundleMeta: [keyof typeof BUNDLE_EXTENSION_EXPORT_MAP, string][] = [];

  for (const bundleType of buildCtx.bundleTypes) {
    const keyword = BUNDLE_TYPE_EXPORT_MAP[bundleType] ?? bundleType;
    if (!outputDir.jsDir) throw new Error(`JavaScript output directory is not defined.`);
    bundleMeta.push([keyword, path.join(outputDir.jsDir, bundleType)]);
  }

  if (isExtensionOf(ext, EXTENSION_TS)) {
    if (!outputDir.declareDir) throw new Error(`Declaration directory is not defined.`);
    bundleMeta.push(['types', outputDir.declareDir]);
  }

  return bundleMeta;
}

/** Rewrite the path of a leaf file to its corresponding output paths. */
async function rewriteKeywordLeafPath(
  leafPath: string,
  buildCtx: BuildContext,
  outputDir: PackageOutputDir,
  needExpand?: boolean,
): Promise<Record<string, string> | string> {
  const sourcePath = path.join(buildCtx.packagePath, leafPath);
  if (!(await isPathExists(sourcePath))) {
    throw new Error(`The leaf file "${sourcePath}" does not exist in the package.`);
  }

  const rel = getRelativePath(path.join(buildCtx.packagePath, 'src'), sourcePath);
  const ext = path.extname(rel);

  if (!isExtensionOf(ext, EXTENSION_JS) && !isExtensionOf(ext, EXTENSION_TS)) {
    throw new Error(`Unsupported the extension of leaf file "${sourcePath}".`);
  }

  const relativeBaseOutputDir = path.join(buildCtx.packagePath, buildCtx.baseOutputDir);

  if (needExpand) {
    return Object.fromEntries(
      createBundleMeta(ext, buildCtx, outputDir).map(([keyword, outputDir]) => {
        const relativeOutputDir = getRelativePath(relativeBaseOutputDir, outputDir);
        return [keyword, buildOutPath(rel, relativeOutputDir, ext, BUNDLE_EXTENSION_EXPORT_MAP[keyword])];
      }),
    );
  } else {
    if (!outputDir.jsDir) throw new Error(`JavaScript output directory is not defined.`);
    const relativeOutputDir = getRelativePath(relativeBaseOutputDir, outputDir.jsDir);
    return buildOutPath(rel, relativeOutputDir, ext, BUNDLE_EXTENSION_EXPORT_MAP[buildCtx.bundleTypes[0]]);
  }
}

/** Rewrite the package.json keyword fields (bin, exports, imports) for the build output. */
async function rewritePackageKeyWord(
  keyword: string,
  original: Record<string, string>,
  buildCtx: BuildContext,
  outputDir: PackageOutputDir,
): Promise<Record<string, unknown>> {
  const newExports: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(original)) {
    newExports[key] = await rewriteEntryValue(
      value as RewritableValue,
      async (leafPath) => await rewriteKeywordLeafPath(leafPath, buildCtx, outputDir, keyword === 'exports'),
    );
  }

  return newExports;
}

/** Rewrite the package.json file for the build output, including bin, exports, and imports fields. */
export async function rewritePackageJson(packageJson: PackageJson, buildCtx: BuildContext) {
  // Delete published not must need
  delete packageJson.scripts;
  delete packageJson.devDependencies;

  const { bin: originalBin, exports: originalExports, imports: originalImports, ...rest } = packageJson;
  const newPackageJson: PackageJson = { ...rest };
  const outputDir = {
    jsDir: buildCtx.outputResults.find((result) => result.outputType === 'JavaScript')?.outputPath,
    declareDir: buildCtx.outputResults.find((result) => result.outputType === 'Declaration')?.outputPath,
  };

  console.log(buildCtx.outputResults.filter((result) => result.outputType === 'JavaScript'));

  if (originalBin) {
    newPackageJson.bin = (await rewritePackageKeyWord(
      'bin',
      originalBin as Record<string, string>,
      buildCtx,
      outputDir,
    )) as PackageJson['bin'];
  }

  if (originalImports) {
    newPackageJson.imports = (await rewritePackageKeyWord(
      'imports',
      originalImports as Record<string, string>,
      buildCtx,
      outputDir,
    )) as PackageJson['imports'];
  }

  if (originalExports) {
    newPackageJson.exports = (await rewritePackageKeyWord(
      'exports',
      originalExports as Record<string, string>,
      buildCtx,
      outputDir,
    )) as PackageJson['exports'];
  }

  await fs.promises.writeFile(
    path.join(buildCtx.outputTempDir, 'package.json'),
    JSON.stringify(newPackageJson, null, 2),
    'utf-8',
  );

  buildCtx.outputResults.push({
    outputType: 'PackageJson',
    outputPath: path.join(buildCtx.packagePath, buildCtx.baseOutputDir, 'package.json'),
    outputTempPath: path.join(buildCtx.outputTempDir, 'package.json'),
  });
}
