import fs from 'node:fs';
import path from 'node:path';
import { PackageJson } from 'type-fest';
import { CusGenerateOutput } from '../types/rollup';

export async function createPackageBin({ targetDir }: { targetDir: string }): Promise<string> {
  return '';
}

export async function createPackageExports({
  originalExports,
}: {
  originalExports: PackageJson.Exports;
}): Promise<PackageJson.Exports> {
  return {} as any;
}

export async function writePackageJson({
  targetDir,
  targetTempDir,
  createBin,
  packageJsonPath,
}: {
  targetDir: string;
  targetTempDir: string;
  createBin: boolean;
  packageJsonPath: string;
}): Promise<CusGenerateOutput[]> {
  const packageJson: PackageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, { encoding: 'utf8' }));
  const originalExports = packageJson.exports;
  const newPackageJsonPath = path.join(targetTempDir, 'package.json');

  delete packageJson.scripts;
  delete packageJson.devDependencies;
  delete packageJson.imports;

  if (originalExports) {
    packageJson.exports = await createPackageExports({ originalExports: originalExports });
  }

  if (createBin) {
    packageJson.bin = await createPackageBin({ targetDir });
  }

  await fs.promises.writeFile(newPackageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

  return [
    {
      tempPath: newPackageJsonPath,
      originalPath: path.join(targetDir, 'package.json'),
    },
  ];
}
