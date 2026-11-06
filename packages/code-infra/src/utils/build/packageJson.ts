import fs from 'node:fs';
import path from 'node:path';

import { PackageJson } from 'type-fest';
import { getRelativePath } from '../path';
import { isExtensionOf, isPathExists, RewritableValue, rewriteEntryValue } from '../other';

import { EXTENSION_JS, EXTENSION_TS } from '#/constants/extension';

import type { BuildContext } from '#/types/build';

// ============================================
// Rewrite PackageJson
// ============================================

type PackageBin = NonNullable<PackageJson['bin']>;
type PackageImports = NonNullable<PackageJson['imports']>;
type PackageExports = NonNullable<PackageJson['exports']>;
type EntryTarget = PackageImports[keyof PackageImports];

export const BUNDLE_TYPE_EXPORT_MAP: Record<string, string> = { esm: 'import', cjs: 'require' };
export const BUNDLE_EXTENSION_EXPORT_MAP: Record<string, string> = { import: '.js', require: '.js', types: '.d.ts' };

/** Build the output path for a file based on its relative path and output directory. */
function buildOutPath(relativePath: string, outputDir: string, originalExt: string, newExt: string) {
  const dirPrefix = outputDir === '.' ? '' : `${outputDir}/`;
  const base = `./${dirPrefix}${relativePath}`;
  return newExt ? `${base.slice(0, base.length - originalExt.length)}${newExt}` : base;
}

/** Build the export conditions and their output directories for a source file. */
function createBundleMeta(ext: string, ctx: BuildContext): [keyof typeof BUNDLE_EXTENSION_EXPORT_MAP, string][] {
  const bundleMeta: [keyof typeof BUNDLE_EXTENSION_EXPORT_MAP, string][] = [];

  for (const bundleType of ctx.bundleType) {
    const keyword = BUNDLE_TYPE_EXPORT_MAP[bundleType] ?? bundleType;
    bundleMeta.push([keyword, ctx.jsOutputDir![bundleType]]);
  }

  if (isExtensionOf(ext, EXTENSION_TS)) {
    bundleMeta.push(['types', ctx.declareOutputDir!]);
  }

  return bundleMeta;
}

/** Rewrite the path of a leaf file to its corresponding output paths. */
async function rewriteLeafPath(leafPath: string, ctx: BuildContext): Promise<Record<string, string>> {
  const sourcePath = path.join(ctx.workspaceDir, leafPath);
  if (!(await isPathExists(sourcePath))) {
    throw new Error(`The leaf file "${sourcePath}" does not exist in the package.`);
  }

  const rel = getRelativePath(path.join(ctx.workspaceDir, 'src'), sourcePath);

  const ext = path.extname(rel);

  if (!isExtensionOf(ext, EXTENSION_JS) && !isExtensionOf(ext, EXTENSION_TS)) {
    throw new Error(`Unsupported the extension of leaf file "${sourcePath}".`);
  }

  return Object.fromEntries(
    createBundleMeta(ext, ctx).map(([keyword, outputDir]) => [
      keyword,
      buildOutPath(rel, outputDir, ext, BUNDLE_EXTENSION_EXPORT_MAP[keyword]),
    ]),
  );
}

/** Rewrite a relative target that points into the package source, keeping wildcard patterns intact. */
async function rewriteLocalTarget(target: string, ctx: BuildContext): Promise<EntryTarget> {
  // A wildcard target does not exist on disk, so map the pattern directly to the build output directories.
  if (target.includes('*')) {
    const rel = getRelativePath(path.join(ctx.workspaceDir, 'src'), path.join(ctx.workspaceDir, target));
    const ext = path.extname(rel);

    if (!isExtensionOf(ext, [EXTENSION_JS, EXTENSION_TS]) && ext !== '') {
      throw new Error(`Unsupported the extension of wildcard target "${target}".`);
    }

    const bundleMeta = createBundleMeta(ext, ctx);

    // An extensionless wildcard (e.g. `#/*`) can match TypeScript sources, so expose the declaration directory too.
    if (ext === '' && ctx.declareOutputDir) {
      bundleMeta.push(['types', ctx.declareOutputDir]);
    }

    return Object.fromEntries(
      bundleMeta.map(([keyword, outputDir]) => [
        keyword,
        buildOutPath(rel, outputDir, ext, BUNDLE_EXTENSION_EXPORT_MAP[keyword]),
      ]),
    );
  }

  return rewriteLeafPath(target, ctx);
}

