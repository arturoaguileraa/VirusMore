#!/usr/bin/env bun
/**
 * Regenerate the AI documentation for a given analysis.
 *
 * Usage:
 *   bun scripts/regen-doc.ts <type> <id>
 *
 * Examples:
 *   bun scripts/regen-doc.ts file 3ecc0186adba60fb53e9f6c494623dcea979a95c3e66a52896693b8d22f5e18b
 *   bun scripts/regen-doc.ts domain malware.wicar.org
 *   bun scripts/regen-doc.ts ip-address 1.1.1.1
 *
 * What it does:
 *   1. Deletes the existing ai_docs row (if any)
 *   2. Fetches or reuses the cached VT analysis
 *   3. Calls Gemini to generate a fresh doc and saves it
 */

import "dotenv/config";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getOrFetchAnalysis } from "@virusmore/api/services/virustotal";
import type { AnalysisType, VTReport } from "@virusmore/api/types";
import { getThreatLevel } from "@virusmore/api/types";
import { db } from "@virusmore/db";
import { aiDocs } from "@virusmore/db/schema/index";
import { env } from "@virusmore/env/server";
import { generateText } from "ai";
import { eq } from "drizzle-orm";

const VALID_TYPES = ["file", "url", "domain", "ip"] as const;

const [, , rawType, id] = process.argv;

if (!rawType || !id) {
	console.error("Usage: bun scripts/regen-doc.ts <type> <id>");
	console.error("Types: file | url | domain | ip");
	process.exit(1);
}

const type = rawType as AnalysisType;
if (!VALID_TYPES.includes(type)) {
	console.error(
		`Invalid type "${type}". Must be one of: ${VALID_TYPES.join(", ")}`,
	);
	process.exit(1);
}

const DOC_SYSTEM = `You are a senior cybersecurity analyst. Generate comprehensive, well-structured markdown documentation about a VirusTotal analysis report.

Structure your response with these sections (use ## for headers):
1. **Executive Summary** — threat level, verdict, one-paragraph overview
2. **Technical Details** — file/URL metadata, hashes, sizes, type
3. **Detection Analysis** — breakdown of AV engine results, notable detectors
4. **Threat Intelligence** — known threat families, malware categories, tags
5. **Indicators of Compromise (IOCs)** — all relevant hashes, URLs, IPs
6. **Recommendations** — what the user should do

Rules:
- Be technical but clear
- Format hashes and IPs in inline code blocks
- Only include sections relevant to the analysis type (file/url/domain/ip)
- Do NOT include a title at the top (it is rendered separately)
- Write in English
- Do not use emojis`;

function buildPrompt(report: VTReport): string {
	const threat = getThreatLevel(report.attributes.last_analysis_stats);
	const stats = report.attributes.last_analysis_stats;
	const total =
		stats.malicious +
		stats.suspicious +
		stats.undetected +
		stats.harmless +
		(stats.timeout ?? 0);

	return `Analyze this VirusTotal ${report.type} report and generate documentation:

**Type:** ${report.type}
**ID:** ${report.id}
**Threat Level:** ${threat.label} (${threat.score}/100)
**Detection Ratio:** ${stats.malicious}/${total} engines flagged as malicious

**Full Report Data:**
\`\`\`json
${JSON.stringify(report.attributes, null, 2)}
\`\`\``;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\nRegenerating doc for ${type}:${id}\n`);

// 1. Delete existing doc
const deleted = await db
	.delete(aiDocs)
	.where(eq(aiDocs.analysisId, id))
	.returning();
if (deleted.length > 0) {
	console.log("  Deleted existing doc.");
} else {
	console.log("  No existing doc found.");
}

// 2. Fetch analysis (uses cache if available)
console.log("  Fetching analysis from VirusTotal (or cache)...");
const report = await getOrFetchAnalysis(type, id);
const threat = getThreatLevel(report.attributes.last_analysis_stats);
const stats = report.attributes.last_analysis_stats;
console.log(
	`  Analysis fetched. Verdict: ${threat.label} (${stats.malicious} malicious detections)`,
);

// 3. Generate doc with Gemini
console.log("  Generating documentation with Gemini...");
const google = createGoogleGenerativeAI({
	apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const { text, usage } = await generateText({
	model: google("gemini-2.0-flash"),
	system: DOC_SYSTEM,
	prompt: buildPrompt(report),
});

console.log(
	`  Generated ${text.length} characters (${usage.totalTokens} tokens).`,
);

// 4. Save to DB (upsert — handles race with the dev server)
await db
	.insert(aiDocs)
	.values({ analysisId: id, content: text, isComplete: true })
	.onConflictDoUpdate({
		target: aiDocs.analysisId,
		set: { content: text, isComplete: true, generatedAt: new Date() },
	});

console.log("  Saved to database.\n");
console.log(`Done. Visit: http://localhost:4321/gui/${type}/${id}\n`);

process.exit(0);
