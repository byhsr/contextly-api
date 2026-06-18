import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { eq, and, like, desc, inArray } from "drizzle-orm";
import { createDb } from "../db";
import { contexts, dumps, sessions, sessionEntries, users } from "../db/schema";
import {registerSessionTools} from "./tool/sessions"
import {registerDumpTools} from "./tool/dumps"
import {registerContextTools} from "./tool/contexts"
import {registerMemoryTools} from "./tool/memory"

export function createMcpServer(db: ReturnType<typeof createDb>, userId: string) {
  const server = new McpServer({
    name: "contextly",
    version: "1.0.0",
  });


 registerContextTools(server, db, userId);
 registerDumpTools(server, db, userId);
 registerSessionTools(server, db, userId);
 registerMemoryTools(server, db, userId);
  return server;
}



