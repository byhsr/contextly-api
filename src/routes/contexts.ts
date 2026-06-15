import { Hono } from "hono";
import { Bindings } from "../lib/types";

const contexts = new Hono<{ Bindings: Bindings }>();

contexts.get("/", (c) => {
  return c.json({ message: "all contexts" });
});

export default contexts;