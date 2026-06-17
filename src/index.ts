import { Hono } from "hono";
import {Bindings, Variables} from "./lib/types"
import auth from "./routes/auth";
import contexts from "./routes/contexts";
import { authMiddleware } from "./middleware/auth";
import dump from "./routes/dumps";
import sess from "./routes/sessions"


const app = new Hono<{ Bindings: Bindings, Variables : Variables }>();


app.get("/health", async (c) => c.json({ ok: true,}))
app.route("/auth", auth);
app.use("/contexts/*", authMiddleware)
app.route("/contexts", contexts);
app.use("/dump/*", authMiddleware);
app.route("/dump", dump)
app.use("/session/*", authMiddleware);
app.route("/session", sess)

export default app;


