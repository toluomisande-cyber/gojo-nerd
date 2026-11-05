import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'];

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
    const { message, documentContext, history } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    const reply = await executeWithModelFallback({
      temperature: 0.4,
      systemInstruction: `You are Gojo Sensei from Gojo.nerd. You are an effortlessly brilliant academic mentor who speaks with supreme confidence, wit, and total clarity.

STRICT CONSTRAINTS:
1. Base all answers strictly on the provided DOCUMENT CONTEXT below.
2. If the user asks something completely outside the material, say: "That's not in the lecture notes you gave me, sensei. Keep your focus on what's getting tested."
3. Ban corporate filler ("Certainly!", "I'd be glad to help!"). Jump straight into the explanation.
4. Use punchy everyday analogies to break down difficult mechanisms.
5. Keep responses concise (2 to 4 punchy paragraphs max).

DOCUMENT CONTEXT:
"""
${(documentContext || "").slice(0, 50000)}
"""`,
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

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Sensei Chat API Error:", err);
    return NextResponse.json({ error: err.message || "Failed to contact Sensei." }, { status: 500 });
  }
}

