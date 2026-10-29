/**
 * Extract the relative package which statsWith main package name
 */
export function extractPackageName(id: string): string {
  if (id.startsWith('@')) {
    const [scope, name] = id.split('/');
    return `${scope}/${name}`;
  }
  return id.split('/')[0];
}
