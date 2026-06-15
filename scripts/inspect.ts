import { execSync } from "node:child_process";

const DB_NAME = "contextly";

console.log("\n=== USERS ===\n");

execSync(
  `bunx wrangler d1 execute ${DB_NAME} --local --command="SELECT * FROM users;"`,
  { stdio: "inherit" }
);

console.log("\n=== CONTEXTS ===\n");

execSync(
  `bunx wrangler d1 execute ${DB_NAME} --local --command="SELECT * FROM contexts;"`,
  { stdio: "inherit" }
);