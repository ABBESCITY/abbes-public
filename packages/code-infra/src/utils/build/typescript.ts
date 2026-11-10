import path from 'node:path';
import { execa } from 'execa';

import { BUILD_DECLARE_TEMP_DIR } from '#/constants/config';

import type { BuildContext } from '#/types/build';

export interface TsConfigOptions {
  path: string;
  outputDir: string;
}

/** Load the effective tsconfig using the TypeScript CLI and require an output directory. */
export async function loadTsConfig(configPath: string): Promise<TsConfigOptions> {
  let config: { compilerOptions?: { declarationDir?: string; outDir?: string } };

  try {
    const { stdout } = await execa('pnpm', ['exec', 'tsc', '--showConfig', '--project', configPath], {
      cwd: path.dirname(configPath),
    });
    config = JSON.parse(stdout) as typeof config;
  } catch (error) {
    throw new Error(`Failed to load TypeScript config at "${configPath}" with tsc --showConfig.`, { cause: error });
  }

  const outputDir = config.compilerOptions?.declarationDir ?? config.compilerOptions?.outDir;
  if (!outputDir) {
    throw new Error(`TypeScript config at "${configPath}" must define "declarationDir" or "outDir".`);
  }

  return { path: configPath, outputDir: path.resolve(path.dirname(configPath), outputDir) };
}

export async function runDeclare(tsOptions: TsConfigOptions, buildCtx: BuildContext) {
  const configPath = path.resolve(tsOptions.path);
  const tempOutputDir = path.join(buildCtx.outputTempDir, BUILD_DECLARE_TEMP_DIR);

  try {
    await execa(
      'pnpm',
      [
        'exec',
        'tsc',
        '--project',
        configPath,
        '--declaration',
        '--emitDeclarationOnly',
        '--declarationDir',
        tempOutputDir,
        '--sourceMap',
        'false',
      ],
      { cwd: path.dirname(configPath), stdio: 'inherit' },
    );
  } catch (error) {
    throw new Error(`Failed to generate declarations from TypeScript config at "${configPath}".`, { cause: error });
  }

  buildCtx.outputResults.push({
    outputType: 'Declaration',
    outputPath: tsOptions.outputDir,
    outputTempPath: tempOutputDir,
  });
}
