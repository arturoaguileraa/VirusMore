import { db } from "@virusmore/db";
import { analyses } from "@virusmore/db/schema";
import { env } from "@virusmore/env/server";
import { eq } from "drizzle-orm";
import type { AnalysisType, VTReport } from "../types";

const VT_BASE = "https://www.virustotal.com/api/v3";

const VT_ENDPOINTS: Record<AnalysisType, (id: string) => string> = {
	file: (id) => `/files/${id}`,
	url: (id) => `/urls/${id}`,
	domain: (id) => `/domains/${id}`,
	ip: (id) => `/ip_addresses/${id}`,
};

// TTL in ms. Files are immutable by hash, so we keep them indefinitely.
const TTL: Record<AnalysisType, number | null> = {
	file: null, // never expires
	url: 2 * 60 * 60 * 1000, // 2 hours
	domain: 6 * 60 * 60 * 1000, // 6 hours
	ip: 6 * 60 * 60 * 1000, // 6 hours
};

async function fetchFromVT(type: AnalysisType, id: string): Promise<VTReport> {
	const endpoint = VT_ENDPOINTS[type](id);
	const res = await fetch(`${VT_BASE}${endpoint}`, {
		headers: {
			"x-apikey": env.VIRUSTOTAL_API_KEY,
			Accept: "application/json",
		},
	});

	if (!res.ok) {
		if (res.status === 404) {
			throw new Error(`NOT_FOUND: ${type} ${id} not found on VirusTotal`);
		}
		if (res.status === 429) {
			throw new Error("RATE_LIMIT: VirusTotal API rate limit exceeded");
		}
		throw new Error(`VT_API_ERROR: ${res.status} ${res.statusText}`);
	}

	const json = (await res.json()) as {
		data: {
			id: string;
			attributes: VTReport["attributes"];
			links?: VTReport["links"];
		};
	};
	return {
		id: json.data.id,
		type,
		attributes: json.data.attributes,
		links: json.data.links,
	};
}

export async function getOrFetchAnalysis(
	type: AnalysisType,
	id: string,
): Promise<VTReport> {
	// Check cache
	const cached = await db.query.analyses.findFirst({
		where: eq(analyses.id, id),
	});

	if (cached) {
		const expired = cached.expiresAt !== null && new Date() > cached.expiresAt;
		if (!expired) {
			return cached.rawData as VTReport;
		}
	}

	// Fetch fresh from VT
	const report = await fetchFromVT(type, id);

	const ttl = TTL[type];
	const expiresAt = ttl ? new Date(Date.now() + ttl) : null;

	await db
		.insert(analyses)
		.values({
			id,
			type,
			rawData: report,
			expiresAt,
		})
		.onConflictDoUpdate({
			target: analyses.id,
			set: {
				rawData: report,
				fetchedAt: new Date(),
				expiresAt,
			},
		});

	return report;
}
