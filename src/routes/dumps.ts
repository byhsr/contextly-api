import { Hono } from "hono";
import { Bindings ,Variables} from "hono/types";
import { createDump, getDumps } from "../services/dumps";

const dump = new Hono<{ Bindings: Bindings; Variables: Variables }>();



dump.post("/dumps/:contextId", createDump);
dump.get("/dumps/:contextId", getDumps);

export default dump