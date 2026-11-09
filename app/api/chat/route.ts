import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

async function executeWithModelFallback(config: any, operation: (model: any) => Promise<any>) {
  let lastError: any = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ ...config, model: modelName });
      return await operation(model);
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${modelName} failed (${err.message?.slice(0, 70)}). Trying next candidate...`);
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const { message, documentContext, history, userMemory } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    let autoSavedMemory = null;
    const memMatch = String(message)
      .trim()
      .match(
        /^(?:please\s+)?(?:remember(?:\s+that)?|save(?:\s+to\s+memory)?|store(?:\s+in\s+memory)?|note\s+that|keep\s+in\s+mind(?:\s+that)?|my\s+exam\s+is|i\s+struggle\s+with)\s*[:,-]?\s*(.+)$/i
      );
    if (memMatch && memMatch[1] && memMatch[1].trim().length > 3) {
      const lowerMsg = String(message).toLowerCase();
      const isExam = /exam|midterm|final|quiz|test|date/i.test(lowerMsg);
      const isWeak = /struggle|confus|hard|weak|miss/i.test(lowerMsg);
      autoSavedMemory = {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        category: isExam ? "exam_focus" : isWeak ? "weak_spot" : "note",
        content: String(message).trim(),
        source: "Document assistant",
        createdAt: new Date().toISOString(),
      };
    }

    const memoryContextLines: string[] = [];
    if (userMemory && typeof userMemory === "object") {
      if (userMemory.name || userMemory.major) {
        memoryContextLines.push(`Student: ${userMemory.name || "Student"} (${userMemory.major || "General studies"})`);
      }
      if (Array.isArray(userMemory.memories) && userMemory.memories.length > 0) {
        const formatted = userMemory.memories
          .slice(0, 25)
          .map((m: any) => `- [${m.category || "note"}] ${m.content} (${m.source || "Saved"})`)
          .join("\n");
        memoryContextLines.push(`Stored User Memories & Weak Spots:\n${formatted}`);
      }
    }
    const memoryBlock =
      memoryContextLines.length > 0
        ? `\n\nINTEGRATED STUDENT MEMORY (Use this to personalize explanations and connect to the student's stored notes, exam focus, and past weak spots):\n"""\n${memoryContextLines.join("\n\n")}\n"""`
        : "";

    const reply = await executeWithModelFallback({
      temperature: 0.4,
      systemInstruction: `You are Gojo Sensei from Gojo.nerd. You are an effortlessly brilliant academic mentor who speaks with supreme confidence, wit, and total clarity, equipped with integrated personal memory for the current student.

STRICT CONSTRAINTS:
1. Base all answers strictly on the provided DOCUMENT CONTEXT and INTEGRATED STUDENT MEMORY below.
2. If the student asks about their stored memories, weak spots, or notes, reference their INTEGRATED STUDENT MEMORY directly.
3. If the student tells you to remember a preference, exam date, or note, confirm that you have stored it in their personal memory ledger.
4. Ban corporate filler ("Certainly!", "I'd be glad to help!"). Jump straight into the explanation.
5. Keep responses concise (2 to 4 punchy paragraphs max).

DOCUMENT CONTEXT:
"""
${(documentContext || "").slice(0, 50000)}
"""${memoryBlock}`,
    }, async (model) => {
      const chat = model.startChat({
        history: (history || []).map((h: { role: string; content: string }) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        })),
      });

      const result = await chat.sendMessage(message);
      return result.response.text();
    });

    return NextResponse.json({ reply, autoSavedMemory });
  } catch (err: any) {
    console.error("Sensei Chat API Error:", err);
    return NextResponse.json({ error: err.message || "Failed to contact Sensei." }, { status: 500 });
  }
}

