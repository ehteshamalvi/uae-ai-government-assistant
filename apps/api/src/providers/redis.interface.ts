export interface RedisClientLike {
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  quit(): Promise<void>;
}
