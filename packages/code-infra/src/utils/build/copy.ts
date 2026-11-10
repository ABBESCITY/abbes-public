import fs from 'node:fs';
import path from 'node:path';

import fg from 'fast-glob';
import { forEachAsync } from 'es-toolkit/array';
import { recursiveCopy } from '#/utils/other';

import type { BuildContext } from '#/types/build';

// Default need copy files
const DEFAULT_NEED_COPY_FILES = ['README.md', 'LICENSE', 'CHANGELOG.md'];

// Maximum number of files copied concurrently
const MAX_COPY_CONCURRENCY = 8;

/** Convert a path to the POSIX format used by glob patterns. */
function toGlobPath(value: string): string {
  return value.split(path.sep).join('/');
}

/**
 * Normalize the given patterns and split them into positive patterns and ignored patterns.
 *
 * A pattern prefixed with `!` is treated as an exclusion. Patterns that point to an existing
 * directory are expanded to copy its whole content. Patterns outside `cwd` are rejected.
 */
async function normalizePatterns(globs: string[], cwd: string): Promise<{ patterns: string[]; ignore: string[] }> {
  const patterns: string[] = [];
  const ignore: string[] = [];

  for (const rawGlob of globs) {
    const glob = rawGlob.trim();
    if (!glob) continue;

    const isNegative = glob.startsWith('!');
    const body = (isNegative ? glob.slice(1) : glob).replace(/^\.\//, '');
    if (!body) continue;

    const absolutePath = path.resolve(cwd, body);
    const relativePath = toGlobPath(path.relative(cwd, absolutePath));
    if (!relativePath || relativePath === '..' || relativePath.startsWith('../') || path.isAbsolute(relativePath)) {
      throw new Error(`The copy pattern "${rawGlob}" must point to a path inside "${cwd}".`);
    }

    let pattern = relativePath;
    if (!fg.isDynamicPattern(pattern)) {
      const stat = await fs.promises.stat(absolutePath).catch(() => null);
      if (stat?.isDirectory()) {
        pattern = `${relativePath.replace(/\/+$/, '')}/**/*`;
      }
    }

    (isNegative ? ignore : patterns).push(pattern);
  }

  return { patterns, ignore };
}

/**
 * Copy the files that a package needs to publish into its temporary output directory
 * (`ctx.baseOutputTempDir`).
 *
 * Patterns are resolved relative to the package directory (`ctx.workspaceDir`) and the
 * matched files keep their relative path in the output, so that e.g. `assets/logo.png`
 * is copied to `<baseOutputTempDir>/assets/logo.png`. Default files that do not exist
 * (such as a missing `CHANGELOG.md`) are simply ignored.
 */
export async function copyNeedFiles(glob: string[] = [], ctx: BuildContext): Promise<void> {
  const { patterns, ignore } = await normalizePatterns([...DEFAULT_NEED_COPY_FILES, ...glob], ctx.packagePath);

  const files = await fg(patterns, {
    cwd: ctx.packagePath,
    ignore,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: true,
    unique: true,
  });

  await forEachAsync(
    files,
    async (file) => {
      const sourcePath = path.resolve(ctx.packagePath, file);
      const targetPath = path.resolve(ctx.outputTempDir, file);

      if (sourcePath === targetPath) return;

      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      await recursiveCopy(sourcePath, targetPath);
      ctx.outputResults.push({
        outputType: 'Other',
        outputPath: path.resolve(ctx.packagePath, ctx.baseOutputDir, file),
        outputTempPath: targetPath,
      });
    },
    { concurrency: MAX_COPY_CONCURRENCY },
  );
}
