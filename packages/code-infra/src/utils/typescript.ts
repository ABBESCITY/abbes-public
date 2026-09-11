import fs from 'node:fs';
import path from 'node:path';
import JSON5 from 'json5';
import { $ } from 'execa';

import { TYPESCRIPT_DEFAULT_CONFIG_FILE, TYPESCRIPT_DEFAULT_OUTPUT_DIR } from '../constants/config';
import { CusGenerateOutput } from '../types/rollup';

// Copy the source directory *.d.ts file
async function copyDeclarationFils(sourceDirectory: string, targetDirectory: string) {
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

// Emit directory files by tsc
async function emitDeclarations(tsconfigPath: string, sourceDir: string, targetDir: string) {
  const $$ = $({ stdio: 'inherit' });
  await $$`tsc
      -p ${tsconfigPath}
      --rootDir ${sourceDir}
      --outDir ${targetDir}
      --declaration
      --emitDeclarationOnly
      --noEmit false
      --composite false
      --incremental false
      --declarationMap false`;
}

// Get tsconfig file's outDir property
async function getOutDirFromFile(tsconfigPath: string): Promise<string | undefined> {
  const raw = await fs.promises.readFile(tsconfigPath, 'utf8');
  const config = JSON5.parse(raw);
  const outDir: string | undefined = config.compilerOptions?.outDir;
  return outDir ? path.resolve(path.dirname(tsconfigPath), outDir) : undefined;
}

export async function generateDeclareOutput({
  sourceDir,
  targetDir,
  tsconfigFile,
}: {
  sourceDir: string;
  targetDir: string;
  tsconfigFile: string;
}): Promise<CusGenerateOutput[]> {
  await copyDeclarationFils(sourceDir, targetDir);

  const isTsconfigExisted = await fs.promises.stat(tsconfigFile).then(
    (file) => file.isFile(),
    () => false,
  );

  if (!isTsconfigExisted) {
    throw new Error(
      'Unable to find a tsconfig to build this project. ' +
        `The package root needs to contain a '${TYPESCRIPT_DEFAULT_CONFIG_FILE}'. `,
    );
  }

  await emitDeclarations(tsconfigFile, sourceDir, targetDir);

  const outDir = await getOutDirFromFile(tsconfigFile);

  return [
    {
      tempDir: targetDir,
      originalDir: outDir || TYPESCRIPT_DEFAULT_OUTPUT_DIR,
    },
  ];
}
