import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../index";
import { analysisRouter } from "./analysis";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => "OK"),
	analysis: analysisRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
