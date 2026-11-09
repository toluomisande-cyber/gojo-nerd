"use client";

import * as React from "react";
import { PromptInput, type PromptMessage, type PromptAttachment } from "./prompt-input";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  status?: "thinking" | "streaming" | "done" | "stopped" | "error";
  error?: string;
  attachments?: PromptAttachment[];
  createdAt?: number;
  feedback?: "up" | "down" | null;
};

export interface ChatConversationProps {
  messages: ChatMessage[];
  onSubmit: (message: PromptMessage, options: { signal: AbortSignal }) => Promise<void> | void;
  onStop?: () => void;
  onFeedback?: (id: string, value: "up" | "down" | null) => void;
  empty?: React.ReactNode;
  centered?: boolean;
  className?: string;
  placeholder?: string;
}

export function ChatConversation({
  messages,
  onSubmit,
  onStop,
  onFeedback,
  empty,
  centered = false,
  className = "",
  placeholder = "Ask anything about your syllabus, slides, or request a drill...",
}: ChatConversationProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const isGenerating = messages.some(
    (m) => m.role === "assistant" && (m.status === "thinking" || m.status === "streaming")
  );

  // Auto-scroll to bottom on new messages or streaming
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (message: PromptMessage) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    onSubmit(message, { signal: controller.signal });
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    onStop?.();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const isEmpty = messages.length === 0;

  return (
    <div
      className={`relative flex flex-col w-full bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden font-sans text-[#0F3470] shadow-sm ${className}`}
    >
      {/* 1. EMPTY STATE VIEW (Centered Layout) */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center">
            {empty}
            <div className="w-full mt-6">
              <PromptInput
                placeholder={placeholder}
                onSubmit={handleSubmit}
                isGenerating={isGenerating}
                onStop={handleStop}
              />
            </div>
          </div>
        </div>
      ) : (
        /* 2. ACTIVE CONVERSATION THREAD */
        <>
          {/* Scrollable Messages Feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map((message) => {
              const isUser = message.role === "user";

              if (isUser) {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-[#0F3470] text-white p-3.5 sm:p-4 shadow-sm">
                      {/* User Attachments if any */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2.5 pb-2 border-b border-white/15">
                          {message.attachments.map((att) => (
                            <span
                              key={att.id}
                              className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="truncate max-w-[120px]">{att.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans font-normal">
                        {message.content}
                      </p>
                    </div>
                  </div>
                );
              }

              // Assistant Message
              return (
                <div key={message.id} className="flex gap-3 sm:gap-4 max-w-full">
                  {/* Assistant Avatar */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E4F1FF] border border-[#C5DFFF] text-[#0F3470] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <svg viewBox="0 0 100 100" className="w-4 h-4 sm:w-4.5 sm:h-4.5">
                      <circle cx="38" cy="50" r="23" fill="none" stroke="#0F3470" strokeWidth="6" strokeOpacity="0.95" />
                      <circle cx="62" cy="50" r="23" fill="none" stroke="#DC2626" strokeWidth="6" strokeOpacity="0.8" />
                      <circle cx="50" cy="50" r="14" fill="none" stroke="#64748B" strokeWidth="3" strokeDasharray="3 3" />
                      <line x1="20" y1="80" x2="80" y2="20" stroke="#0F3470" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Assistant Content Box */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#0F3470]">Gojo Sensei</span>
                      {message.model && (
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-[#64748B] border border-[#E2E8F0]">
                          {message.model}
                        </span>
                      )}
                    </div>

                    {/* Thinking Skeleton */}
                    {message.status === "thinking" && (
                      <div className="space-y-2 py-1">
                        <div className="h-3 w-[88%] rounded-full bg-[#E4F1FF] animate-pulse" />
                        <div className="h-3 w-[65%] rounded-full bg-[#E4F1FF]/70 animate-pulse" />
                        <div className="h-3 w-[45%] rounded-full bg-[#E4F1FF]/40 animate-pulse" />
                      </div>
                    )}

                    {/* Error State */}
                    {message.status === "error" && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
                        {message.error || "The answer could not load. Please try again."}
                      </div>
                    )}

                    {/* Message Body */}
                    {message.content && (
                      <div className="text-xs sm:text-sm text-[#1E293B] leading-relaxed whitespace-pre-wrap font-sans">
                        {message.content}
                        {message.status === "streaming" && (
                          <span className="inline-block w-1.5 h-3.5 bg-[#0F3470] ml-1 animate-pulse align-middle" />
                        )}
                      </div>
                    )}

                    {/* Action Bar (Copy, Feedback, Stopped label) */}
                    {(message.status === "done" || message.status === "stopped") && (
                      <div className="flex items-center gap-2 pt-1 text-[#64748B] text-[11px] select-none">
                        {message.status === "stopped" && (
                          <span className="font-mono text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Stopped
                          </span>
                        )}

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(message.id, message.content)}
                          className="flex items-center gap-1 hover:text-[#0F3470] transition-colors font-mono"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>{copiedId === message.id ? "Copied" : "Copy"}</span>
                        </button>

                        {/* Thumbs Up */}
                        <button
                          type="button"
                          onClick={() => onFeedback?.(message.id, message.feedback === "up" ? null : "up")}
                          className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                            message.feedback === "up" ? "text-emerald-600 font-bold" : "hover:text-[#0F3470]"
                          }`}
                          title="Helpful"
                        >
                          <svg className="w-3 h-3" fill={message.feedback === "up" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                        </button>

                        {/* Thumbs Down */}
                        <button
                          type="button"
                          onClick={() => onFeedback?.(message.id, message.feedback === "down" ? null : "down")}
                          className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                            message.feedback === "down" ? "text-rose-600 font-bold" : "hover:text-[#0F3470]"
                          }`}
                          title="Not helpful"
                        >
                          <svg className="w-3 h-3" fill={message.feedback === "down" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fixed Bottom Composer in Thread View */}
          <div className="p-3 sm:p-4 border-t border-[#E2E8F0] bg-white shrink-0">
            <div className="max-w-3xl mx-auto">
              <PromptInput
                placeholder={placeholder}
                onSubmit={handleSubmit}
                isGenerating={isGenerating}
                onStop={handleStop}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
