"use client";

import * as React from "react";

export type SuggestionItem = {
  title: string;
  subtitle?: string;
  prompt: string;
  icon?: React.ReactNode;
};

export const defaultSuggestions: SuggestionItem[] = [
  {
    title: "Synthesize Exam Pillars",
    subtitle: "Distill high-yield mechanisms into non-negotiable points",
    prompt: "Synthesize the core non-negotiable exam pillars from my uploaded syllabus.",
  },
  {
    title: "Active Recall Challenge",
    subtitle: "Generate 5 tricky diagnostic questions with critique",
    prompt: "Generate 5 active recall multiple choice questions on difficult concepts.",
  },
  {
    title: "Clarify Key Nuance",
    subtitle: "Identify traps where students frequently lose marks",
    prompt: "What is the single biggest trap or misconception students fall into on this topic?",
  },
  {
    title: "Concept Mapping",
    subtitle: "Show connections between cellular pathways & regulation",
    prompt: "Trace the flow of energy and electrons step-by-step through the mitochondrial membrane.",
  },
];

export interface ChatEmptyStateProps {
  title?: string;
  description?: string;
  suggestions?: SuggestionItem[];
  onSelectSuggestion?: (prompt: string) => void;
  className?: string;
}

export function ChatEmptyState({
  title = "What are we working on today?",
  description = "Ask questions about your uploaded syllabus, explore tricky exam traps, or drill your active recall.",
  suggestions = defaultSuggestions,
  onSelectSuggestion,
  className = "",
}: ChatEmptyStateProps) {
  return (
    <div className={`flex w-full flex-col items-center justify-center text-center px-4 py-8 select-none ${className}`}>
      {/* Subtle Crest / Vector Emblem */}
      <div className="w-12 h-12 mb-4 rounded-2xl bg-[#E4F1FF] border border-[#C5DFFF] flex items-center justify-center text-[#0F3470] shadow-2xs">
        <svg viewBox="0 0 100 100" className="w-7 h-7">
          <circle cx="38" cy="50" r="23" fill="none" stroke="#0F3470" strokeWidth="5" strokeOpacity="0.95" />
          <circle cx="62" cy="50" r="23" fill="none" stroke="#DC2626" strokeWidth="5" strokeOpacity="0.8" />
          <circle cx="50" cy="50" r="14" fill="none" stroke="#64748B" strokeWidth="2.5" strokeDasharray="3 3" />
          <line x1="20" y1="80" x2="80" y2="20" stroke="#0F3470" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="50" cy="50" r="6" fill="#0F3470" />
        </svg>
      </div>

      <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#0F3470] font-sans">
        {title}
      </h2>
      <p className="mt-2 text-xs sm:text-sm text-[#64748B] max-w-md mx-auto leading-relaxed font-sans">
        {description}
      </p>

      {/* Suggestion Starter Cards */}
      {suggestions.length > 0 && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl text-left">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectSuggestion?.(item.prompt)}
              className="group p-3 sm:p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#0F3470]/40 bg-white hover:bg-[#E4F1FF]/40 text-left transition-all shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-[#0F3470] group-hover:text-[#0F3470] flex items-center gap-1.5 font-sans">
                  {item.title}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#0F3470] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              {item.subtitle && (
                <p className="mt-1 text-[11px] text-[#64748B] leading-normal font-sans">
                  {item.subtitle}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
