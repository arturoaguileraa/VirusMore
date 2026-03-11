"use client";
import { useChat } from "@ai-sdk/react";
import type { VTReport } from "@virusmore/api/types";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Props {
	report: VTReport;
	serverUrl: string;
}

function getSessionId() {
	if (typeof sessionStorage === "undefined") return crypto.randomUUID();
	let id = sessionStorage.getItem("vm_session");
	if (!id) {
		id = crypto.randomUUID();
		sessionStorage.setItem("vm_session", id);
	}
	return id;
}

const SUGGESTIONS = [
	"Is this file safe to open?",
	"What malware family is this?",
	"List all indicators of compromise.",
	"What actions should I take?",
];

export function ChatAgent({ report, serverUrl }: Props) {
	const [isOpen, setIsOpen] = useState(false);
	const [barInput, setBarInput] = useState("");
	const sessionId = useRef(getSessionId());
	const bottomRef = useRef<HTMLDivElement>(null);

	const { messages, append, status, input, setInput, handleSubmit } = useChat({
		api: `${serverUrl}/api/chat`,
		body: { report, sessionId: sessionId.current },
		streamProtocol: "data",
	});

	const isLoading = status === "streaming" || status === "submitted";

	// Shift main content when panel opens/closes
	useEffect(() => {
		const main = document.getElementById("analysis-main");
		if (main) main.style.marginRight = isOpen ? "50%" : "0";
		return () => {
			if (main) main.style.marginRight = "0";
		};
	}, [isOpen]);

	// Scroll to bottom on new messages
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	const sendMessage = async (text: string) => {
		if (!text.trim() || isLoading) return;
		if (!isOpen) setIsOpen(true);
		await append({ role: "user", content: text });
	};

	return (
		<>
			{/* ── Sticky bottom input bar (visible when panel is closed) ── */}
			{!isOpen && (
				<div
					className="fixed right-0 bottom-0 left-0 z-40 px-6 pt-10 pb-5"
					style={{ background: "transparent" }}
				>
					<form
						className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border px-4 py-3"
						style={{
							background: "color-mix(in srgb, var(--card) 70%, transparent)",
							backdropFilter: "blur(12px)",
							WebkitBackdropFilter: "blur(12px)",
							borderColor: "var(--border)",
						}}
						onSubmit={(e) => {
							e.preventDefault();
							sendMessage(barInput);
							setBarInput("");
						}}
					>
						<input
							value={barInput}
							onChange={(e) => setBarInput(e.target.value)}
							placeholder={`Ask about this ${report.type} analysis…`}
							autoComplete="off"
							className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
						/>
						<button
							type="submit"
							disabled={!barInput.trim()}
							className="flex size-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
							style={{
								background: "var(--muted-foreground)",
								color: "#ffffff",
							}}
						>
							<svg
								aria-label="Send"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<line x1="5" y1="12" x2="19" y2="12" />
								<polyline points="12 5 19 12 12 19" />
							</svg>
						</button>
					</form>
				</div>
			)}

			{/* ── Right chat panel ── */}
			{isOpen && (
				<div
					className="fixed right-0 z-50 flex flex-col"
					style={{
						top: "56px",
						bottom: 0,
						width: "50%",
						background: "var(--card)",
						borderLeft: "1px solid var(--border)",
					}}
				>
					{/* Panel header */}
					<div
						className="flex shrink-0 items-center justify-between px-4 py-3"
						style={{
							background:
								"linear-gradient(135deg, rgba(129,140,248,0.1), rgba(56,189,248,0.06))",
							borderBottom: "1px solid var(--border)",
						}}
					>
						<div className="flex items-center gap-2">
							<div
								className={cn(
									"size-2 rounded-full",
									isLoading ? "animate-pulse" : "",
								)}
								style={{
									background: isLoading
										? "var(--threat-suspicious)"
										: "var(--threat-clean)",
								}}
							/>
							<span className="font-semibold text-foreground text-sm tracking-wide">
								Analysis Assistant
							</span>
						</div>
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
							aria-label="Close chat"
						>
							<X className="size-3.5" />
						</button>
					</div>

					{/* Messages */}
					<div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
						{messages.length === 0 && (
							<div className="space-y-3">
								<p className="text-muted-foreground text-sm leading-relaxed">
									Ask questions about this {report.type} analysis.
								</p>
								<div className="flex flex-wrap gap-1.5">
									{SUGGESTIONS.map((s) => (
										<button
											key={s}
											type="button"
											onClick={() => sendMessage(s)}
											className="rounded-full border px-2.5 py-1.5 text-xs transition-colors hover:text-foreground"
											style={{
												background: "var(--secondary)",
												borderColor: "var(--border)",
												color: "var(--muted-foreground)",
											}}
										>
											{s}
										</button>
									))}
								</div>
							</div>
						)}

						{messages.map((m) => (
							<div key={m.id}>
								{m.role === "user" ? (
									/* User: dark rounded bubble */
									<div className="flex justify-end">
										<div
											className="max-w-[78%] px-4 py-2.5 text-foreground text-sm leading-relaxed"
											style={{
												background: "var(--secondary)",
												borderRadius: "18px 18px 4px 18px",
											}}
										>
											{m.content}
										</div>
									</div>
								) : (
									/* Assistant: clean text, no bubble, no icon */
									<div className="text-foreground text-sm leading-relaxed">
										<div className="prose prose-sm max-w-none [&_code]:text-xs [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p]:my-1.5">
											<ReactMarkdown remarkPlugins={[remarkGfm]}>
												{m.content}
											</ReactMarkdown>
										</div>
									</div>
								)}
							</div>
						))}

						{isLoading && (
							<div className="space-y-2 py-1">
								<div className="skeleton h-3 w-4/5 rounded" />
								<div className="skeleton h-3 w-3/5 rounded" />
								<div className="skeleton h-3 w-2/3 rounded" />
							</div>
						)}
						<div ref={bottomRef} />
					</div>

					{/* Panel input */}
					<form
						className="flex shrink-0 items-center gap-2 px-4 py-3"
						style={{
							borderTop: "1px solid var(--border)",
							background: "var(--background)",
						}}
						onSubmit={(e) => {
							e.preventDefault();
							if (!input.trim() || isLoading) return;
							handleSubmit(e);
						}}
					>
						<input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Ask a question…"
							disabled={isLoading}
							autoComplete="off"
							className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
						/>
						<button
							type="submit"
							disabled={isLoading || !input.trim()}
							className="flex size-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
							style={{
								background: "var(--muted-foreground)",
								color: "#ffffff",
							}}
						>
							{isLoading ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								<svg
									aria-label="Send"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<line x1="5" y1="12" x2="19" y2="12" />
									<polyline points="12 5 19 12 12 19" />
								</svg>
							)}
						</button>
					</form>
				</div>
			)}
		</>
	);
}
