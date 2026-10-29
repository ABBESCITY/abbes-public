import { createDefu } from 'defu';

type Customizer<T, K> = (defaultValue: T, customValue: T, key: K, namespace: string) => any;
type MergeOption = Partial<{
  arrayCustomizer: Customizer<Array<any>, string | number | symbol>;
  objectCustomizer: Customizer<Record<string | number | symbol, any>, string | number | symbol>;
}>;

function isPlainObject(obj: string) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

function mergeHandler({ arrayCustomizer, objectCustomizer }: MergeOption = {}) {
  return createDefu((obj, key, value, namespace) => {
    const defaultValue = obj[key];
    if (defaultValue === undefined) return;

    const isValueArray = Array.isArray(value);
    const isDefaultArray = Array.isArray(defaultValue);

    const isValueObject = isPlainObject(value);
    const isDefaultObject = isPlainObject(defaultValue);

    if (isDefaultArray && isValueArray) {
      const defaultResult = [...value, ...defaultValue];
      const result = arrayCustomizer ? arrayCustomizer(value, defaultValue, key, namespace) : defaultResult;
      obj[key] = result ?? defaultResult;
      return true;
    }

    if (isDefaultObject && isValueObject) {
      const result = objectCustomizer ? objectCustomizer(value, defaultValue, key, namespace) : undefined;
      if (result !== undefined) obj[key] = result;
      return;
    }

    return true;
  });
}

export function merge(customObj: Object, defaultObj: Object, mergeOption?: MergeOption) {
  return mergeHandler(mergeOption)(defaultObj, customObj);
}
