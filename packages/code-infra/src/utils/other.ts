import fs from 'node:fs';
import path from 'node:path';

import fg from 'fast-glob';

export type RewriteHandler = (value: string) => Promise<any>;
export type RewritableValue = string | number | boolean | null | RewritableValue[] | { [key: string]: RewritableValue };

/** Check whether a file extension (with or without a leading dot) is in an extension list. */
export function isExtensionOf(ext: string, extensionList: string | readonly string[]): boolean {
  const normalize = (extension: string) => extension.trim().replace(/^\./, '');
  const extensions = typeof extensionList === 'string' ? extensionList.split(',') : extensionList;

  return extensions.some((extension) => normalize(extension) === normalize(ext));
}

/** Check if a path exists. */
export async function isPathExists(path: string): Promise<boolean> {
  try {
    await fs.promises.stat(path);
    return true;
  } catch {
    try {
      return (await fg(path, { dot: true, onlyFiles: false, followSymbolicLinks: true })).length > 0;
    } catch {
      return false;
    }
  }
}

/** Rewrite a value using the provided handler. */
export async function rewriteEntryValue(value: RewritableValue, handler: RewriteHandler): Promise<RewritableValue> {
  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return handler(value);
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map(async (entryValue) => await rewriteEntryValue(entryValue, handler)));
  }

  if (value !== null && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(
        async ([key, entryValue]) => [key, await rewriteEntryValue(entryValue, handler)] as const,
      ),
    );
    return Object.fromEntries(entries);
  }

  throw new Error(`Unsupported the type of value`);
}

/**
 * Recursively copy a file or directory to a target destination.
 */
export async function recursiveCopy(source: string, target: string, options?: fs.CopyOptions): Promise<boolean> {
  const sourceStat = await fs.promises.stat(source);
  const targetStat = await fs.promises.stat(target).catch(() => null);

  const destination =
    sourceStat.isFile() && (targetStat?.isDirectory() || target.endsWith('/') || target.endsWith('\\'))
      ? path.join(target, path.basename(source))
      : target;

  if (path.resolve(source) === path.resolve(destination)) {
    return true;
  }

  await fs.promises.cp(source, destination, { recursive: true, force: true, ...options });
  return true;
}
