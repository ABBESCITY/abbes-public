import fs from 'node:fs';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/config-helpers';

export function includeIgnoreIfExists(filePath: string, description: string) {
  if (fs.existsSync(filePath)) {
    return includeIgnoreFile(filePath, description);
  }
  return [];
}

export function getRelativePath(filePath: string) {
  return path.relative(process.cwd(), filePath);
}
