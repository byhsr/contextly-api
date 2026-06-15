import { Hono } from "hono";
import { createDb } from "./db";
import {Bindings, Variables} from "./lib/types"
import { sql } from "drizzle-orm";
import auth from "./routes/auth";
import contexts from "./routes/contexts";
import { authMiddleware } from "./middleware/auth";


const app = new Hono<{ Bindings: Bindings, Variables : Variables }>();


app.get("/health", async (c) => c.json({ ok: true,}))
app.route("/auth", auth);
app.use("/contexts/*", authMiddleware)
app.route("/contexts", contexts);

export default app;


