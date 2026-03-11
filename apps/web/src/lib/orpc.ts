import { PUBLIC_SERVER_URL } from "astro:env/client";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "@virusmore/api/routers/index";

// SERVER_URL is only available server-side (set in Docker for internal networking).
// Falls back to PUBLIC_SERVER_URL which works for both local dev and browser.
const baseUrl = import.meta.env.SERVER_URL ?? PUBLIC_SERVER_URL;

export const link = new RPCLink({
	url: `${baseUrl}/rpc`,
});

export const orpc: AppRouterClient = createORPCClient(link);
