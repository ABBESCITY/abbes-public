import type { Argv } from 'yargs';

type PackageConfig = {
  packageName: string;
  packageEntry: string;
  packageSplit?: boolean;
};

// Validate Handler
const isPackageConfig = (value: unknown): value is PackageConfig => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    'packageName' in value &&
    typeof value.packageName === 'string' &&
    'packageEntry' in value &&
    typeof value.packageEntry === 'string' &&
    (!('packageSplit' in value) || typeof value.packageSplit === 'boolean')
  );
};
const parsePackageConfig = (value: unknown): PackageConfig => {
  const config = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;

  if (!isPackageConfig(config)) {
    throw new Error(
      '`packages` must be an array of { packageName: string, packageEntry: string, packageSplit?: boolean }',
    );
  }

  return config;
};
const parsePackageConfigs = (values: unknown[]): PackageConfig[] =>
  values.flatMap((value) => {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;

    return Array.isArray(parsed) ? parsed.map(parsePackageConfig) : parsePackageConfig(parsed);
  });

// Command
export default {
  command: 'buildMany',
  describe: 'Builds multiple packages for publishing.',
  builder: (yargs: Argv) =>
    yargs.option('packages', {
      type: 'array',
      default: [],
      coerce: parsePackageConfigs,
      describe:
        'Package configs. Pass JSON objects or a JSON array with packageName, packageEntry, and optional packageSplit.',
    }),
  handler: async () => {},
};
