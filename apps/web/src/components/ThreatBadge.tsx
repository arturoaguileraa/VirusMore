import type { ThreatLevel } from "@virusmore/api/types";
import { ShieldAlert, ShieldCheck, ShieldOff, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

const CONFIG = {
	malicious: {
		icon: ShieldX,
		badge:
			"bg-[--threat-malicious]/10 text-[--threat-malicious] border-[--threat-malicious]/30",
		count: "text-[--threat-malicious]",
		glow: "shadow-[0_0_12px_color-mix(in_srgb,var(--threat-malicious)_20%,transparent)]",
	},
	suspicious: {
		icon: ShieldAlert,
		badge:
			"bg-[--threat-suspicious]/10 text-[--threat-suspicious] border-[--threat-suspicious]/30",
		count: "text-[--threat-suspicious]",
		glow: "shadow-[0_0_12px_color-mix(in_srgb,var(--threat-suspicious)_20%,transparent)]",
	},
	clean: {
		icon: ShieldCheck,
		badge:
			"bg-[--threat-clean]/10 text-[--threat-clean] border-[--threat-clean]/30",
		count: "text-[--threat-clean]",
		glow: "shadow-[0_0_12px_color-mix(in_srgb,var(--threat-clean)_15%,transparent)]",
	},
	unknown: {
		icon: ShieldOff,
		badge: "bg-secondary text-muted-foreground border-border",
		count: "text-muted-foreground",
		glow: "",
	},
} as const;

interface Props {
	threat: ThreatLevel;
	stats: {
		malicious: number;
		suspicious: number;
		undetected: number;
		harmless: number;
	};
}

export function ThreatBadge({ threat, stats }: Props) {
	const cfg = CONFIG[threat.level];
	const Icon = cfg.icon;
	const total =
		stats.malicious + stats.suspicious + stats.undetected + stats.harmless;

	return (
		<div className="flex flex-col gap-2">
			<span
				className={cn(
					"inline-flex w-fit items-center gap-1.5 rounded-lg border px-3 py-1.5 font-semibold text-sm tracking-wide",
					cfg.badge,
					cfg.glow,
				)}
			>
				<Icon className="size-3.5 shrink-0" />
				{threat.label}
			</span>

			<p className="text-muted-foreground text-sm leading-snug">
				<span className={cn("font-bold tabular-nums", cfg.count)}>
					{stats.malicious}
				</span>
				{" of "}
				<span className="font-semibold text-foreground tabular-nums">
					{total}
				</span>
				{" engines flagged as malicious"}
				{stats.suspicious > 0 && (
					<span className="ml-1.5 text-[--threat-suspicious] text-xs">
						(+{stats.suspicious} suspicious)
					</span>
				)}
			</p>
		</div>
	);
}
