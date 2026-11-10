import { describe, expect, it } from 'vitest';
import {
  getInputByPackageJson,
  validateField,
  validateImportKey,
  validateKeyword,
  validatePackageJson,
} from '#/utils/packageJson';
import type { PackageJson } from 'type-fest';

describe('packageJson utils', () => {
  describe('validateKeyword', () => {
    it('should return valid: true when value is a valid object map', () => {
      expect(validateKeyword('bin', { 'my-cli': './bin/index.mjs' })).toEqual({ valid: true });
      expect(validateKeyword('exports', { '.': './lib/index.mjs' })).toEqual({ valid: true });
      expect(validateKeyword('imports', { '#/*': './src/*' })).toEqual({ valid: true });
    });

    it('should return valid: false when value is an array', () => {
      const result = validateKeyword('bin', ['./bin/index.mjs']);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Package JSON  field "bin" can\'t be an array.']);

      const importsResult = validateKeyword('imports', ['./src/*']);
      expect(importsResult.valid).toBe(false);
      expect(importsResult.errors).toEqual(['Package JSON  field "imports" can\'t be an array.']);
    });

    it('should return valid: false when value is a number', () => {
      const result = validateKeyword('bin', 123);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Package JSON keyword field "bin" can\'t be a number.']);

      const importsResult = validateKeyword('imports', 123);
      expect(importsResult.valid).toBe(false);
      expect(importsResult.errors).toEqual(['Package JSON keyword field "imports" can\'t be a number.']);
    });

    it('should return valid: false when value is a string', () => {
      const result = validateKeyword('exports', './index.js');
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['Package JSON keyword field "exports" can\'t be a string.']);

      const importsResult = validateKeyword('imports', './src/*');
      expect(importsResult.valid).toBe(false);
      expect(importsResult.errors).toEqual(['Package JSON keyword field "imports" can\'t be a string.']);
    });
  });

  describe('validateField', () => {
    it('should return valid: true when value is a valid string path', () => {
      expect(validateField('code-infra', 'src/bin.ts')).toEqual({ valid: true });
      expect(validateField('.', './src/index.ts')).toEqual({ valid: true });
      expect(validateField('#/*', './src/*')).toEqual({ valid: true });
    });

    it('should return valid: false when value is undefined or null', () => {
      expect(validateField('code-infra', undefined)).toEqual({
        valid: false,
        errors: ['Package JSON must have a "code-infra" field.'],
      });
      expect(validateField('code-infra', null)).toEqual({
        valid: false,
        errors: ['Package JSON must have a "code-infra" field.'],
      });
    });

    it('should return valid: false when value is an array or object', () => {
      expect(validateField('code-infra', ['src/bin.ts'])).toEqual({
        valid: false,
        errors: ['Package JSON  field "code-infra" can\'t be an object.'],
      });
      expect(validateField('code-infra', { path: 'src/bin.ts' })).toEqual({
        valid: false,
        errors: ['Package JSON  field "code-infra" can\'t be an object.'],
      });
    });

    it('should return valid: false when value is a number', () => {
      expect(validateField('code-infra', 42)).toEqual({
        valid: false,
        errors: ['Package JSON keyword field "code-infra" can\'t be a number.'],
      });
    });

    it('should return valid: false when value is another non-string type (e.g. boolean)', () => {
      expect(validateField('code-infra', true)).toEqual({
        valid: false,
        errors: ['Package JSON keyword field "code-infra" must be a string.'],
      });
    });
  });

  describe('validateImportKey', () => {
    it('should return valid: true when key starts with "#"', () => {
      expect(validateImportKey('#/*')).toEqual({ valid: true });
      expect(validateImportKey('#utils')).toEqual({ valid: true });
      expect(validateImportKey('#components/Button')).toEqual({ valid: true });
    });

    it('should return valid: false when key does not start with "#"', () => {
      expect(validateImportKey('utils')).toEqual({
        valid: false,
        errors: ['Package JSON imports key "utils" must start with "#".'],
      });
      expect(validateImportKey('./utils')).toEqual({
        valid: false,
        errors: ['Package JSON imports key "./utils" must start with "#".'],
      });
      expect(validateImportKey('/*')).toEqual({
        valid: false,
        errors: ['Package JSON imports key "/*" must start with "#".'],
      });
    });
  });

  describe('validatePackageJson', () => {
    it('should return valid: true for an empty package.json', () => {
      const packageJson: PackageJson = {};
      expect(validatePackageJson(packageJson)).toEqual({ valid: true });
    });

    it('should return valid: true for package.json without bin, exports, or imports', () => {
      const packageJson: PackageJson = { name: 'my-package', version: '1.0.0', description: 'test package' };
      expect(validatePackageJson(packageJson)).toEqual({ valid: true });
    });

    it('should return valid: true when bin and exports are valid objects with string paths', () => {
      const packageJson: PackageJson = {
        name: '@abbes-public/code-infra',
        version: '0.0.0',
        bin: { 'code-infra': 'src/bin.ts' },
        exports: { '.': './src/index.ts' },
      };
      expect(validatePackageJson(packageJson)).toEqual({ valid: true });
    });

    it('should return valid: true when bin, exports, and imports are all valid', () => {
      const packageJson: PackageJson = {
        name: '@abbes-public/code-infra',
        version: '0.0.0',
        bin: { 'code-infra': 'src/bin.ts' },
        exports: { '.': './src/index.ts' },
        imports: { '#/*': './src/*' },
      };
      expect(validatePackageJson(packageJson)).toEqual({ valid: true });
    });

    it('should return valid: true when only bin is defined as valid object', () => {
      const packageJson: PackageJson = { bin: { 'my-tool': './bin/tool.js' } };
      expect(validatePackageJson(packageJson)).toEqual({ valid: true });
    });

    it('should return valid: true when only exports is defined as valid object', () => {
      const packageJson: PackageJson = { exports: { '.': './lib/index.js', './sub': './lib/sub.js' } };
      expect(validatePackageJson(packageJson)).toEqual({ valid: true });
    });

    it('should return valid: true when only imports is defined as valid object', () => {
      const packageJson: PackageJson = {
        imports: {
          '#/*': './src/*',
          '#utils': './src/utils/index.ts',
        },
      };
      expect(validatePackageJson(packageJson)).toEqual({ valid: true });
    });

    it('should fail if bin is an invalid keyword type (e.g. string or array)', () => {
      expect(validatePackageJson({ bin: 'src/bin.ts' as unknown as PackageJson['bin'] } as PackageJson)).toEqual({
        valid: false,
        errors: ['Package JSON keyword field "bin" can\'t be a string.'],
      });

      expect(validatePackageJson({ bin: ['src/bin.ts'] as unknown as PackageJson['bin'] } as PackageJson)).toEqual({
        valid: false,
        errors: ['Package JSON  field "bin" can\'t be an array.'],
      });
    });

    it('should fail if exports is an invalid keyword type (e.g. number or array)', () => {
      expect(validatePackageJson({ exports: 123 as unknown as PackageJson['exports'] } as PackageJson)).toEqual({
        valid: false,
        errors: ['Package JSON keyword field "exports" can\'t be a number.'],
      });

      expect(
        validatePackageJson({ exports: ['./src/index.ts'] as unknown as PackageJson['exports'] } as PackageJson),
      ).toEqual({ valid: false, errors: ['Package JSON  field "exports" can\'t be an array.'] });
    });

    it('should fail if imports is an invalid keyword type (e.g. string, number, or array)', () => {
      expect(validatePackageJson({ imports: 'src/index.ts' as unknown as PackageJson['imports'] } as PackageJson)).toEqual({
        valid: false,
        errors: ['Package JSON keyword field "imports" can\'t be a string.'],
      });

      expect(validatePackageJson({ imports: 123 as unknown as PackageJson['imports'] } as PackageJson)).toEqual({
        valid: false,
        errors: ['Package JSON keyword field "imports" can\'t be a number.'],
      });

      expect(validatePackageJson({ imports: ['./src/*'] as unknown as PackageJson['imports'] } as PackageJson)).toEqual({
        valid: false,
        errors: ['Package JSON  field "imports" can\'t be an array.'],
      });
    });

    it('should fail if an imports key does not start with "#"', () => {
      const packageJson = {
        imports: {
          'utils/*': './src/utils/*',
        } as unknown as PackageJson['imports'],
      } as PackageJson;

      expect(validatePackageJson(packageJson)).toEqual({
        valid: false,
        errors: ['Package JSON imports key "utils/*" must start with "#".'],
      });
    });

    it('should fail if a field entry in bin is invalid', () => {
      const packageJson = { bin: { 'tool-a': 123 as unknown as string } } as PackageJson;

      expect(validatePackageJson(packageJson)).toEqual({
        valid: false,
        errors: ['Package JSON keyword field "tool-a" can\'t be a number.'],
      });
    });

    it('should fail if a field entry in exports is invalid', () => {
      const packageJson = { exports: { '.': { types: './index.d.ts' } as unknown as string } } as PackageJson;

      expect(validatePackageJson(packageJson)).toEqual({
        valid: false,
        errors: ['Package JSON  field "." can\'t be an object.'],
      });
    });

    it('should fail if a field entry in imports is invalid', () => {
      const packageJson = {
        imports: {
          '#tool-a': 123 as unknown as string,
        } as unknown as PackageJson['imports'],
      } as PackageJson;

      expect(validatePackageJson(packageJson)).toEqual({
        valid: false,
        errors: ['Package JSON keyword field "#tool-a" can\'t be a number.'],
      });
    });
  });

  describe('getInputByPackageJson', () => {
    it('should return empty object for empty package.json', () => {
      expect(getInputByPackageJson({})).toEqual({});
    });

    it('should extract key as relative path to src without extension for exports object', () => {
      const packageJson: PackageJson = {
        exports: {
          '.': './src/index.ts',
          './utils/path': './src/utils/path.ts',
          './components/Button': './src/components/Button/index.tsx',
        },
      };

      expect(getInputByPackageJson(packageJson)).toEqual({
        index: './src/index.ts',
        'utils/path': './src/utils/path.ts',
        'components/Button/index': './src/components/Button/index.tsx',
      });
    });

    it('should extract key as relative path to src without extension for bin object', () => {
      const packageJson: PackageJson = {
        bin: {
          'code-infra': 'src/bin.ts',
          'my-cli': './src/bin/cli.ts',
        },
      };

      expect(getInputByPackageJson(packageJson)).toEqual({
        bin: 'src/bin.ts',
        'bin/cli': './src/bin/cli.ts',
      });
    });

    it('should handle string exports and string bin', () => {
      const packageJson: PackageJson = {
        exports: './src/index.ts',
        bin: 'src/bin.ts',
      };

      expect(getInputByPackageJson(packageJson)).toEqual({
        index: './src/index.ts',
        bin: 'src/bin.ts',
      });
    });

    it('should combine both exports and bin fields', () => {
      const packageJson: PackageJson = {
        name: '@abbes-public/code-infra',
        exports: {
          '.': './src/index.ts',
          './utils/packageJson': './src/utils/packageJson.ts',
        },
        bin: {
          'code-infra': 'src/bin.ts',
        },
      };

      expect(getInputByPackageJson(packageJson)).toEqual({
        index: './src/index.ts',
        'utils/packageJson': './src/utils/packageJson.ts',
        bin: 'src/bin.ts',
      });
    });
  });
});
