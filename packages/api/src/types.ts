// ─── VirusTotal API types ────────────────────────────────────────────────────

export type AnalysisType = "file" | "url" | "domain" | "ip";

export interface VTAttributes {
	// Common
	last_analysis_stats: {
		malicious: number;
		suspicious: number;
		undetected: number;
		harmless: number;
		timeout?: number;
		"confirmed-timeout"?: number;
		failure?: number;
		"type-unsupported"?: number;
	};
	last_analysis_results: Record<
		string,
		{
			category: string;
			engine_name: string;
			engine_version: string | null;
			result: string | null;
			method: string;
			engine_update: string;
		}
	>;
	reputation: number;
	tags: string[];
	// File-specific
	name?: string;
	meaningful_name?: string;
	size?: number;
	type_description?: string;
	type_extension?: string;
	magic?: string;
	md5?: string;
	sha1?: string;
	sha256?: string;
	ssdeep?: string;
	tlsh?: string;
	first_submission_date?: number;
	last_submission_date?: number;
	times_submitted?: number;
	total_votes?: { harmless: number; malicious: number };
	// URL/domain-specific
	url?: string;
	final_url?: string;
	title?: string;
	// Domain-specific
	registrar?: string;
	creation_date?: number;
	// IP-specific
	country?: string;
	asn?: number;
	as_owner?: string;
	network?: string;
}

export interface VTReport {
	id: string;
	type: AnalysisType;
	attributes: VTAttributes;
	links?: { self: string };
}

// ─── App types ───────────────────────────────────────────────────────────────

export interface ThreatLevel {
	level: "clean" | "suspicious" | "malicious" | "unknown";
	score: number; // 0-100
	label: string;
	color: string;
}

export function getThreatLevel(
	stats: VTAttributes["last_analysis_stats"],
): ThreatLevel {
	const total =
		stats.malicious +
		stats.suspicious +
		stats.undetected +
		stats.harmless +
		(stats.timeout ?? 0);

	if (total === 0)
		return { level: "unknown", score: 0, label: "Unknown", color: "gray" };

	const malicious = stats.malicious ?? 0;
	const suspicious = stats.suspicious ?? 0;
	const score = Math.round(((malicious + suspicious * 0.5) / total) * 100);

	if (malicious >= 5 || score >= 30) {
		return { level: "malicious", score, label: "Malicious", color: "red" };
	}
	if (malicious > 0 || suspicious >= 3 || score >= 10) {
		return { level: "suspicious", score, label: "Suspicious", color: "yellow" };
	}
	return { level: "clean", score, label: "Clean", color: "green" };
}

export interface DocSection {
	id: string;
	title: string;
	level: number;
}

export function extractSections(markdown: string): DocSection[] {
	const sections: DocSection[] = [];
	const lines = markdown.split("\n");
	for (const line of lines) {
		const match = line.match(/^(#{1,3})\s+(.+)/);
		if (match?.[1] && match?.[2]) {
			const level = match[1].length;
			const title = match[2].trim();
			const id = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");
			sections.push({ id, title, level });
		}
	}
	return sections;
}
