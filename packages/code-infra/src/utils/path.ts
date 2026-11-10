import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { findWorkspaceDir } from '@pnpm/find-workspace-dir';
import { findWorkspacePackages } from '@pnpm/workspace.find-packages';

interface WorkspacePackage {
  name: string;
  dir: string;
  version?: string;
}

type WorkspacePackageMap = Map<string, WorkspacePackage>;

const memoryCache = new Map<string, WorkspacePackageMap>();

function getCachePath(workspaceRootDir: string): string {
  const cacheDir = path.join(workspaceRootDir, 'node_modules', '.cache');
  const cacheKey = createHash('md5').update(workspaceRootDir).digest('hex');
  return path.join(cacheDir, `workspace-packages-${cacheKey}.json`);
}

async function getSignalMtime(workspaceRootDir: string): Promise<number> {
  const signals = [path.join(workspaceRootDir, 'pnpm-workspace.yaml'), path.join(workspaceRootDir, 'pnpm-lock.yaml')];
  const stats = await Promise.all(signals.map((p) => fs.promises.stat(p).catch(() => null)));
  const mtimes = stats.filter((s) => s !== null).map((s) => s!.mtimeMs);
  return mtimes.length ? Math.max(...mtimes) : 0;
}

export async function getWorkspacePackage(forceRefresh = false): Promise<WorkspacePackageMap> {
  if (!WorkspaceRootDir) throw new Error('Workspace root not found');

  const rootDir = WorkspaceRootDir;
  const normalizedRoot = path.resolve(rootDir);

  if (!forceRefresh) {
    const memHit = memoryCache.get(rootDir);
    if (memHit) return memHit;
  }

  const cachePath = getCachePath(rootDir);

  if (!forceRefresh) {
    try {
      const [signalMtime, cacheStat] = await Promise.all([
        getSignalMtime(rootDir),
        fs.promises.stat(cachePath).catch(() => null),
      ]);

      if (cacheStat && cacheStat.mtimeMs >= signalMtime) {
        const cached = JSON.parse(await fs.promises.readFile(cachePath, 'utf8')) as Record<string, WorkspacePackage>;
        const map = new Map(Object.entries(cached));
        memoryCache.set(rootDir, map);
        return map;
      }
    } catch {}
  }

  const packages = await findWorkspacePackages(rootDir);
  const packagesMap: WorkspacePackageMap = new Map();

  for (const pkg of packages) {
    const name = pkg.manifest.name;
    if (!name) continue;
    if (path.resolve(pkg.rootDir) === normalizedRoot) continue;
    packagesMap.set(name, { name, dir: pkg.rootDir, version: pkg.manifest.version });
  }

  await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
  const tmpPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmpPath, JSON.stringify(Object.fromEntries(packagesMap)), 'utf8');
  await fs.promises.rename(tmpPath, cachePath);

  memoryCache.set(rootDir, packagesMap);

  return packagesMap;
}

export const WorkspaceRootDir = await findWorkspaceDir(process.cwd());
export const PackageCacheMap: Map<string, any> = await getWorkspacePackage();

/** Get the relative path */
export function getRelativePath(basePath: string, targetPath: string): string {
  return path.relative(basePath, targetPath);
}

/** Find a workspace package by its package.json name and return its path from cwd. */
export function getPackagePath(packageName: string): string {
  const packageInfo = PackageCacheMap.get(packageName);
  if (!packageInfo) {
    throw new Error(`${packageName}'s path is undefined, please check the packageName is correct`);
  }
  return packageInfo.dir;
}

export async function createBuildTempDir(directorName: string): Promise<string> {
  try {
    const baseOutputTempDir = path.join(os.tmpdir(), directorName);
    if (baseOutputTempDir) {
      await fs.promises.rm(baseOutputTempDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(baseOutputTempDir, { recursive: true });
    return baseOutputTempDir;
  } catch (err: any) {
    throw new Error(`create build temp director failed , Error: ${err}`);
  }
}
