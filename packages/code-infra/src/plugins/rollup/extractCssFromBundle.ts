import type { Plugin, OutputBundle, OutputChunk, NormalizedOutputOptions } from 'rollup';

type CssAsset = {
  fileName: string;
  source: string;
};

export interface ExtractCssFromBundleOptions {
  cleanJsInAssets?: boolean;
  removeCssChunks?: boolean;
}

export default function extractCssFromBundle(options: ExtractCssFromBundleOptions = {}): Plugin {
  const { cleanJsInAssets = true, removeCssChunks = true } = options;

  return {
    name: 'extract-css-from-bundle',

    generateBundle(_outputOptions: NormalizedOutputOptions, bundle: OutputBundle): void {
      const cssAssets: CssAsset[] = [];
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;

        const isCssChunk = isCssChunkCheck(fileName, chunk);

        if (isCssChunk) {
          try {
            const cssString = extractCssString(chunk.code);
            if (cssString) {
              let outputFileName = fileName.replace(/\.js$/, '');

              const extMap: Record<string, string> = {
                '.scss': '.css',
                '.sass': '.css',
                '.less': '.css',
                '.styl': '.css',
              };

              for (const [ext, newExt] of Object.entries(extMap)) {
                if (outputFileName.endsWith(ext)) {
                  outputFileName = outputFileName.replace(ext, newExt);
                  break;
                }
              }

              cssAssets.push({
                fileName: outputFileName,
                source: cssString,
              });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.warn(`Failed to extract CSS from ${fileName}: ${errorMessage}`);
          }

          // 在所有输出中删除 CSS chunk
          if (removeCssChunks) {
            delete bundle[fileName];
            continue;
          }
        }

        // 在 assets 输出中：删除所有 JS chunk（只保留 CSS asset）
        if (cleanJsInAssets) {
          delete bundle[fileName];
          this.info(`[extract-css] Removed JS chunk from assets: ${fileName}`);
        }
      }
      for (const { fileName, source } of cssAssets) {
        try {
          this.emitFile({
            type: 'asset',
            fileName,
            source,
          });
          this.info(`[extract-css] Emitted CSS: ${fileName}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.warn(`Failed to emit CSS file ${fileName}: ${errorMessage}`);
        }
      }
    },
  };
}

function isCssChunkCheck(fileName: string, chunk: OutputChunk): boolean {
  if (/\.(css|scss|sass|less|styl)\.js$/.test(fileName)) {
    return true;
  }

  if (chunk.modules) {
    const moduleIds = Object.keys(chunk.modules);
    return moduleIds.some((id) => /\.(css|scss|sass|less|styl)$/.test(id));
  }

  return false;
}

function extractCssString(code: string): string | null {
  const patterns = [
    /export\s+default\s+("([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`)/,
    /export\s+default\s+(\w+);?\s*(?:var|const|let)\s+\w+\s*=\s*("([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`)/,
    /module\.exports\s*=\s*("([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`)/,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      const cssString = match[2] || match[3] || match[4] || match[5] || match[6] || match[7];
      if (cssString) {
        return unescapeCssString(cssString);
      }
    }
  }

  const looseMatch = code.match(/["'`]([\s\S]*?)["'`]/);
  if (looseMatch && looseMatch[1]) {
    const css = looseMatch[1];
    if (css.includes('{') && css.includes('}')) {
      return unescapeCssString(css);
    }
  }

  return null;
}

function unescapeCssString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
