import { cn } from "@/lib/utils";

interface EngineResult {
	engine_name: string;
	category: string;
	result: string | null;
}

interface Props {
	results: Record<string, EngineResult>;
}

const CATEGORY: Record<
	string,
	{ label: string; rowClass: string; badgeClass: string; headClass: string }
> = {
	malicious: {
		label: "Malicious",
		rowClass: "",
		badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
		headClass: "text-destructive",
	},
	suspicious: {
		label: "Suspicious",
		rowClass: "",
		badgeClass:
			"bg-[--threat-suspicious]/10 text-[--threat-suspicious] border-[--threat-suspicious]/30",
		headClass: "text-[--threat-suspicious]",
	},
	undetected: {
		label: "Clean",
		rowClass: "",
		badgeClass:
			"bg-[--threat-clean]/10 text-[--threat-clean] border-[--threat-clean]/30",
		headClass: "text-[--threat-clean]",
	},
	harmless: {
		label: "Clean",
		rowClass: "",
		badgeClass:
			"bg-[--threat-clean]/10 text-[--threat-clean] border-[--threat-clean]/30",
		headClass: "text-[--threat-clean]",
	},
	timeout: {
		label: "Timeout",
		rowClass: "",
		badgeClass: "bg-secondary text-muted-foreground border-border",
		headClass: "text-muted-foreground",
	},
	"type-unsupported": {
		label: "N/A",
		rowClass: "",
		badgeClass: "bg-secondary text-muted-foreground border-border",
		headClass: "text-muted-foreground",
	},
	failure: {
		label: "Error",
		rowClass: "",
		badgeClass: "bg-secondary text-muted-foreground border-border",
		headClass: "text-muted-foreground",
	},
};

const ORDER = [
	"malicious",
	"suspicious",
	"undetected",
	"harmless",
	"timeout",
	"failure",
	"type-unsupported",
];

function Group({
	title,
	items,
	headClass,
}: {
	title: string;
	items: [string, EngineResult][];
	headClass: string;
}) {
	if (items.length === 0) return null;

	return (
		<div className="mb-6 last:mb-0">
			<h4
				className={cn(
					"mb-2.5 font-semibold text-[0.68rem] uppercase tracking-widest",
					headClass,
				)}
			>
				{title} <span className="font-normal opacity-70">({items.length})</span>
			</h4>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-1.5">
				{items.map(([key, engine]) => {
					const cfg = CATEGORY[engine.category] ?? CATEGORY.failure;
					return (
						<div
							key={key}
							className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
						>
							<span className="truncate font-medium text-foreground text-sm">
								{engine.engine_name}
							</span>
							<span
								className={cn(
									"max-w-[130px] shrink-0 truncate rounded border px-1.5 py-0.5 font-medium text-[0.68rem]",
									cfg.badgeClass,
								)}
							>
								{engine.result ?? cfg.label}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export function EngineGrid({ results }: Props) {
	const entries = Object.entries(results).sort(
		([, a], [, b]) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category),
	);

	const groups = ORDER.reduce<Record<string, [string, EngineResult][]>>(
		(acc, cat) => {
			acc[cat] = entries.filter(([, v]) => v.category === cat);
			return acc;
		},
		{},
	);

	return (
		<div>
			<Group
				title="Malicious"
				items={groups.malicious}
				headClass={CATEGORY.malicious.headClass}
			/>
			<Group
				title="Suspicious"
				items={groups.suspicious}
				headClass={CATEGORY.suspicious.headClass}
			/>
			<Group
				title="Clean"
				items={[...groups.undetected, ...groups.harmless]}
				headClass={CATEGORY.undetected.headClass}
			/>
			<Group
				title="Other"
				items={[
					...groups.timeout,
					...groups.failure,
					...groups["type-unsupported"],
				]}
				headClass={CATEGORY.timeout.headClass}
			/>
		</div>
	);
}
