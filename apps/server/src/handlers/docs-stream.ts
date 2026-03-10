import { getOrStreamDoc } from "@virusmore/api/services/ai-docs";
import { getOrFetchAnalysis } from "@virusmore/api/services/virustotal";
import type { AnalysisType } from "@virusmore/api/types";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

export async function docsStreamHandler(c: Context) {
	const type = c.req.param("type") as AnalysisType;
	const id = c.req.param("id");

	if (!id || !type) {
		return c.json({ error: "Missing type or id" }, 400);
	}

	let report: Awaited<ReturnType<typeof getOrFetchAnalysis>>;
	try {
		report = await getOrFetchAnalysis(type, id);
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Unknown error";
		return c.json({ error: msg }, msg.startsWith("NOT_FOUND") ? 404 : 500);
	}

	const result = await getOrStreamDoc(id, report);

	// Doc already generated — return it immediately as a single SSE event
	if ("existing" in result) {
		return streamSSE(c, async (stream) => {
			await stream.writeSSE({ data: result.existing, event: "complete" });
		});
	}

	// Stream word-by-word as Claude generates
	return streamSSE(c, async (stream) => {
		const reader = result.stream.textStream.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					await stream.writeSSE({ data: "", event: "done" });
					break;
				}
				await stream.writeSSE({ data: value, event: "chunk" });
			}
		} finally {
			reader.releaseLock();
		}
	});
}
