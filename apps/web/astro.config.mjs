import node from "@astrojs/node";
import react from "@astrojs/react";
// @ts-check
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	integrations: [react()],
	env: {
		schema: {
			PUBLIC_SERVER_URL: envField.string({
				access: "public",
				context: "client",
				default: "http://localhost:3000",
			}),
		},
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