async function rewritePackageBin(originalBin: PackageBin, ctx: BuildContext): Promise<PackageJson['bin']> {
  const binsToProcess = typeof originalBin === 'string' ? { __bin__: originalBin } : originalBin;

  const newBin = (await rewriteEntryValue(binsToProcess as RewritableValue, async (leafPath) => {
    const sourcePath = path.join(ctx.workspaceDir, leafPath);
    if (!(await isPathExists(sourcePath))) {
      throw new Error(`The leaf file "${sourcePath}" does not exist in the package.`);
    }
    const rel = getRelativePath(path.join(ctx.workspaceDir, 'src'), sourcePath);
    return buildOutPath(rel, ctx.jsOutputDir!.cjs, path.extname(rel), BUNDLE_EXTENSION_EXPORT_MAP.require);
  })) as Record<string, string>;

  if (Object.keys(newBin).length === 1 && newBin.__bin__) {
    return newBin.__bin__;
  }

  return newBin;
}

async function rewritePackageImports(originalImports: PackageImports, ctx: BuildContext): Promise<PackageImports> {
  const newImports: PackageImports = {};

  for (const [key, value] of Object.entries(originalImports)) {
    newImports[key as `#${string}`] = (await rewriteEntryValue(value as RewritableValue, async (target) => {
      if (!target.startsWith('./')) {
        return target;
      }
      return await rewriteLocalTarget(target, ctx);
    })) as EntryTarget;
  }

  return newImports;
}

async function rewritePackageExports(originalExports: PackageExports, ctx: BuildContext): Promise<PackageExports> {
  let rawExports: Record<string, PackageExports>;

  if (typeof originalExports === 'string' || Array.isArray(originalExports)) {
    // The string/array forms are sugar for the main entry point.
    rawExports = { '.': originalExports };
  } else {
    const keys = Object.keys(originalExports);
    // An object whose keys are all conditions is sugar for the main entry point as well.
    const isConditional = keys.length > 0 && !keys.some((key) => key.startsWith('.'));
    rawExports = isConditional ? { '.': originalExports } : (originalExports as Record<string, PackageExports>);
  }

  const newExports: Record<string, PackageExports> = {};
  for (const [key, value] of Object.entries(rawExports)) {
    newExports[key] = (await rewriteEntryValue(
      value as RewritableValue,
      async (leafPath) => await rewriteLocalTarget(leafPath, ctx),
    )) as PackageExports;
  }

  return newExports;
}

export async function rewritePackageJson(packageJson: PackageJson, outputTempDir: string, buildCtx: BuildContext) {
  // Delete published not must need
  delete packageJson.scripts;
  delete packageJson.devDependencies;

  const { bin: originalBin, exports: originalExports, imports: originalImports, ...rest } = packageJson;

  const newPackageJson: PackageJson = { ...rest };

  if (originalBin) {
    newPackageJson.bin = await rewritePackageBin(originalBin, buildCtx);
  }

  if (originalImports) {
    newPackageJson.imports = await rewritePackageImports(originalImports, buildCtx);
  }

  if (originalExports) {
    newPackageJson.exports = await rewritePackageExports(originalExports, buildCtx);
  }

  await fs.promises.writeFile(
    path.join(outputTempDir, 'package.json'),
    JSON.stringify(newPackageJson, null, 2),
    'utf-8',
  );
}

// ============================================
// Validate PackageJson
// ============================================

/** Check whether a value can be treated as a `key -> value` package.json entry map. */
function isEntryRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Check whether a `bin` key looks like a file path rather than a bare command name. */
function isPathLikeBinKey(key: string): boolean {
  return (
    key === '.' ||
    key === '..' ||
    key.startsWith('../') ||
    key.includes('/') ||
    key.includes('\\') ||
    path.posix.isAbsolute(key) ||
    path.win32.isAbsolute(key)
  );
}

/**
 * Validate that an `exports` or `bin` field is a flat mapping from each key
 * to a single existing path. `exports` keys must be subpaths (`.` or `./...`);
 * `bin` keys must be bare command names rather than paths.
 *
 * `shorthandKey` is the key used when the field is written as a single string.
 */
