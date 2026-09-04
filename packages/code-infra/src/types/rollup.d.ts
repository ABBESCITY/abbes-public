import 'rollup';

import type { InputOptionsWithPlugins, OutputOptions } from 'rollup';

export type BundleType = 'esm' | 'cjs';
export type BundleOption = Pick<OutputOptions, 'dir' | 'format' | 'preserveModules'>;

export type OptionId = string;
export type OptionContent = { inputOption: InputOptionsWithPlugins; outputOption: CusOutputOptions[] };
export type OptionMap = Map<OptionId, OptionContent>;

export type WriteResult = {
  type: 'chunk' | 'asset';
  fileSize: number;
  fileName: string;
  filePath: string;
  isEntry?: boolean;
};

export type WriteOption = {
  verbose?: boolean;
};

export interface CusOutputOptions extends OutputOptions {
  outputType: 'asset' | 'js';
}

declare module 'rollup' {
  interface OutputOptions {
    outputType?: 'asset' | 'js';
    customFormat?: string;
    customVersion?: string;
  }
}
