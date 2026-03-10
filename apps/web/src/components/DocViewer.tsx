"use client";
import type { DocSection } from "@virusmore/api/types";
import { extractSections } from "@virusmore/api/types";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Props {
	analysisId: string;
	type: string;
	initialDoc: string | null;
	serverUrl: string;
}

export function DocViewer({ analysisId, type, initialDoc, serverUrl }: Props) {
	const [content, setContent] = useState(initialDoc ?? "");
	const [isStreaming, setIsStreaming] = useState(!initialDoc);
	const [sections, setSections] = useState<DocSection[]>([]);
	const [activeId, setActiveId] = useState("");
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (content) setSections(extractSections(content));
	}, [content]);

	useEffect(() => {
		if (initialDoc) return;
		const es = new EventSource(
			`${serverUrl}/api/docs/stream/${type}/${analysisId}`,
		);
		es.addEventListener("chunk", (e) => setContent((prev) => prev + e.data));
		es.addEventListener("complete", (e) => {
			setContent(e.data);
			setIsStreaming(false);
			es.close();
		});
		es.addEventListener("done", () => {
			setIsStreaming(false);
			es.close();
		});
		es.onerror = () => {
			setIsStreaming(false);
			es.close();
		};
		return () => es.close();
	}, [analysisId, type, serverUrl, initialDoc]);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) setActiveId(e.target.id);
				}
			},
			{ rootMargin: "-80px 0px -60% 0px" },
		);
		for (const h of contentRef.current?.querySelectorAll("h2, h3") ?? []) {
			observer.observe(h);
		}
		return () => observer.disconnect();
	}, []);

	return (
		<div className="flex min-h-0">
			{/* Content */}
			<div ref={contentRef} className="min-w-0 flex-1 px-6 py-6 lg:px-8">
				{isStreaming && content.length === 0 && <DocSkeleton />}

				<div className="prose max-w-none">
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						components={{
							h2: ({ children, ...props }) => {
								const id = toId(String(children));
								return (
									<h2 id={id} {...props}>
										{children}
									</h2>
								);
							},
							h3: ({ children, ...props }) => {
								const id = toId(String(children));
								return (
									<h3 id={id} {...props}>
										{children}
									</h3>
								);
							},
						}}
					>
						{content}
					</ReactMarkdown>
					{isStreaming && content.length > 0 && (
						<span className="cursor-blink" />
					)}
				</div>
			</div>

			{/* Table of contents */}
			{sections.length > 0 && (
				<aside className="hidden w-52 shrink-0 border-border border-l xl:block">
					<ScrollArea className="sticky top-14 h-[calc(100vh-112px)]">
						<div className="py-5 pr-4">
							<p className="mb-3 pl-4 font-semibold text-[0.65rem] text-muted-foreground uppercase tracking-widest">
								On this page
							</p>
							<nav className="space-y-px">
								{sections.map((s) => (
									<a
										key={s.id}
										href={`#${s.id}`}
										className={cn(
											"block border-l-2 py-1 text-[0.78rem] leading-snug transition-colors",
											s.level === 3 ? "pl-6" : "pl-4",
											activeId === s.id
												? "border-primary font-medium text-primary"
												: "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
										)}
									>
										{s.title}
									</a>
								))}
							</nav>
						</div>
					</ScrollArea>
				</aside>
			)}
		</div>
	);
}

function toId(text: string) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function DocSkeleton() {
	return (
		<div className="space-y-2 py-2">
			<div className="mb-6 flex items-center gap-2 text-muted-foreground text-sm">
				<Loader2 className="size-4 shrink-0 animate-spin text-primary" />
				<span>Generating AI documentation…</span>
			</div>
			{[200, 160, 240, 100, 180, 140, 220, 120].map((w) => (
				<div
					key={w}
					className={cn("skeleton h-4")}
					style={{ width: `${w}px`, maxWidth: "100%" }}
				/>
			))}
		</div>
	);
}
