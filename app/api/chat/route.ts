import { NextRequest, NextResponse } from "next/server";

const DAILY_FREE_LIMIT = 15;
const rateLimitStore = new Map<string, number>();

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getQuotaState(userId: string, clientUsedCount?: number, resetQuota?: boolean) {
  const day = getTodayKey();
  const key = `${userId || "guest"}:${day}`;
  if (resetQuota) {
    rateLimitStore.set(key, 0);
  }
  const serverUsed = rateLimitStore.get(key) || 0;
  const used = resetQuota
    ? 0
    : Math.max(serverUsed, typeof clientUsedCount === "number" ? clientUsedCount : 0);
  return {
    key,
    used,
    limit: DAILY_FREE_LIMIT,
    remaining: Math.max(0, DAILY_FREE_LIMIT - used),
  };
}

function buildDocumentReferenceReply(
  message: string,
  documentContext: string,
  userMemory: any,
  autoSavedMemory: any
) {
  const q = String(message || "").trim();
  const qLower = q.toLowerCase();
  const doc = String(documentContext || "").trim();
  const studentName =
    userMemory && userMemory.name && userMemory.name !== "Student"
      ? String(userMemory.name).split(" ")[0]
      : "";

  if (autoSavedMemory) {
    return `Got it${studentName ? `, ${studentName}` : ""} — I've saved that to your personal memory under **${autoSavedMemory.category.replace(
      "_",
      " "
    )}**:\n\n"${autoSavedMemory.content}"\n\nI'll keep this in mind as we go through your notes.`;
  }

  const memories =
    userMemory && Array.isArray(userMemory.memories) ? userMemory.memories : [];
  if (
    /\b(my memory|my memories|weak spot|weak spots|what did i miss|saved notes|what do you remember)\b/i.test(
      qLower
    )
  ) {
    if (memories.length === 0) {
      return `You don't have any saved notes in your memory ledger yet. Tell me "Remember that..." or tap **Save to memory** on any takeaway and I'll track it for you.`;
    }
    const summaryList = memories
      .slice(0, 5)
      .map((m: any, idx: number) => `${idx + 1}. **[${m.category || "note"}]** ${m.content}`)
      .join("\n");
    return `Here's what I currently have saved for you:\n\n${summaryList}`;
  }

  if (/^(hi|hello|hey|yo|sup|good morning|good evening)\b/i.test(qLower) && q.length < 25) {
    return `Hey${studentName ? ` ${studentName}` : ""}! Ready to go through your notes. Ask me to break down a mechanism, quiz you on a concept, or point out the main exam trap in this material.`;
  }

  const sentences = doc
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?])\n+|\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length === 0) {
    return `I couldn't find matching passages for "${q}" yet. Upload a PDF or paste your lecture notes on the left so I can read through them with you.`;
  }

  if (/\b(trap|insight|pitfall|mistake|trick|exam)\b/i.test(qLower)) {
    const trapLine =
      sentences.find((s) =>
        /\b(trap|insight|not|solely|only|however|unlike|whereas|exception)\b/i.test(s)
      ) || sentences[0];
    return `Here is the key exam trap to watch out for in your notes:\n\n**${trapLine}**\n\nMake sure you don't mix up the primary site of action with upstream steps when answering multiple-choice questions.`;
  }

  const keywords = (qLower.match(/\b[a-z0-9]{4,}\b/g) || []).filter(
    (w) =>
      ![
        "what",
        "where",
        "when",
        "which",
        "explain",
        "describe",
        "about",
        "from",
        "this",
        "that",
        "with",
        "into",
        "does",
        "mean",
        "primary",
        "compare",
      ].includes(w)
  );

  const scored = sentences.map((s) => {
    const lower = s.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 3;
    }
    return { s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored
    .filter((item) => item.score > 0)
    .slice(0, 3)
    .map((item) => item.s);

  const selected = topMatches.length > 0 ? topMatches : sentences.slice(0, 3);

  return `Based on your uploaded notes, here's how that works:\n\n${selected
    .map((line) => `• ${line}`)
    .join("\n\n")}\n\nWant me to test you on this or break it down further?`;
}

async function queryFreeLimitedModel(
  message: string,
  documentContext: string,
  userMemory: any,
  history: any[]
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const memories =
      userMemory && Array.isArray(userMemory.memories)
        ? userMemory.memories.slice(0, 8)
        : [];
    const memoryBlock =
      memories.length > 0
        ? `\nStudent saved notes:\n${memories
            .map((m: any) => `- [${m.category}] ${m.content}`)
            .join("\n")}`
        : "";

    const systemPrompt = [
      "You are a sharp, friendly study partner texting a student about their uploaded lecture notes.",
      "Keep replies concise (2 to 4 short paragraphs or bullet points), clear, and natural like a smart tutor texting back.",
      "Never mention AI providers, model names, or OpenAI/Google/Gemini.",
      "Ground your answer strictly in the provided lecture notes and student memory.",
      `Lecture notes context:\n${String(documentContext || "").slice(0, 12000)}${memoryBlock}`,
    ].join("\n\n");

    const recentHistory = Array.isArray(history)
      ? history.slice(-4).map((h: any) => ({
          role: h.role === "user" ? "user" : "assistant",
          content: String(h.content || "").slice(0, 600),
        }))
      : [];

    const openRouterKey = (process.env.OPENROUTER_API_KEY || "").trim();
    if (openRouterKey) {
      const orModel = (
        process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free"
      ).trim();
      const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://gojo-nerd.vercel.app",
          "X-Title": "Gojo Study Assistant",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: orModel,
          messages: [
            { role: "system", content: systemPrompt },
            ...recentHistory,
            { role: "user", content: String(message).slice(0, 1000) },
          ],
          temperature: 0.3,
        }),
      });
      if (orRes.ok) {
        const orData = await orRes.json();
        const orText = orData?.choices?.[0]?.message?.content;
        if (orText && typeof orText === "string" && orText.trim().length > 5) {
          return orText.trim();
        }
      }
    }

    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: systemPrompt },
          ...recentHistory,
          { role: "user", content: String(message).slice(0, 1000) },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (text && typeof text === "string" && text.trim().length > 10) {
      return text.trim();
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, documentContext, userMemory, history, usedToday, resetQuota } = body;
    const userId = (userMemory && (userMemory.id || userMemory.name)) || "guest";
    const quota = getQuotaState(userId, usedToday, Boolean(resetQuota));

    if (resetQuota && (!message || !message.trim())) {
      return NextResponse.json({
        reply: "Your daily free message quota has been reset (15/15 available).",
        quota: { used: 0, limit: DAILY_FREE_LIMIT, remaining: DAILY_FREE_LIMIT },
      });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Query cannot be empty." }, { status: 400 });
    }

    if (quota.remaining <= 0) {
      return NextResponse.json({
        limitReached: true,
        reply: `You've used all **${DAILY_FREE_LIMIT}/${DAILY_FREE_LIMIT} free messages** for today. Your free allowance resets at midnight, or you can tap **Reset Free Quota** below to continue studying right away.`,
        quota: { used: DAILY_FREE_LIMIT, limit: DAILY_FREE_LIMIT, remaining: 0 },
      });
    }

    const nextUsed = quota.used + 1;
    rateLimitStore.set(quota.key, nextUsed);
    const updatedQuota = {
      used: nextUsed,
      limit: DAILY_FREE_LIMIT,
      remaining: Math.max(0, DAILY_FREE_LIMIT - nextUsed),
    };

    let autoSavedMemory: any = null;
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
        source: "Course reference",
        createdAt: new Date().toISOString(),
      };
    }

    let reply: string | null = null;
    if (!autoSavedMemory) {
      reply = await queryFreeLimitedModel(
        message,
        documentContext || "",
        userMemory,
        history || []
      );
    }
    if (!reply) {
      reply = buildDocumentReferenceReply(
        message,
        documentContext || "",
        userMemory,
        autoSavedMemory
      );
    }

    return NextResponse.json({
      reply,
      autoSavedMemory,
      quota: updatedQuota,
    });
  } catch (err: any) {
    console.error("Document lookup error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to search document." },
      { status: 500 }
    );
  }
}
