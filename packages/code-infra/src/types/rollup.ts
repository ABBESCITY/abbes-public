import type { InputOptionsWithPlugins, OutputOptions } from 'rollup';

export type BundleType = 'esm' | 'cjs';
export type BundleOption = Pick<OutputOptions, 'dir' | 'format' | 'preserveModules'>;

export type OptionId = string;
export type OptionContent = { inputOption: InputOptionsWithPlugins; outputOption: OutputOptions[] };
export type OptionMap = Map<OptionId, OptionContent>;
