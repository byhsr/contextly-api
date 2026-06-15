import { Hono } from "hono";
import { Bindings , Variables} from "../lib/types";

import {
  signup,
  login,
  refresh,
  logout,
  me,
} from "../services/auth";
import { authMiddleware } from "../middleware/auth";

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

auth.post("/signup", signup);
auth.post("/login", login);
auth.post("/refresh", refresh);
auth.post("/logout", logout);
auth.get("/me", authMiddleware,  me);

export default auth;