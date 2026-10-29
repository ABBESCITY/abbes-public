import rollup from 'rollup';

import { createAssetRollupConfig } from './content/assetConfig';
import { createBaseRollupConfig } from './content/baseConfig';

export * from './content/baseConfig';
export * from './content/assetConfig';

export function createRollupConfig({
  packageName,
  entryType = 'single',
  multiExclude,
  jsOptions,
  assetOptions,
  needTerser,
}: {
  packageName: string;
  entryType?: 'single' | 'multiple';
  multiExclude?: string[];
  jsOptions?: { outputDir?: string; externalAdditional?: string[]; customConfig?: rollup.RollupOptions };
  assetOptions?: { outputDir?: string; needLibraryAssets?: boolean; customConfig?: rollup.RollupOptions };
  needTerser?: boolean;
  externalAdditional?: string[];
}) {
  const rollupConfig = [
    createBaseRollupConfig(
      {
        packageName: packageName,
        outputDir: jsOptions?.outputDir,
        needTerserPlugin: needTerser,
        entryOptions: { type: entryType, multiExclude: multiExclude },
        externalAdditional: jsOptions?.externalAdditional,
      },
      jsOptions?.customConfig ?? {},
    ),
  ];

  if (assetOptions) {
    rollupConfig.push(
      createAssetRollupConfig(
        {
          packageName: packageName,
          outputDir: assetOptions.outputDir,
          needTerserPlugin: needTerser,
          needLibraryAssetsPlugin: assetOptions.needLibraryAssets,
          entryOptions: { type: entryType, multiExclude: multiExclude },
        },
        assetOptions.customConfig,
      ),
    );
  }

  return rollupConfig;
}
