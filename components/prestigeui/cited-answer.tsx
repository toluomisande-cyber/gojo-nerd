"use client";

import * as React from "react";

export type AnswerSource = {
  kind?: "doc" | "file" | "chat" | "ticket" | "email" | "slide" | string;
  site?: string;
  title: string;
  label?: string;
  meta?: string;
  snippet?: string;
  url?: string;
};

export type CitedAnswerStatus = "searching" | "reading" | "streaming" | "done";

export interface CitedAnswerProps {
  question: string;
  statusText?: string;
  status: CitedAnswerStatus;
  sources: AnswerSource[];
  content: string;
  duration?: number;
  feedback?: "up" | "down" | null;
  onFeedback?: (feedback: "up" | "down" | null) => void;
  onRetry?: () => void;
  className?: string;
}

// --- SELF-CONTAINED SVG ICONS (Zero external package dependencies) ---
function SourceIcon({ kind, className = "w-3.5 h-3.5" }: { kind?: string; className?: string }) {
  switch (kind) {
    case "file":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case "chat":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "ticket":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      );
    case "email":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "slide":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "doc":
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
}

export function CitedAnswer({
  question,
  statusText = "Searching sources",
  status,
  sources = [],
  content = "",
  duration,
  feedback = null,
  onFeedback,
  onRetry,
  className = "",
}: CitedAnswerProps) {
  const [activeSourceIndex, setActiveSourceIndex] = React.useState<number | null>(null);
  const [copied, setCopied] = React.useState(false);
  const sourcesContainerRef = React.useRef<HTMLDivElement>(null);

  const isComplete = status === "done";
  const isStreaming = status === "streaming";
  const isReading = status === "reading";
  const isSearching = status === "searching";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCitationClick = (citationNumber: number) => {
    const sourceIdx = citationNumber - 1;
    if (sourceIdx >= 0 && sourceIdx < sources.length) {
      setActiveSourceIndex((prev) => (prev === sourceIdx ? null : sourceIdx));
      // Scroll the source card into view
      const cardEl = sourcesContainerRef.current?.children[sourceIdx] as HTMLElement;
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  };

  // Render markdown-like text with clickable [1], [2] badges
  const renderFormattedContent = (rawText: string) => {
    if (!rawText) return null;

    // Split text by lines
    const paragraphs = rawText.split(/\n\n+/);

    return paragraphs.map((para, pIdx) => {
      // Bullet list item
      if (para.startsWith("- ") || para.startsWith("* ")) {
        const items = para.split(/\n(?=[-•*]\s)/);
        return (
          <ul key={pIdx} className="space-y-2 my-2.5 pl-1">
            {items.map((item, iIdx) => {
              const cleanItem = item.replace(/^[-•*]\s+/, "");
              return (
                <li key={iIdx} className="flex items-start gap-2 text-sm leading-relaxed text-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                  <span>{renderInlineCitations(cleanItem)}</span>
                </li>
              );
            })}
          </ul>
        );
      }

      return (
        <p key={pIdx} className="text-sm leading-relaxed text-slate-800 mb-3 last:mb-0">
          {renderInlineCitations(para)}
        </p>
      );
    });
  };

  // Helper to parse bold (**bold**) and inline citation tags ([1], [2])
  const renderInlineCitations = (text: string) => {
    // Regex matching [N] or **bold**
    const parts = text.split(/(\[\d+\]|\*\*.*?\*\*)/g);

    return parts.map((part, idx) => {
      // Citation match: [1], [2], etc.
      const citeMatch = part.match(/^\[(\d+)\]$/);
      if (citeMatch) {
        const citeNum = parseInt(citeMatch[1], 10);
        const isTargetActive = activeSourceIndex === citeNum - 1;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleCitationClick(citeNum)}
            title={`View source ${citeNum}: ${sources[citeNum - 1]?.title || "Reference"}`}
            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 mx-0.5 rounded-full text-[10px] font-mono font-bold transition-all align-baseline cursor-pointer select-none ${
              isTargetActive
                ? "bg-[#0F3470] text-white ring-2 ring-[#0F3470]/30 scale-105"
                : "bg-slate-100 text-slate-700 hover:bg-[#E4F1FF] hover:text-[#0F3470] border border-slate-200"
            }`}
          >
            {citeNum}
          </button>
        );
      }

      // Bold match: **text**
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }

      return part;
    });
  };

  return (
    <div className={`w-full bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden font-sans ${className}`}>
      {/* 1. QUESTION HEADER */}
      <div className="p-5 sm:p-6 border-b border-[#E2E8F0] bg-slate-50/50">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
              Inquiry / Search Query
            </span>
            <h2 className="text-base sm:text-lg font-serif font-bold text-slate-900 tracking-tight leading-snug">
              {question}
            </h2>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 flex items-center gap-1.5 text-xs font-mono">
            {isSearching && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                {statusText}
              </span>
            )}
            {isReading && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
                <svg className="w-3.5 h-3.5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Reading {sources.length} sources...
              </span>
            )}
            {isStreaming && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                Synthesizing answer...
              </span>
            )}
            {isComplete && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Verified Answer
              </span>
            )}
          </div>
        </div>

        {/* 2. SOURCES TRAY */}
        {sources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200/60">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Sources &amp; Citations ({sources.length})
              </span>
              <span className="text-[10px] text-slate-400">Click a card to preview excerpt</span>
            </div>

            <div
              ref={sourcesContainerRef}
              className="flex items-stretch gap-2.5 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
            >
              {sources.map((source, idx) => {
                const isSelected = activeSourceIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSourceIndex((prev) => (prev === idx ? null : idx))}
                    className={`shrink-0 w-52 text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#E4F1FF]/80 border-[#0F3470] shadow-sm ring-2 ring-[#0F3470]/15"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400 mb-1">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600 truncate">
                          <SourceIcon kind={source.kind} className="w-3 h-3 text-[#0F3470] shrink-0" />
                          <span className="truncate">{source.site || source.kind || "Source"}</span>
                        </span>
                        <span className="font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                          [{idx + 1}]
                        </span>
                      </div>
                      <div className="font-serif font-semibold text-xs text-slate-900 line-clamp-1">
                        {source.title}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
                      <span className="truncate">{source.meta || source.label || "Document"}</span>
                      {source.snippet && <span className="text-[#0F3470] font-semibold text-[9px]">Preview &rarr;</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Source Excerpt Callout */}
            {activeSourceIndex !== null && sources[activeSourceIndex] && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs leading-relaxed text-slate-700 animate-fadeIn">
                <div className="flex items-center justify-between font-mono text-[10px] font-semibold text-slate-500 mb-1.5">
                  <span className="text-[#0F3470] flex items-center gap-1">
                    <SourceIcon kind={sources[activeSourceIndex].kind} className="w-3 h-3 text-[#0F3470]" />
                    <span>Citation [{activeSourceIndex + 1}]: {sources[activeSourceIndex].title}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSourceIndex(null)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                  >
                    &times;
                  </button>
                </div>
                <p className="font-serif italic text-slate-800">
                  &ldquo;{sources[activeSourceIndex].snippet || "Source excerpt available in original document."}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. ANSWER BODY */}
      <div className="p-5 sm:p-6 min-h-[160px]">
        {/* Skeleton loading animation while searching/reading without content */}
        {!content && (isSearching || isReading) && (
          <div className="space-y-3 py-2 animate-pulse">
            <div className="h-3 bg-slate-200 rounded-full w-3/4" />
            <div className="h-3 bg-slate-200 rounded-full w-full" />
            <div className="h-3 bg-slate-200 rounded-full w-5/6" />
            <div className="h-3 bg-slate-200 rounded-full w-2/3" />
          </div>
        )}

        {/* Formatted Cited Content */}
        {content && <div className="prose prose-slate max-w-none">{renderFormattedContent(content)}</div>}
      </div>

      {/* 4. FOOTER CONTROLS */}
      <div className="px-5 py-3.5 border-t border-[#E2E8F0] bg-slate-50/70 flex items-center justify-between text-xs">
        {/* Left: Duration & Model */}
        <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
          {duration !== undefined && (
            <span>
              Synthesized in <strong className="text-slate-700">{(duration / 1000).toFixed(1)}s</strong>
            </span>
          )}
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline text-slate-500">Gemini 2.5 Flash Grounded</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Copy Answer */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!content}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 transition-colors flex items-center gap-1 text-[11px] font-mono disabled:opacity-40"
            title="Copy answer"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-emerald-700 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Feedback: Thumbs Up */}
          <button
            type="button"
            onClick={() => onFeedback?.(feedback === "up" ? null : "up")}
            className={`p-1.5 rounded-lg border transition-colors ${
              feedback === "up"
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "border-slate-200 hover:bg-white text-slate-600"
            }`}
            title="Accurate answer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
          </button>

          {/* Feedback: Thumbs Down */}
          <button
            type="button"
            onClick={() => onFeedback?.(feedback === "down" ? null : "down")}
            className={`p-1.5 rounded-lg border transition-colors ${
              feedback === "down"
                ? "bg-red-50 border-red-300 text-red-700"
                : "border-slate-200 hover:bg-white text-slate-600"
            }`}
            title="Inaccurate answer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76 1.04m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
          </button>

          {/* Retry Button */}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-white text-slate-600 transition-colors flex items-center gap-1 text-[11px] font-mono ml-1"
              title="Rerun search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CitedAnswer;
