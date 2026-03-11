import { PUBLIC_SERVER_URL } from "astro:env/client";
import { SERVER_URL } from "astro:env/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "@virusmore/api/routers/index";

const baseUrl = SERVER_URL ?? PUBLIC_SERVER_URL;

export const orpc: AppRouterClient = createORPCClient(
	new RPCLink({ url: `${baseUrl}/rpc` }),
);