function validateEntries(
  field: 'exports' | 'bin',
  value: PackageJson['exports'] | PackageJson['bin'],
  shorthandKey: string,
  packageRootDir: string,
  errors: string[],
): void {
  const subject = field === 'exports' ? 'subpath' : 'command name';
  const isObjectForm = isEntryRecord(value);
  let entries: Record<string, unknown>;

  // The string form is shorthand for a single entry.
  if (typeof value === 'string') {
    entries = { [shorthandKey]: value };
  } else if (isObjectForm) {
    entries = value;
  } else {
    errors.push(`"${field}" must be a string or an object mapping each ${subject} to a single string path.`);
    return;
  }

  for (const [key, target] of Object.entries(entries)) {
    const location = `"${field}" entry "${key}"`;

    if (key.trim() === '') {
      errors.push(`"${field}" must not contain an empty ${subject}.`);
      continue;
    }

    if (key.includes('*')) {
      errors.push(`${location} must not contain a wildcard ("*") in its ${subject}.`);
      continue;
    }

    if (field === 'exports' && key !== '.' && !key.startsWith('./')) {
      errors.push(`${location} must be a subpath starting with "." or "./"; export conditions are not supported.`);
      continue;
    }

    // A `bin` object maps a command name to its executable path, so the key itself must not be a path.
    if (field === 'bin' && isObjectForm && isPathLikeBinKey(key)) {
      errors.push(`${location} must be a bare command name; the "bin" key must not be a path.`);
      continue;
    }

    if (typeof target !== 'string') {
      errors.push(`${location} must map to a single string path; nested conditions and arrays are not supported.`);
      continue;
    }

    if (target.trim() === '') {
      errors.push(`${location} must not map to an empty path.`);
      continue;
    }

    if (target.includes('*')) {
      errors.push(`${location} must not contain a wildcard ("*") in its path.`);
      continue;
    }

    if (!fs.existsSync(path.resolve(packageRootDir, target))) {
      errors.push(`${location} points to "${target}", but that path does not exist.`);
    }
  }
}

/**
 * Read the `package.json` from a package directory and validate that its
 * `exports` and `bin` only contain flat, wildcard-free mappings from a single
 * key to a string path that exists inside the package. A `bin` object must map
 * bare command names (not paths) to their executable paths.
 *
 * @param packageDir The package root directory that contains `package.json`.
 */
export function readValidatePackageJson(packageDir: string) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  let packageJson: PackageJson;

  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    if (!isEntryRecord(parsed)) {
      return { valid: false, errors: [`"${packageJsonPath}" must contain a JSON object.`], packageJson: null };
    }

    packageJson = parsed as PackageJson;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, errors: [`Failed to read or parse "${packageJsonPath}": ${message}`], packageJson: null };
  }

  const errors: string[] = [];

  if (packageJson.exports) {
    validateEntries('exports', packageJson.exports, '.', packageDir, errors);
  } else {
    return { valid: false, errors: ['The package.json must have exports field'], packageJson };
  }

  if (packageJson.bin) {
    validateEntries('bin', packageJson.bin, packageJson.name ?? 'bin', packageDir, errors);
  }

  return { valid: errors.length === 0, errors, packageJson };
}

/** Get the command name of a string-form `bin` entry, matching npm's package-name behavior. */
function getBinCommandName(packageJson: PackageJson): string {
  const packageName = packageJson.name ?? 'bin';
  return packageName.slice(packageName.lastIndexOf('/') + 1);
}

/**
 * Build a Rollup multi-entry input from the `exports` and `bin` fields.
 *
 * - `exports` keys are kept as-is (`.` for the main entry).
 * - `bin` commands are placed under the `./bin` prefix.
 * - Paths are kept exactly as declared in package.json.
 *
 * Call `readValidatePackageJson` first to surface invalid entries; non-string
 * targets are ignored here.
 */
export function getInputByPackageJson(packageJson: PackageJson): Record<string, string> {
  const input: Record<string, string> = {};

  if (typeof packageJson.exports === 'string') {
    input['.'] = packageJson.exports;
  } else if (isEntryRecord(packageJson.exports)) {
    for (const [key, target] of Object.entries(packageJson.exports)) {
      if (typeof target === 'string') {
        input[key] = target;
      }
    }
  }

  if (typeof packageJson.bin === 'string') {
    input[`./bin/${getBinCommandName(packageJson)}`] = packageJson.bin;
  } else if (isEntryRecord(packageJson.bin)) {
    for (const [command, target] of Object.entries(packageJson.bin)) {
      if (typeof target === 'string') {
        input[`./bin/${command}`] = target;
      }
    }
  }

  return input;
}
