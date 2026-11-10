import path from 'node:path';
import type { PackageJson } from 'type-fest';
import type { ValidatedPackageJson } from '#/types/packageJson';

export function validateKeyword(keyword: string, value: unknown): ValidatedPackageJson {
  try {
    if (Array.isArray(value)) {
      throw new Error(`Package JSON  field "${keyword}" can't be an array.`);
    }

    if (typeof value === 'number') {
      throw new Error(`Package JSON keyword field "${keyword}" can't be a number.`);
    }

    if (typeof value === 'string') {
      throw new Error(`Package JSON keyword field "${keyword}" can't be a string.`);
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, errors: [err.message] };
  }
}

export function validateField(field: string, value: unknown): ValidatedPackageJson {
  try {
    if (value === undefined || value === null) {
      throw new Error(`Package JSON must have a "${field}" field.`);
    }

    if (Array.isArray(value) || typeof value === 'object') {
      throw new Error(`Package JSON  field "${field}" can't be an object.`);
    }

    if (typeof value === 'number') {
      throw new Error(`Package JSON keyword field "${field}" can't be a number.`);
    }

    if (typeof value !== 'string') {
      throw new Error(`Package JSON keyword field "${field}" must be a string.`);
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, errors: [err.message] };
  }
}

export function validateImportKey(key: string): ValidatedPackageJson {
  try {
    if (!key.startsWith('#')) {
      throw new Error(`Package JSON imports key "${key}" must start with "#".`);
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, errors: [err.message] };
  }
}

export function validatePackageJson(packageJson: PackageJson): ValidatedPackageJson {
  if (packageJson.bin) {
    const binValidation = validateKeyword('bin', packageJson.bin);
    if (binValidation.valid === false) return binValidation;
    for (const [key, value] of Object.entries(packageJson.bin)) {
      const fieldValidation = validateField(key, value);
      if (fieldValidation.valid === false) return fieldValidation;
    }
  }

  if (packageJson.exports) {
    const exportsValidation = validateKeyword('exports', packageJson.exports);
    if (exportsValidation.valid === false) return exportsValidation;
    for (const [key, value] of Object.entries(packageJson.exports)) {
      const fieldValidation = validateField(key, value);
      if (fieldValidation.valid === false) return fieldValidation;
    }
  }

  if (packageJson.imports) {
    const importsValidation = validateKeyword('imports', packageJson.imports);
    if (importsValidation.valid === false) return importsValidation;
    for (const [key, value] of Object.entries(packageJson.imports)) {
      const keyValidation = validateImportKey(key);
      if (keyValidation.valid === false) return keyValidation;
      const fieldValidation = validateField(key, value);
      if (fieldValidation.valid === false) return fieldValidation;
    }
  }

  return { valid: true };
}

/**
 * Build a Rollup multi-entry input map from the package.json `exports` and `bin` fields.
 * The input key is the value's relative path to `src` with the extension removed.
 */
export function getInputByPackageJson(packageJson: PackageJson): Record<string, string> {
  const input: Record<string, string> = {};

  const processEntry = (target: unknown) => {
    if (typeof target !== 'string') return;

    const normalized = path.posix.normalize(target.replace(/\\/g, '/'));
    let relPath: string;
    if (normalized.startsWith('src/')) {
      relPath = normalized.slice(4);
    } else if (normalized.includes('/src/')) {
      relPath = normalized.slice(normalized.lastIndexOf('/src/') + 5);
    } else {
      relPath = path.posix.relative('src', normalized);
    }

    const ext = path.posix.extname(relPath);
    const key = ext ? relPath.slice(0, -ext.length) : relPath;
    input[key] = target;
  };

  if (packageJson.exports) {
    if (typeof packageJson.exports === 'string') {
      processEntry(packageJson.exports);
    } else if (typeof packageJson.exports === 'object') {
      for (const [, target] of Object.entries(packageJson.exports)) {
        processEntry(target);
      }
    }
  }

  if (packageJson.bin) {
    if (typeof packageJson.bin === 'string') {
      processEntry(packageJson.bin);
    } else if (typeof packageJson.bin === 'object') {
      for (const [, target] of Object.entries(packageJson.bin)) {
        processEntry(target);
      }
    }
  }

  return input;
}
