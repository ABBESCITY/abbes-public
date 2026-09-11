import fs from 'node:fs';
import { HandlerFunctionArgs } from '../types/rollup';

export async function mapConcurrently<T, R>(
  items: T[],
  mapper: (item: T) => Promise<R>,
  concurrency: number,
): Promise<(R | Error)[]> {
  if (!items.length) {
    return Promise.resolve([]); // nothing to do
  }
  const itemIterator = items.entries();
  const count = Math.min(concurrency, items.length);
  const workers = [];
  /**
   * @type {(R|Error)[]}
   */
  const results = new Array(items.length);
  for (let i = 0; i < count; i += 1) {
    const worker = Promise.resolve().then(async () => {
      for (const [index, item] of itemIterator) {
        const res = await mapper(item);
        results[index] = res;
      }
    });
    workers.push(worker);
  }
  await Promise.all(workers);
  return results;
}

export async function recursiveCopyFile({
  source,
  target,
  verbose = true,
}: HandlerFunctionArgs<{ source: string; target: string }>) {
  try {
    await fs.promises.cp(source, target, { recursive: true });
    if (verbose) {
      console.log(`Copied ${source} to ${target}`);
    }
    return true;
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    if (verbose) {
      console.warn(`Source does not exist: ${source}`);
    }
    throw err;
  }
}
