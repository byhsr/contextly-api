import { Hono } from "hono";
import { createDb } from "./db";
import {Bindings} from "./lib/types"
import { sql } from "drizzle-orm";

const app = new Hono<{ Bindings: Bindings }>();


app.get("/health", async (c) => {
  const db = createDb(c.env.DB);

  const result = await db.run(
    sql`SELECT COUNT(*) as count FROM users`
  );

  return c.json({
    ok: true,
    result,
  });
});

export default app
