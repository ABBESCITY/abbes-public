import fs from 'fs';
import path from 'path';
import { rollup } from 'rollup';
import { nanoid } from 'nanoid/non-secure';

import type { CusGenerateOutput, OptionContent, OptionId, OptionMap, WriteOption, WriteResult } from '../types/rollup';
import type { MergedRollupOptions, OutputOptions, RollupBuild, RollupOutput } from 'rollup';

export function mergeRollupOptions() {}

export function mergeRollupPlugins() {}

export async function parseRollupOptions<T extends MergedRollupOptions>(options: T[]): Promise<OptionMap> {
  const optionMap: OptionMap = new Map();
  options.forEach(({ output: outputOptions, ...restOptions }) => {
    optionMap.set(nanoid(10), {
      inputOption: restOptions,
      outputOption: outputOptions.map((output) => ({
        ...output,
        outputType: output.outputType ?? 'js',
      })),
    });
  });
  return optionMap;
}

export async function createBundleMapGraphs(
  optionArr: [OptionId, OptionContent][],
): Promise<Map<OptionId, RollupBuild>> {
  const results = await Promise.all(optionArr.map(([_optionId, option]) => rollup(option.inputOption)));
  const bundleMap = new Map<OptionId, RollupBuild>();
  optionArr.forEach(([key], index) => {
    bundleMap.set(key, results[index]);
  });
  return bundleMap;
}

export async function generateBundleOutput({
  tempDir,
  outputType,
  bundleMap,
  optionMap,
}: {
  bundleMap: Map<OptionId, RollupBuild>;
  optionMap: OptionMap;
  outputType: 'asset' | 'js';
  tempDir: string;
}): Promise<CusGenerateOutput[]> {
  const rollupOutputs: RollupOutput[] = [];
  const outputOptions: OutputOptions[] = [];
  const generateOutputs: CusGenerateOutput[] = [];

  for (const option of optionMap.values()) {
    option.outputOption.forEach((output) => {
      if (output.outputType === outputType) outputOptions.push(output);
    });
  }

  for (const bundle of bundleMap.values()) {
    for (const outputOption of outputOptions) {
      const bundleOutput = await bundle.generate({
        ...outputOption,
        dir: tempDir,
      });
      rollupOutputs.push(bundleOutput);
      generateOutputs.push({
        tempDir: tempDir,
        originalDir: outputOption.dir as string,
      });
    }
  }

  for (const { output } of rollupOutputs) {
    for (const chunk of output) {
      const filePath = chunk.fileName;
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

      if (chunk.type === 'asset') {
        const content = chunk.source;
        await fs.promises.writeFile(filePath, content);
      } else {
        await fs.promises.writeFile(filePath, chunk.code);
      }
    }
  }

  return generateOutputs;
}
