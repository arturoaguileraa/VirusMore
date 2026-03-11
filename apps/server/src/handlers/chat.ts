import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { VTReport } from "@virusmore/api/types";
import { db } from "@virusmore/db";
import { chatMessages } from "@virusmore/db/schema/index";
import { env } from "@virusmore/env/server";
import { convertToCoreMessages, streamText } from "ai";
import type { Context } from "hono";

const CHAT_SYSTEM = (
	report: VTReport,
) => `You are a senior cybersecurity analyst. \
The user is asking questions about a VirusTotal analysis report.

Analysis context:
- Type: ${report.type}
- ID: ${report.id}
- Detection ratio: ${report.attributes.last_analysis_stats.malicious} malicious / ${
	report.attributes.last_analysis_stats.malicious +
	report.attributes.last_analysis_stats.undetected +
	report.attributes.last_analysis_stats.harmless
} total engines

Full report data:
\`\`\`json
${JSON.stringify(report.attributes, null, 2)}
\`\`\`

Answer questions about this analysis precisely and technically. Use markdown formatting. \
If asked about something not in the report, say so clearly. \
Always respond in the same language the user writes in.`;

export async function chatHandler(c: Context) {
	const { messages, report, sessionId } = (await c.req.json()) as {
		messages: { role: "user" | "assistant"; content: string }[];
		report: VTReport;
		sessionId: string;
	};

	// Persist the last user message
	const lastUser = messages.at(-1);
	if (lastUser?.role === "user") {
		await db.insert(chatMessages).values({
			sessionId,
			analysisId: report.id,
			role: "user",
			content: lastUser.content,
		});
	}

	const google = createGoogleGenerativeAI({
		apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
	});

	const result = streamText({
		model: google("gemini-2.0-flash"),
		system: CHAT_SYSTEM(report),
		messages: convertToCoreMessages(messages),
		onFinish: async ({ text }) => {
			await db.insert(chatMessages).values({
				sessionId,
				analysisId: report.id,
				role: "assistant",
				content: text,
			});
		},
	});

	return result.toDataStreamResponse();
}
