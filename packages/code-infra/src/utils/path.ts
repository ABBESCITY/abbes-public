import fs from 'node:fs';
import path from 'node:path';
import { packageDirectory } from 'pkg-dir';

import { PACKAGES_DIR } from '@/constants/config';

/** Find the nearest package directory from the current working directory. */
export async function getWorkspace(): Promise<string> {
  const workspaceDir = await packageDirectory({ cwd: process.cwd() });

  if (!workspaceDir) {
    throw new Error(`Could not find a workspace directory from ${process.cwd()}`);
  }

  return workspaceDir;
}

/**
 * Return the names of the direct child directories of `baseDirectory`,
 * omitting any names listed in `exclude`.
 */
export function getChildDirectories(baseDirectory: string, exclude: string[] = []): string[] {
  const excludedDirectories = new Set(exclude);

  return fs
    .readdirSync(baseDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !excludedDirectories.has(entry.name))
    .map((entry) => entry.name);
}

/** Find a workspace package by its package.json name and return its path from cwd. */
export function getPackageRelativePath(packageName: string): string {
  const packagesDirectory = path.resolve(process.cwd(), PACKAGES_DIR);

  let packageDirectory: string | undefined;

  try {
    packageDirectory = fs
      .readdirSync(packagesDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(packagesDirectory, entry.name))
      .find((directory) => {
        const packageJsonPath = path.join(directory, 'package.json');
        if (!fs.existsSync(packageJsonPath)) return false;

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { name?: string };
        return packageJson.name === packageName;
      });
  } catch (error) {
    throw new Error(`Failed to resolve path for package "${packageName}"`, { cause: error });
  }

  if (!packageDirectory) {
    throw new Error(`Package "${packageName}" was not found in ${packagesDirectory}`);
  }

  return path.relative(process.cwd(), packageDirectory);
}
