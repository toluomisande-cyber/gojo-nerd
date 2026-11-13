"use client";

import * as React from "react";

export type PromptAttachment = {
  id: string;
  name: string;
  size?: number;
  type?: string;
  url?: string;
};

export type PromptMessage = {
  text: string;
  model?: string;
  tools: string[];
  attachments: PromptAttachment[];
};

export type ModelOption = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export type ToolOption = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

function SparkleIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z"
      />
    </svg>
  );
}

function SearchIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CodeIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

export const defaultModels: ModelOption[] = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", description: "Fast, multimodal & low latency", icon: SparkleIcon },
  { id: "gpt-4o", label: "GPT-4o", description: "High-intelligence flagship model", icon: SparkleIcon },
  { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", description: "Deep reasoning & analysis", icon: SparkleIcon },
  { id: "deepseek-r1", label: "DeepSeek R1", description: "Academic reasoning & mathematics", icon: SparkleIcon },
];

export const defaultTools: ToolOption[] = [
  { id: "search", label: "Web Search", icon: SearchIcon },
  { id: "code", label: "Code Execution", icon: CodeIcon },
  { id: "citations", label: "Citations", icon: SparkleIcon },
];

export interface PromptInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (message: PromptMessage) => void;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isGenerating?: boolean;
  models?: ModelOption[];
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
  tools?: ToolOption[];
  selectedTools?: string[];
  onToggleTool?: (toolId: string) => void;
  attachments?: PromptAttachment[];
  onAddAttachment?: (file: File) => void;
  onRemoveAttachment?: (id: string) => void;
  className?: string;
}

export function PromptInput({
  value,
  defaultValue = "",
  onChange,
  onSubmit,
  onStop,
  placeholder = "Ask anything about your syllabus, slides, or request a drill...",
  disabled = false,
  isGenerating = false,
  models = defaultModels,
  selectedModel,
  onSelectModel,
  tools = defaultTools,
  selectedTools,
  onToggleTool,
  attachments: controlledAttachments,
  onAddAttachment,
  onRemoveAttachment,
  className = "",
}: PromptInputProps) {
  const [internalText, setInternalText] = React.useState(defaultValue);
  const [internalModel, setInternalModel] = React.useState(models[0]?.id || "gemini-2.0-flash");
  const [internalTools, setInternalTools] = React.useState<string[]>([]);
  const [internalAttachments, setInternalAttachments] = React.useState<PromptAttachment[]>([]);
  const [isModelPickerOpen, setIsModelPickerOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const currentText = value !== undefined ? value : internalText;
  const currentModelId = selectedModel !== undefined ? selectedModel : internalModel;
  const currentTools = selectedTools !== undefined ? selectedTools : internalTools;
  const currentAttachments = controlledAttachments !== undefined ? controlledAttachments : internalAttachments;

  const currentModel = models.find((m) => m.id === currentModelId) || models[0];

  const setText = (next: string) => {
    if (value === undefined) setInternalText(next);
    onChange?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isGenerating) {
      onStop?.();
      return;
    }
    const clean = currentText.trim();
    if (!clean && currentAttachments.length === 0) return;
    if (onSubmit) {
      onSubmit({
        text: clean,
        model: currentModelId,
        tools: currentTools,
        attachments: currentAttachments,
      });
    }
    setText("");
    if (controlledAttachments === undefined) {
      setInternalAttachments([]);
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 180)}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (onAddAttachment) {
        onAddAttachment(file);
      } else {
        const item: PromptAttachment = {
          id: `file_${Date.now()}_${i}`,
          name: file.name,
          size: file.size,
          type: file.type,
        };
        setInternalAttachments((prev) => [...prev, item]);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    if (onRemoveAttachment) {
      onRemoveAttachment(id);
    } else {
      setInternalAttachments((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const toggleTool = (id: string) => {
    if (onToggleTool) {
      onToggleTool(id);
    } else {
      setInternalTools((prev) =>
        prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
      );
    }
  };

  const selectModel = (id: string) => {
    if (onSelectModel) {
      onSelectModel(id);
    } else {
      setInternalModel(id);
    }
    setIsModelPickerOpen(false);
  };

  return (
    <div
      className={`relative w-full rounded-2xl border border-[#CBD5E1] bg-white shadow-sm transition-all focus-within:border-[#0F3470] focus-within:ring-2 focus-within:ring-[#0F3470]/15 ${className}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
      />

      {/* Attachment Pills */}
      {currentAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
          {currentAttachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#E4F1FF] border border-[#C5DFFF] text-[11px] font-mono text-[#0F3470]"
            >
              <svg className="w-3 h-3 text-[#0F3470]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              <span className="truncate max-w-[140px] font-medium">{att.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="hover:text-red-600 transition-colors ml-0.5"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={currentText}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full resize-none border-0 bg-transparent px-3.5 py-3 text-sm text-[#0F3470] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0 leading-relaxed font-sans"
        style={{ minHeight: "44px", maxHeight: "180px" }}
      />

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1 border-t border-[#F1F5F9] select-none text-xs">
        {/* Left: Model selector & tools */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Model Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E2E8F0] hover:border-[#0F3470]/40 bg-white hover:bg-slate-50 text-[11px] font-mono font-medium text-[#0F3470] transition-colors"
            >
              {currentModel?.icon ? (
                React.createElement(currentModel.icon, { className: "w-3 h-3 text-[#0F3470]" })
              ) : (
                <SparkleIcon className="w-3 h-3 text-[#0F3470]" />
              )}
              <span className="truncate max-w-[110px]">{currentModel?.label || "Model"}</span>
              <svg className="w-2.5 h-2.5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isModelPickerOpen && (
              <div
                className="absolute bottom-full left-0 mb-1.5 w-60 rounded-xl border border-[#CBD5E1] bg-white p-1.5 shadow-xl z-50 text-xs font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#64748B] font-semibold border-b border-[#F1F5F9]">
                  Select AI Reasoning Engine
                </div>
                <div className="space-y-0.5 mt-1">
                  {models.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectModel(m.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        m.id === currentModelId
                          ? "bg-[#E4F1FF] text-[#0F3470] font-semibold"
                          : "text-[#334155] hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{m.label}</div>
                        {m.description && <div className="text-[10px] text-[#64748B] font-normal">{m.description}</div>}
                      </div>
                      {m.id === currentModelId && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0F3470] shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attachment Paperclip */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach slides or documents"
            className="p-1 rounded-lg border border-transparent hover:border-[#E2E8F0] text-[#64748B] hover:text-[#0F3470] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          {/* Tool Toggles */}
          {tools.map((t) => {
            const isActive = currentTools.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTool(t.id)}
                className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors ${
                  isActive
                    ? "bg-[#0F3470] text-white font-semibold"
                    : "bg-slate-100 text-[#64748B] hover:bg-slate-200"
                }`}
              >
                {t.icon && React.createElement(t.icon, { className: "w-2.5 h-2.5" })}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Submit or Stop Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || (!isGenerating && !currentText.trim() && currentAttachments.length === 0)}
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
              isGenerating
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                : currentText.trim() || currentAttachments.length > 0
                ? "bg-[#0F3470] hover:bg-[#16438c] text-white shadow-sm active:scale-95"
                : "bg-slate-100 text-[#94A3B8] cursor-not-allowed"
            }`}
            title={isGenerating ? "Stop generating" : "Send message (Enter)"}
          >
            {isGenerating ? (
              <span className="w-2.5 h-2.5 bg-white rounded-xs" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

