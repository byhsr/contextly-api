import { Hono } from "hono";
import { Bindings } from "../lib/types";

import {
  signup,
  login,
  refresh,
  logout,
  me,
} from "../services/auth";

const auth = new Hono<{ Bindings: Bindings }>();

auth.post("/signup", signup);
auth.post("/login", login);
auth.post("/refresh", refresh);
auth.post("/logout", logout);
auth.get("/me", me);

export default auth;