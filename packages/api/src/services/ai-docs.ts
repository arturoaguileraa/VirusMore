import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { db } from "@virusmore/db";
import { aiDocs } from "@virusmore/db/schema";
import { env } from "@virusmore/env/server";
import { streamText } from "ai";
import { eq } from "drizzle-orm";
import type { VTReport } from "../types";
import { getThreatLevel } from "../types";

const DOC_SYSTEM_PROMPT = `You are a senior cybersecurity analyst. Generate comprehensive, well-structured markdown documentation about a VirusTotal analysis report.

Structure your response with these sections (use ## for headers):
1. **Executive Summary** — threat level, verdict, one-paragraph overview
2. **Technical Details** — file/URL metadata, hashes, sizes, type
3. **Detection Analysis** — breakdown of AV engine results, notable detectors
4. **Threat Intelligence** — known threat families, malware categories, tags
5. **Indicators of Compromise (IOCs)** — all relevant hashes, URLs, IPs
6. **Recommendations** — what the user should do

Rules:
- Use emojis sparingly for severity: 🔴 malicious, 🟡 suspicious, 🟢 clean, ⚪ unknown
- Be technical but clear
- Format hashes and IPs in inline code blocks
- Only include sections relevant to the analysis type (file/url/domain/ip)
- Do NOT include a title at the top (it's rendered separately)
- Write in English`;

function buildDocPrompt(report: VTReport): string {
	const threat = getThreatLevel(report.attributes.last_analysis_stats);
	const stats = report.attributes.last_analysis_stats;
	const totalEngines =
		stats.malicious +
		stats.suspicious +
		stats.undetected +
		stats.harmless +
		(stats.timeout ?? 0);

	return `Analyze this VirusTotal ${report.type} report and generate documentation:

**Type:** ${report.type}
**ID:** ${report.id}
**Threat Level:** ${threat.label} (${threat.score}/100)
**Detection Ratio:** ${stats.malicious}/${totalEngines} engines flagged as malicious

**Full Report Data:**
\`\`\`json
${JSON.stringify(report.attributes, null, 2)}
\`\`\``;
}

export async function getOrStreamDoc(
	analysisId: string,
	report: VTReport,
): Promise<{ existing: string } | { stream: ReturnType<typeof streamText> }> {
	// Check if complete doc already exists
	const existing = await db.query.aiDocs.findFirst({
		where: eq(aiDocs.analysisId, analysisId),
	});

	if (existing?.isComplete) {
		return { existing: existing.content };
	}

	// Create placeholder row so concurrent requests don't double-generate
	await db
		.insert(aiDocs)
		.values({ analysisId, content: "", isComplete: false })
		.onConflictDoNothing();

	const google = createGoogleGenerativeAI({
		apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
	});

	const result = streamText({
		model: google("gemini-2.0-flash"),
		system: DOC_SYSTEM_PROMPT,
		prompt: buildDocPrompt(report),
		onFinish: async ({ text }) => {
			await db
				.update(aiDocs)
				.set({ content: text, isComplete: true, generatedAt: new Date() })
				.where(eq(aiDocs.analysisId, analysisId));
		},
	});

	return { stream: result };
}
