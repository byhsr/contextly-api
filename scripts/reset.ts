import { execSync } from "node:child_process";

const DB_NAME = "contextly";

execSync(
  `bunx wrangler d1 execute ${DB_NAME} --local --command="DELETE FROM contexts;"`,
  { stdio: "inherit" }
);

execSync(
  `bunx wrangler d1 execute ${DB_NAME} --local --command="DELETE FROM users;"`,
  { stdio: "inherit" }
);

console.log("\nDatabase reset complete.\n");