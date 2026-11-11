import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function buildCurriculumStudyPackage(rawText: string, title = "Lecture_Material") {
  const cleanTitle = String(title || "Lecture Study Guide")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();

  const normalized = String(rawText || cleanTitle)
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  const rawSentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/^\[Slide\s*\/?\s*Page\s*\d+\]\s*/i, "").trim())
    .filter((s) => s.length >= 28 && s.length <= 360);

  const sentences =
    rawSentences.length >= 3
      ? rawSentences
      : [
          `${cleanTitle} establishes the foundational mechanisms, structural definitions, and primary causal relationships covered in this unit.`,
          `Core processes in ${cleanTitle} operate through sequential state transitions regulated by boundary conditions and rate-limiting steps.`,
          `Distinguishing primary mechanisms from secondary outcomes is critical when evaluating quantitative or conceptual problem sets.`,
          `Applied problems require tracing how perturbations in initial inputs propagate through intermediate stages to alter final yield.`,
          `Comparative analysis across sections highlights where standard assumptions hold and where edge-case exceptions occur.`,
        ];

  const stopWords = new Set([
    "the","and","for","that","this","with","from","into","are","was","were","have","has","had","not","but","what","which","when","where","who","how","why","can","will","may","also","such","than","then","them","they","their","there","these","those","between","through","during","before","after","above","below","under","over","again","further","once","here","very","just","only","both","each","more","most","other","some","many","slide","page","lecture","notes","chapter","section","figure","table","using","used","uses","make","made","does","done","about","would","could","should","because","while","where","within","without"
  ]);

  const candidates =
    normalized.match(/\b[A-Z][a-zA-Z0-9-]{3,}(?:\s+[A-Z][a-zA-Z0-9-]{3,})?\b|\b[a-zA-Z]{6,}\b/g) || [];
  const freqMap = new Map<string, { display: string; score: number }>();
  for (const rawWord of candidates) {
    const cleaned = rawWord.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
    const lower = cleaned.toLowerCase();
    if (cleaned.length < 4 || stopWords.has(lower) || /^\d+$/.test(cleaned)) continue;
    const isCapitalized = /^[A-Z]/.test(cleaned);
    freqMap.set(lower, {
      display: isCapitalized ? cleaned : cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
      score: (freqMap.get(lower)?.score || 0) + (isCapitalized ? 3 : 1),
    });
  }

  const sortedTerms = Array.from(freqMap.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.display);

  const terms = sortedTerms.slice(0, 14);
  const fallbackTerms = [
    "Primary Mechanism",
    "Rate-Limiting Step",
    "Boundary Condition",
    "Equilibrium State",
    "Regulatory Feedback",
    "Substrate Coupling",
    "Structural Domain",
    "Terminal Output",
  ];
  for (const ft of fallbackTerms) {
    if (terms.length >= 10) break;
    if (!terms.some((t) => t.toLowerCase() === ft.toLowerCase())) {
      terms.push(ft);
    }
  }

  const targetTakeaways = Math.min(6, Math.max(4, Math.ceil(sentences.length / 4)));
  const takeaways = [];
  for (let i = 0; i < targetTakeaways; i++) {
    const sIdx = Math.min(
      sentences.length - 1,
      Math.floor((i * sentences.length) / targetTakeaways)
    );
    const sentence = sentences[sIdx];
    const matchedTerm =
      terms.find((t) => sentence.toLowerCase().includes(t.toLowerCase())) ||
      terms[i % terms.length] ||
      `Unit Principle ${i + 1}`;

    takeaways.push({
      num: String(i + 1).padStart(2, "0"),
      concept: matchedTerm,
      desc: sentence,
    });
  }

  const contrastSentence =
    sentences.find((s) =>
      /\b(not|however|unlike|whereas|only|except|instead|rather|solely|never|must)\b/i.test(s)
    ) ||
    sentences[Math.floor(sentences.length / 2)] ||
    sentences[0];
  const trap = `Pay close attention to the distinction between ${
    terms[0] || "the primary mechanism"
  } and ${terms[1] || "secondary stages"}: ${contrastSentence}`;

  const cards = terms.slice(0, 12).map((term, idx) => {
    const matchingSentence =
      sentences.find((s) => s.toLowerCase().includes(term.toLowerCase())) ||
      sentences[idx % sentences.length];
    return {
      term,
      def: matchingSentence,
    };
  });

  const targetQuestions = Math.min(10, Math.max(6, sentences.length));
  const questions = [];
  for (let i = 0; i < targetQuestions; i++) {
    const sIdx = Math.min(
      sentences.length - 1,
      Math.floor((i * sentences.length) / targetQuestions)
    );
    const fact = sentences[sIdx];
    const focusTerm =
      terms.find((t) => fact.toLowerCase().includes(t.toLowerCase())) ||
      terms[i % terms.length];
    const altTermA = terms[(i + 1) % terms.length] || "secondary intermediates";
    const altTermB = terms[(i + 2) % terms.length] || "external buffers";
    const correctSlot = i % 4;

    const distractors = [
      `It bypasses ${focusTerm} entirely and proceeds without ${altTermA} involvement.`,
      `It reverses the direction of ${altTermA} prior to reaching the ${altTermB} threshold.`,
      `It restricts ${focusTerm} exclusively to passive equilibrium without net output.`,
    ];

    const conciseFact = fact.length > 155 ? fact.slice(0, 152) + "..." : fact;
    const options: string[] = [];
    let dIdx = 0;
    for (let slot = 0; slot < 4; slot++) {
      if (slot === correctSlot) {
        options.push(conciseFact);
      } else {
        options.push(distractors[dIdx++]);
      }
    }

    questions.push({
      q: `Regarding ${focusTerm} in ${cleanTitle}, which statement accurately reflects the mechanism documented in the material?`,
      options,
      correct: correctSlot,
      critique: `Reference from source text: "${fact}" — The other choices misstate the sequence or dependency of ${focusTerm}.`,
      accolade: `Correct. "${conciseFact}" accurately states the documented mechanism for ${focusTerm}.`,
    });
  }

  return {
    unit_title: cleanTitle,
    takeaways,
    terms,
    trap,
    cards,
    questions,
  };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let contentToAnalyze = "";
    let activeTitle = "Lecture_Material";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      contentToAnalyze = String(body.text || "").trim();
      activeTitle = body.filename || activeTitle;
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const rawText = formData.get("text") as string | null;

      if (file && file.size > 0) {
        activeTitle = file.name || activeTitle;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const isPdf =
          file.type === "application/pdf" ||
          (file.name || "").toLowerCase().endsWith(".pdf") ||
          buffer.slice(0, 4).toString("ascii") === "%PDF";

        if (isPdf) {
          // @ts-ignore
          const pdfMod: any = await import("pdf-parse-fork");
          const pdf = pdfMod.default || pdfMod;
          const pdfData = await pdf(buffer);
          contentToAnalyze = pdfData.text;
        } else {
          contentToAnalyze = buffer.toString("utf-8");
        }
      }

      if (!contentToAnalyze && rawText && rawText.trim().length > 0) {
        contentToAnalyze = rawText;
      }
    }

    if (!contentToAnalyze || !contentToAnalyze.trim()) {
      return NextResponse.json(
        { success: false, error: "Could not extract readable text from the file." },
        { status: 400 }
      );
    }

    const cleanContext = contentToAnalyze.replace(/\s+/g, " ").slice(0, 30000);
    const parsedData = buildCurriculumStudyPackage(cleanContext, activeTitle);

    return NextResponse.json({
      success: true,
      extractedText: cleanContext.slice(0, 20000),
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Document indexing error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
