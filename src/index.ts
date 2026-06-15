import { Hono } from "hono";
import { createDb } from "./db";
import {Bindings} from "./lib/types"
import { sql } from "drizzle-orm";
import auth from "./routes/auth";
import contexts from "./routes/contexts";


const app = new Hono<{ Bindings: Bindings }>();


app.get("/health", async (c) => c.json({ ok: true,}))
app.route("/auth", auth);
app.route("/contexts", contexts);

export default app;


