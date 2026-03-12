import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@virusmore/api/context";
import { appRouter } from "@virusmore/api/routers/index";
import { env } from "@virusmore/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { chatHandler } from "./handlers/chat";
import { docsStreamHandler } from "./handlers/docs-stream";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: (origin) => {
			const allowed = env.CORS_ORIGIN.split(",").map((o) => o.trim());
			return allowed.includes(origin) ? origin : allowed[0];
		},
		allowMethods: ["GET", "POST", "OPTIONS"],
	}),
);

// ─── oRPC ─────────────────────────────────────────────────────────────────────
const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [onError((error) => console.error(error))],
});

const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [onError((error) => console.error(error))],
});

app.use("/*", async (c, next) => {
	const context = await createContext({ context: c });

	const rpcResult = await rpcHandler.handle(c.req.raw, {
		prefix: "/rpc",
		context,
	});
	if (rpcResult.matched) {
		return c.newResponse(rpcResult.response.body, rpcResult.response);
	}

	const apiResult = await apiHandler.handle(c.req.raw, {
		prefix: "/api-reference",
		context,
	});
	if (apiResult.matched) {
		return c.newResponse(apiResult.response.body, apiResult.response);
	}

	await next();
});

// ─── AI SDK Chat (streaming) ──────────────────────────────────────────────────
app.post("/api/chat", chatHandler);

// ─── Docs SSE stream ──────────────────────────────────────────────────────────
app.get("/api/docs/stream/:type/:id", docsStreamHandler);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/", (c) => c.text("OK"));

export default app;
