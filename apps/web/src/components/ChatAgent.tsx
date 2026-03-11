"use client";
import { useChat } from "@ai-sdk/react";
import type { VTReport } from "@virusmore/api/types";
import { Bot, Loader2, MessageSquare, Send, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
	const sessionId = useRef(getSessionId());
	const bottomRef = useRef<HTMLDivElement>(null);

	const { messages, handleSubmit, status, input, setInput } = useChat({
		api: `${serverUrl}/api/chat`,
		body: { report, sessionId: sessionId.current },
		streamProtocol: "data",
	});

	const _messageCount = messages.length;
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const isLoading = status === "streaming" || status === "submitted";

	return (
		<>
			{/* Trigger */}
			{!isOpen && (
				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className="fixed right-6 bottom-6 z-50 flex h-10 items-center gap-2 rounded-full px-5 font-semibold text-sm shadow-lg transition-all hover:opacity-90"
					style={{
						background: "linear-gradient(135deg, #818cf8, #38bdf8)",
						color: "#09090f",
						boxShadow: "0 0 20px rgba(129,140,248,0.3)",
					}}
				>
					<MessageSquare className="size-4" />
					Ask AI
				</button>
			)}

			{/* Panel */}
			{isOpen && (
				<div
					className={cn(
						"fixed right-6 bottom-6 z-50 flex flex-col",
						"h-[min(560px,calc(100vh-5rem))] w-[min(420px,calc(100vw-2rem))]",
						"overflow-hidden rounded-2xl shadow-2xl",
					)}
					style={{
						background: "var(--card)",
						border: "1px solid var(--border)",
						boxShadow:
							"0 0 40px rgba(129,140,248,0.1), 0 20px 60px rgba(0,0,0,0.5)",
					}}
				>
					{/* Header */}
					<div
						className="flex shrink-0 items-center justify-between px-4 py-3"
						style={{
							background:
								"linear-gradient(135deg, rgba(129,140,248,0.12), rgba(56,189,248,0.08))",
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
							className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
							onClick={() => setIsOpen(false)}
							aria-label="Close chat"
						>
							<X className="size-3.5" />
						</button>
					</div>

					{/* Messages */}
					<ScrollArea className="flex-1 px-4 py-3">
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
											onClick={() => setInput(s)}
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

						<div className="mt-3 space-y-3">
							{messages.map((m) => (
								<div
									key={m.id}
									className={cn(
										"flex gap-2.5",
										m.role === "user" ? "flex-row-reverse" : "flex-row",
									)}
								>
									<div
										className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
										style={
											m.role === "user"
												? {
														background:
															"linear-gradient(135deg, #818cf8, #38bdf8)",
														color: "#09090f",
													}
												: {
														background: "var(--secondary)",
														border: "1px solid var(--border)",
														color: "var(--muted-foreground)",
													}
										}
									>
										{m.role === "user" ? (
											<User className="size-3" />
										) : (
											<Bot className="size-3" />
										)}
									</div>

									<div
										className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed"
										style={
											m.role === "user"
												? {
														background:
															"linear-gradient(135deg, #818cf8, #38bdf8)",
														color: "#09090f",
														borderRadius: "12px 4px 12px 12px",
													}
												: {
														background: "var(--secondary)",
														border: "1px solid var(--border)",
														color: "var(--foreground)",
														borderRadius: "4px 12px 12px 12px",
													}
										}
									>
										{m.role === "assistant" ? (
											<div className="prose prose-sm max-w-none [&_code]:text-xs [&_p]:my-1.5">
												<ReactMarkdown remarkPlugins={[remarkGfm]}>
													{m.content}
												</ReactMarkdown>
											</div>
										) : (
											<span>{m.content}</span>
										)}
									</div>
								</div>
							))}

							{isLoading && (
								<div className="flex gap-2.5">
									<div
										className="flex size-6 shrink-0 items-center justify-center rounded-full"
										style={{
											background: "var(--secondary)",
											border: "1px solid var(--border)",
										}}
									>
										<Bot className="size-3 text-muted-foreground" />
									</div>
									<div
										className="rounded-xl px-3.5 py-2.5"
										style={{
											background: "var(--secondary)",
											border: "1px solid var(--border)",
											borderRadius: "4px 12px 12px 12px",
										}}
									>
										<Loader2 className="size-3.5 animate-spin text-muted-foreground" />
									</div>
								</div>
							)}
							<div ref={bottomRef} />
						</div>
					</ScrollArea>

					{/* Input */}
					<form
						onSubmit={(e) => {
							e.preventDefault();
							if (!input.trim() || isLoading) return;
							handleSubmit(e);
						}}
						className="flex shrink-0 gap-2 p-3"
						style={{
							borderTop: "1px solid var(--border)",
							background: "rgba(0,0,0,0.2)",
						}}
					>
						<Input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Ask a question..."
							disabled={isLoading}
							className="bg-background text-sm"
							autoComplete="off"
						/>
						<Button
							type="submit"
							size="icon"
							disabled={isLoading || !input.trim()}
							className="shrink-0"
						>
							{isLoading ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Send className="size-4" />
							)}
						</Button>
					</form>
				</div>
			)}
		</>
	);
}
