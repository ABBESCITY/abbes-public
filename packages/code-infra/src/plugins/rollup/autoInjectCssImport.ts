import path from 'path';
import { ROLLUP_DEFAULT_OUTPUT_ASSETS_DIR } from '../constants/config';

import type { Plugin, NormalizedOutputOptions, OutputBundle, OutputChunk } from 'rollup';

export interface AutoInjectCssImportOptions {
  assetDir?: string;
  onlyEntry?: boolean;
  deduplicate?: boolean;
  filter?: (chunk: OutputChunk, options: NormalizedOutputOptions) => boolean;
  resolveCssPath?: (chunk: OutputChunk, options: NormalizedOutputOptions) => string | null;
}

export default function autoInjectCssImport(options: AutoInjectCssImportOptions = {}): Plugin {
  const {
    assetDir = ROLLUP_DEFAULT_OUTPUT_ASSETS_DIR,
    onlyEntry = false,
    deduplicate = true,
    filter,
    resolveCssPath,
  } = options;

  return {
    name: 'auto-inject-css-import',
    generateBundle(outputOptions: NormalizedOutputOptions, bundle: OutputBundle) {
      const outputDir = outputOptions.dir || '';
      if (outputDir === assetDir || outputDir.endsWith(assetDir) || outputDir.includes(assetDir)) {
        return;
      }

      const assetsDir = path.relative(outputDir, assetDir);

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;

        if (onlyEntry && !chunk.isEntry) continue;
        if (filter && !filter(chunk, outputOptions)) continue;

        let cssImportPath: string | null = null;

        if (resolveCssPath) {
          cssImportPath = resolveCssPath(chunk, outputOptions);
        } else {
          cssImportPath = getDefaultCssPath(chunk, fileName, assetsDir);
        }

        if (!cssImportPath) continue;

        cssImportPath = cssImportPath.replace(/\\/g, '/');
        if (!cssImportPath.startsWith('.') && !path.isAbsolute(cssImportPath)) {
          cssImportPath = `./${cssImportPath}`;
        }

        const importStatement = `import '${cssImportPath}';\n`;

        if (deduplicate && chunk.code.includes(`import '${cssImportPath}'`)) {
          continue;
        }

        const importRegex = /^import\s+.*?;?\s*\n/;
        const match = chunk.code.match(importRegex);
        if (match && match[0]) {
          const insertIndex = match[0].length;
          chunk.code = chunk.code.slice(0, insertIndex) + importStatement + chunk.code.slice(insertIndex);
        } else {
          chunk.code = importStatement + chunk.code;
        }

        this.info(`[auto-inject-css] Injected CSS into ${fileName} -> ${cssImportPath}`);
      }
    },
  };
}

function getDefaultCssPath(chunk: OutputChunk, fileName: string, assetsDir: string): string | null {
  if (!chunk.modules || Object.keys(chunk.modules).length === 0) {
    return null;
  }

  const cssModuleId = Object.keys(chunk.modules).find((id) => /\.(css|scss|sass|less|styl)$/.test(id));

  if (!cssModuleId) {
    return null;
  }

  let cssPath = cssModuleId.replace(/^src\//, '').replace(/\.(scss|sass|less|styl)$/, '.css');

  const finalPath = path.join(assetsDir, cssPath);
  return finalPath;
}
