import { drizzle } from "drizzle-orm/d1";
import {D1Database} from '@cloudflare/workers-types'

export const createDb = (db: D1Database) => {
  return drizzle(db);
};