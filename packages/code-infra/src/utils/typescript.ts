import fs from 'node:fs';
import path from 'node:path';

import { TYPESCRIPT_DECLARE_TEMP_DIR, TYPESCRIPT_DEFAULT_CONFIG_FILE } from '../constants/config';

// Copy the source directory *.d.ts file
export async function copyDeclarationFils(sourceDirectory: string, targetDirectory: string) {
  const fullSourcePath = path.resolve(sourceDirectory);
  const fullTargetPath = path.resolve(targetDirectory);

  await fs.promises.cp(fullSourcePath, fullTargetPath, {
    recursive: true,
    filter: async (src) => {
      const stats = await fs.promises.stat(src);

      if (path.basename(src).startsWith('.')) return false;

      if (stats.isDirectory()) return true;

      return src.endsWith('.d.ts') || src.endsWith('.d.mts') || src.endsWith('.d.cts');
    },
  });
}

export async function emitDeclarations(tsconfigPath: string, tempDir: string) {}

export async function generateDeclareOutput(tsconfigPath: string, option: { buildTempDir: string }) {
  const { buildTempDir } = option;

  const tempDir = path.join(buildTempDir, TYPESCRIPT_DECLARE_TEMP_DIR);

  const isTsconfigExisted = await fs.promises.stat(tsconfigPath).then(
    (file) => file.isFile(),
    () => false,
  );

  if (!isTsconfigExisted) {
    throw new Error(
      'Unable to find a tsconfig to build this project. ' +
        `The package root needs to contain a '${TYPESCRIPT_DEFAULT_CONFIG_FILE}'. `,
    );
  }

  await emitDeclarations(tsconfigPath, tempDir);
}
