import { NextRequest, NextResponse } from "next/server";

function buildDocumentReferenceReply(
  message: string,
  documentContext: string,
  userMemory: any,
  autoSavedMemory: any
) {
  const q = String(message || "").trim();
  const qLower = q.toLowerCase();
  const doc = String(documentContext || "").trim();

  if (autoSavedMemory) {
    return `Saved to your personal memory ledger under **${autoSavedMemory.category.replace(
      "_",
      " "
    )}**:\n\n"${autoSavedMemory.content}"\n\nYou can review or filter this entry anytime in the **Personal Memory** tab.`;
  }

  const memories =
    userMemory && Array.isArray(userMemory.memories) ? userMemory.memories : [];
  if (
    /\b(my memory|my memories|weak spot|weak spots|what did i miss|saved notes|what do you remember)\b/i.test(
      qLower
    )
  ) {
    if (memories.length === 0) {
      return `No entries are stored in your personal memory ledger yet. You can save any syllabus mechanism using **Save to memory** or add a note directly in the **Personal Memory** tab.`;
    }
    const summaryList = memories
      .slice(0, 5)
      .map((m: any, idx: number) => `${idx + 1}. **[${m.category || "note"}]** ${m.content}`)
      .join("\n");
    return `Here are the most recent entries in your personal memory ledger:\n\n${summaryList}`;
  }

  const sentences = doc
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?])\n+|\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length === 0) {
    return `No source passages matched "${q}". Upload a syllabus PDF or paste lecture notes in the left pane to index the document.`;
  }

  if (/\b(trap|insight|pitfall|mistake|trick|exam)\b/i.test(qLower)) {
    const trapLine =
      sentences.find((s) =>
        /\b(trap|insight|not|solely|only|however|unlike|whereas|exception)\b/i.test(s)
      ) || sentences[0];
    return `**Exam nuance from source material:**\n\n${trapLine}\n\nFocus on distinguishing the primary mechanism from secondary steps when reviewing this section.`;
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

  return `**Referenced passages from active syllabus:**\n\n${selected
    .map((line) => `- ${line}`)
    .join("\n\n")}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, documentContext, userMemory } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Query cannot be empty." }, { status: 400 });
    }

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

    const reply = buildDocumentReferenceReply(
      message,
      documentContext || "",
      userMemory,
      autoSavedMemory
    );

    return NextResponse.json({ reply, autoSavedMemory });
  } catch (err: any) {
    console.error("Document lookup error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to search document." },
      { status: 500 }
    );
  }
}
