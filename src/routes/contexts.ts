import { Hono } from "hono";
import { Bindings, Variables } from "../lib/types";
import {
    getContexts,
    createContext,
    updateContext,
    deleteContext,
    getContext,
    getContextTree,
    searchContexts
} from "../services/context"

const contexts = new Hono<{ Bindings: Bindings; Variables: Variables }>();


contexts.get("/", getContexts);
contexts.get("/search", searchContexts);
contexts.get("/:id", getContext);
contexts.get("/:id/tree", getContextTree);
contexts.post("/", createContext);
contexts.patch("/:id", updateContext);
contexts.delete("/:id", deleteContext);

export default contexts;