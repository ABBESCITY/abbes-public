import type { Plugin } from 'rollup';

const markerDataKey: unique symbol = Symbol.for('@abbes-public/code-infra/rollup-marker-data');

export type RollupMarkerPlugin<T> = Plugin & { readonly [markerDataKey]: T };

/** Create a no-op plugin that carries data alongside a Rollup configuration. */
export function createRollupMarkerPlugin<T>(data: T): RollupMarkerPlugin<T> {
  return { name: 'abbes-public:config-marker', [markerDataKey]: data };
}

/** Read data from a marker plugin after resolving Rollup's plugin options. */
export function getRollupMarkerPluginData<T>(plugin: unknown): T | undefined {
  if (typeof plugin !== 'object' || plugin === null) return undefined;
  if (!(markerDataKey in plugin)) return undefined;
  return (plugin as RollupMarkerPlugin<T>)[markerDataKey];
}

/** Get the marker plugin data */
export function findRollupMarkerPluginData<T>(plugins: readonly unknown[]): T | undefined {
  for (const p of plugins) {
    const data = getRollupMarkerPluginData<T>(p);
    if (data !== undefined) return data;
  }
  return undefined;
}
