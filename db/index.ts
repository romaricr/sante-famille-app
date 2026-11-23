import { drizzle } from 'drizzle-orm/netlify-db';
import * as schema from './schema.ts';

let client: ReturnType<typeof drizzle> | undefined;

export function database() {
  return (client ??= drizzle({ schema }));
}
