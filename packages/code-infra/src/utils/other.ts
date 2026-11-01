export type RewriteableValue = string | Record<string, unknown> | null;
export type RewriteHandler<T> = (value: T) => T;
