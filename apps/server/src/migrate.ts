import "dotenv/config";
import { env } from "@virusmore/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const db = drizzle(env.DATABASE_URL);

await migrate(db, { migrationsFolder: "./migrations" });

console.log("Migrations applied successfully.");
process.exit(0);
