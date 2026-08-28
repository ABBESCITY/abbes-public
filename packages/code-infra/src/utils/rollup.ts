import { rollup } from 'rollup';
import { nanoid } from 'nanoid/non-secure';

import type { OptionContent, OptionId, OptionMap } from '../types/rollup';
import type { MergedRollupOptions, RollupBuild } from 'rollup';

export function mergeRollupOptions() {}

export function mergeRollupPlugins() {}

export function parseRollupOptions(options: MergedRollupOptions[]): OptionMap {
  const optionMap: OptionMap = new Map();
  options.forEach(({ output: outputOptions, ...restOptions }) => {
    optionMap.set(nanoid(10), {
      inputOption: restOptions,
      outputOption: Array.isArray(outputOptions) ? outputOptions : [outputOptions],
    });
  });
  return optionMap;
}

export async function createChunkGraphs(optionArr: [OptionId, OptionContent][]): Promise<Map<OptionId, RollupBuild>> {
  const results = await Promise.all(optionArr.map(([_optionId, option]) => rollup(option.inputOption)));
  const chunkMap = new Map<OptionId, RollupBuild>();
  optionArr.forEach(([key], index) => {
    chunkMap.set(key, results[index]);
  });
  return chunkMap;
}

export async function generateJsOutput(chunkMap: Map<OptionId, RollupBuild>) {}

export async function generateAssetsOutput(chunkMap: Map<OptionId, RollupBuild>) {}
