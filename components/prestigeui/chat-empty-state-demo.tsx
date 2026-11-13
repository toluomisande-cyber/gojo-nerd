"use client";

import * as React from "react";
import { ChatConversation, type ChatMessage } from "@/components/prestigeui/chat-conversation";
import { ChatEmptyState } from "@/components/prestigeui/chat-empty-state";
import type { PromptMessage } from "@/components/prestigeui/prompt-input";

const REPLY = `This is the preview, so the answer is canned. In your app, \`onSubmit\` sends the message to your model and streams its answer into the thread.

The composer started in the middle of the empty chat and moved down when you sent your first message. Press replay above the preview to see the empty state again.`;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

export function ChatEmptyStateDemo() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const active = React.useRef<AbortController | null>(null);

  const patch = (id: string, next: Partial<ChatMessage>) =>
    setMessages((list) => list.map((message) => (message.id === id ? { ...message, ...next } : message)));

  const onSubmit = async (message: PromptMessage, { signal }: { signal: AbortSignal }) => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    signal.addEventListener("abort", () => controller.abort());

    const stamp = Date.now();
    const answerId = `a${stamp}`;
    setMessages((list) => [
      ...list,
      { id: `u${stamp}`, role: "user", content: message.text, attachments: message.attachments, createdAt: stamp },
      { id: answerId, role: "assistant", model: message.model, content: "", status: "thinking", createdAt: stamp },
    ]);

    // The preview streams a canned reply. In your app, read your model's stream here:
    //   const response = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ text: message.text }), signal: controller.signal })
    //   if (!response.ok || !response.body) throw new Error(`Chat failed: ${response.status}`)
    try {
      // Let the composer finish its move before the answer starts.
      await wait(900, controller.signal);
      let shown = "";
      for (const word of REPLY.split(/(?<=\s)/)) {
        shown += word;
        patch(answerId, { content: shown, status: "streaming" });
        await wait(16 + word.length * 6 + (/[.,:]\s*$/.test(word) ? 100 : 0), controller.signal);
      }
      patch(answerId, { status: "done" });
    } catch {
      patch(answerId, controller.signal.aborted ? { status: "stopped" } : { status: "error", error: "The answer couldn't load." });
    }
  };

  return (
    <ChatConversation
      centered
      className="h-[min(720px,100dvh)]"
      messages={messages}
      onSubmit={onSubmit}
      onStop={() => active.current?.abort()}
      onFeedback={(id, value) => patch(id, { feedback: value })}
      empty={<ChatEmptyState />}
    />
  );
}

