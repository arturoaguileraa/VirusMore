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
				<Button
					onClick={() => setIsOpen(true)}
					className="fixed right-6 bottom-6 z-50 h-10 gap-2 rounded-full px-5 shadow-lg"
				>
					<MessageSquare className="size-4" />
					Ask AI
				</Button>
			)}

			{/* Panel */}
			{isOpen && (
				<div
					className={cn(
						"fixed right-6 bottom-6 z-50 flex flex-col",
						"h-[min(560px,calc(100vh-5rem))] w-[min(420px,calc(100vw-2rem))]",
						"overflow-hidden rounded-xl border border-border bg-card shadow-2xl",
					)}
				>
					{/* Header */}
					<div className="flex shrink-0 items-center justify-between border-border border-b bg-secondary/50 px-4 py-3">
						<div className="flex items-center gap-2">
							<div
								className={cn(
									"size-1.5 rounded-full",
									isLoading
										? "animate-pulse bg-[--threat-suspicious]"
										: "bg-[--threat-clean]",
								)}
							/>
							<span className="font-semibold text-foreground text-sm">
								Analysis Assistant
							</span>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="size-7 text-muted-foreground"
							onClick={() => setIsOpen(false)}
							aria-label="Close chat"
						>
							<X className="size-3.5" />
						</Button>
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
											className="rounded-full border border-border bg-secondary px-2.5 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
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
										className={cn(
											"mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
											m.role === "user"
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-secondary text-muted-foreground",
										)}
									>
										{m.role === "user" ? (
											<User className="size-3" />
										) : (
											<Bot className="size-3" />
										)}
									</div>

									<div
										className={cn(
											"max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
											m.role === "user"
												? "rounded-tr-sm bg-primary text-primary-foreground"
												: "rounded-tl-sm border border-border bg-secondary text-foreground",
										)}
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
									<div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-secondary">
										<Bot className="size-3 text-muted-foreground" />
									</div>
									<div className="rounded-xl rounded-tl-sm border border-border bg-secondary px-3.5 py-2.5">
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
						className="flex shrink-0 gap-2 border-border border-t bg-secondary/30 p-3"
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
