import fs from 'fs';
import path from 'path';
import { rollup } from 'rollup';
import { nanoid } from 'nanoid/non-secure';

import type { OptionContent, OptionId, OptionMap, WriteOption, WriteResult } from '../types/rollup';
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

export async function generateRollupOutput(
  bundleMap: Map<OptionId, RollupBuild>,
  optionMap: OptionMap,
  outputType: 'asset' | 'js',
): Promise<RollupOutput[]> {
  const rollupOutputs: RollupOutput[] = [];
  const outputOptions: OutputOptions[] = [];

  for (const option of optionMap.values()) {
    option.outputOption.forEach((output) => {
      if (output.outputType === outputType) outputOptions.push(output);
    });
  }

  for (const bundle of bundleMap.values()) {
    outputOptions.forEach(async (outputOption) => {
      const bundleOutput = await bundle.generate(outputOption);
      rollupOutputs.push(bundleOutput);
    });
  }

  return rollupOutputs;
}

export async function writeOutputsToDist(rollupOutputs: RollupOutput[], option: WriteOption) {
  const { verbose = false } = option;
  const writeResults: WriteResult[] = [];

  for (const { output } of rollupOutputs) {
    for (const chunk of output) {
      let fileSize: number;
      const filePath = chunk.fileName;

      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

      if (chunk.type === 'asset') {
        const content = chunk.source;
        await fs.promises.writeFile(filePath, content);
        fileSize = content.length;
      } else {
        await fs.promises.writeFile(filePath, chunk.code);
        fileSize = chunk.code.length;
      }

      const result: WriteResult = {
        type: chunk.type,
        filePath,
        fileName: chunk.fileName,
        fileSize: fileSize,
        isEntry: chunk.type === 'chunk' ? chunk.isEntry || false : undefined,
      };

      writeResults.push(result);

      if (verbose) {
        const sizeKB = (fileSize / 1024).toFixed(2);
        const entryLabel = result.isEntry ? ' (entry)' : '';
        console.log(`✅ ${chunk.type}: ${filePath} (${sizeKB}KB)${entryLabel}`);
      }
    }
  }
}
