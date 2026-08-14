import type { OutputOptions } from 'rollup';

export type BundleType = 'esm' | 'cjs';
export type BundleOption = Pick<OutputOptions, 'dir' | 'format' | 'preserveModules'>;
